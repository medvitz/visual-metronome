/**
 * Wall model: works out what the brick wall looks like at any beat position.
 *
 * It's stateless: the picture is computed from the beat alone, so it can
 * never drift from the audio.
 *
 *  - The brick for bar b (0-based) starts falling when beat 4 of that bar
 *    begins and lands exactly on the next downbeat.
 *  - Bricks are numbered by their bar within the wall, so each new wall starts again at 1.
 *  - When a wall's last brick lands, the wall clears during beats 1-3 of the
 *    next bar, so the next wall's first brick still lands on time.
 */
import { BEATS_PER_BAR } from "../audio/timeline";

export const CLEAR_BEATS = 3;
export const FALL_START = 3; // beat-in-bar when a brick starts falling (beat "4")

/**
 * Beat position on the wall's own clock.
 *
 * Rule for every mode: brick N lands on the 1 of wall bar N, after falling
 * during the beat before it.
 *  - Count-in on: brick 1 falls on the last count-in click and lands as the
 *    count-in ends.
 *  - Count-in off (0 bars): brick 1 lands on the very first click, right
 *    after Play. (main.ts stretches its fall over the short lead-in.)
 */
export function wallBeat(beat: number, countInBars: number): number {
  return beat - (countInBars - 1) * BEATS_PER_BAR;
}

/**
 * True if (integer) beat `beat` is the moment a finished wall starts to clear:
 * the 1 where the wall's last brick lands. The engine rings the chime here.
 */
export function isClearBeat(beat: number, perWall: number, countInBars: number): boolean {
  const wb = wallBeat(beat, countInBars);
  return wb > 0 && wb % (perWall * BEATS_PER_BAR) === 0;
}

/** 0-based bar of the wall run (bar 0 = the bar brick 1 lands on). Negative during count-in. */
export function wallBar(beat: number, countInBars: number): number {
  return Math.floor((beat - countInBars * BEATS_PER_BAR) / BEATS_PER_BAR);
}

export interface BrickState {
  slot: number; // 0-based position in the wall
  number: number; // bar number printed on the brick
  /** 0..1 fall progress; 1 = landed. */
  fall: number;
  /** Beats since landing (for the small landing squash); Infinity if long ago. */
  sinceLand: number;
}

export interface WallState {
  wallIndex: number;
  bricks: BrickState[];
  /** 0..1 clear progress, or null if not clearing. */
  clearing: number | null;
}

export function wallState(beat: number, perWall: number): WallState {
  if (beat < 0) return { wallIndex: 0, bricks: [], clearing: null }; // counting in
  const p = beat;
  const bar = Math.floor(p / BEATS_PER_BAR);
  const inBar = p - bar * BEATS_PER_BAR;

  // Just finished a wall: show it full while it clears.
  if (bar > 0 && bar % perWall === 0 && inBar < CLEAR_BEATS) {
    const wallIndex = bar / perWall - 1;
    const bricks: BrickState[] = [];
    for (let slot = 0; slot < perWall; slot++) {
      bricks.push({
        slot,
        number: slot + 1,
        fall: 1,
        sinceLand: slot === perWall - 1 ? inBar : Infinity,
      });
    }
    return { wallIndex, bricks, clearing: inBar / CLEAR_BEATS };
  }

  const wallIndex = Math.floor(bar / perWall);
  const landed = bar - wallIndex * perWall; // bricks already landed in this wall
  const bricks: BrickState[] = [];
  for (let slot = 0; slot < landed; slot++) {
    bricks.push({
      slot,
      number: slot + 1,
      fall: 1,
      sinceLand: slot === landed - 1 ? inBar : Infinity,
    });
  }
  if (inBar >= FALL_START) {
    bricks.push({
      slot: landed,
      number: landed + 1,
      fall: inBar - FALL_START,
      sinceLand: Infinity,
    });
  }
  return { wallIndex, bricks, clearing: null };
}

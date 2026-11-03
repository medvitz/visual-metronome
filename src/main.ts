import { registerSW } from "virtual:pwa-register";
import { Engine } from "./audio/engine";
import { renderChime } from "./audio/chime";
import { renderHiHat } from "./audio/hihat";
import { beatInfo } from "./audio/timeline";
import { loadSettings } from "./settings";
import { Controls } from "./ui/controls";
import { Leader } from "./visual/leader";
import { WallRenderer } from "./visual/wall";
import { wallBar, wallBeat, wallState } from "./visual/wallModel";

registerSW({ immediate: true });

const settings = loadSettings();
const engine = new Engine({
  bpm: settings.bpm,
  clickBeats: settings.clickBeats,
  volume: settings.volume,
  countInBars: settings.countInBars,
  perWall: settings.perWall,
  chime: settings.chime,
});

const wallCanvas = document.getElementById("wall") as HTMLCanvasElement;
const leaderCanvas = document.getElementById("leader") as HTMLCanvasElement;
const hud = document.getElementById("hud") as HTMLDivElement;
const countInEl = document.getElementById("countIn") as HTMLDivElement;
const dotsEl = countInEl.querySelector(".dots") as HTMLDivElement;
let countInDots: HTMLSpanElement[] = [];
/** One dot per count-in click (4 or 8). */
function buildDots(n: number) {
  countInDots = Array.from({ length: n }, () => document.createElement("span"));
  dotsEl.replaceChildren(...countInDots);
}
buildDots(4);
const wallG = wallCanvas.getContext("2d")!;
const leaderG = leaderCanvas.getContext("2d")!;
const leader = new Leader();
const wall = new WallRenderer();

/** Size canvases to their boxes at full device resolution. */
function fit(c: HTMLCanvasElement, g: CanvasRenderingContext2D) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const ro = new ResizeObserver(() => {
  fit(wallCanvas, wallG);
  fit(leaderCanvas, leaderG);
});
ro.observe(wallCanvas);
ro.observe(leaderCanvas);

// When stopped, freeze on the last frame so you can see how far you got.
// A reset (Settings changed) clears it back to an empty wall.
const RESET = -1e9;
let frozenBeat = RESET;
/** With count-in off, brick 1 falls during this short gap between Play and the first click. */
const NO_COUNT_IN_LEAD = 0.45;
let perWall = settings.perWall; // locked in when Play is pressed
let countInBars: number = settings.countInBars; // likewise

// Test hook: ?beat=67.5 shows a still frame at that beat position.
const demoBeat = new URLSearchParams(location.search).get("beat");

function currentBeat(): number {
  if (demoBeat !== null) return Number(demoBeat);
  if (!engine.isPlaying) return frozenBeat;
  const t = engine.heardTime() - settings.visualOffsetMs / 1000;
  return engine.timeline.beatAt(t);
}

let lastHud = "";
function frame() {
  const beat = currentBeat();
  const info = beatInfo(beat);
  const running = engine.isPlaying || demoBeat !== null;

  const lw = leaderCanvas.clientWidth;
  const lh = leaderCanvas.clientHeight;
  leader.draw(leaderG, lw, lh, info.count, beat < 0 ? 0 : info.phase, running);

  let wb = wallBeat(beat, countInBars);
  if (countInBars === 0 && engine.isPlaying && beat < 0) {
    // No count-in: brick 1 falls over the lead-in and lands on the first click.
    const lb = engine.leadBeats || 1;
    wb = 3 + Math.min(1, Math.max(0, (beat + lb) / lb));
  }
  const ws = wallState(wb, perWall);
  debug.wall = ws;
  wall.draw(wallG, wallCanvas.clientWidth, wallCanvas.clientHeight, ws, perWall);

  const started = running && beat > RESET / 2;
  const countingIn = started && beat >= 0 && beat < countInBars * 4;
  // Bar count restarts with each wall, matching the brick numbers.
  const bar = Math.max(0, wallBar(beat, countInBars));
  const text = !started
    ? "Tap play to start"
    : countingIn || beat < 0
      ? "" // the big overlay says it (and brick 1 is on its way)
      : `Wall ${Math.floor(bar / perWall) + 1} · Bar ${(bar % perWall) + 1}`;
  if (text !== lastHud) hud.textContent = lastHud = text;

  // "Count in..." overlay, with a dot lighting up on each click.
  countInEl.hidden = !countingIn;
  if (countingIn) countInDots.forEach((d, i) => d.classList.toggle("on", i <= Math.floor(beat)));

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Keep the screen awake while playing.
let wakeLock: WakeLockSentinel | null = null;
async function keepAwake(on: boolean) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    /* not supported or refused: not critical */
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && engine.isPlaying) keepAwake(true);
});

const controls = new Controls(settings, {
  async onTogglePlay() {
    if (engine.isPlaying) {
      frozenBeat = currentBeat();
      engine.stop();
      controls.setPlaying(false);
      keepAwake(false);
    } else {
      perWall = settings.perWall;
      countInBars = settings.countInBars;
      engine.setCountInBars(countInBars);
      engine.setWall(perWall, settings.chime);
      buildDots(countInBars * 4);
      await engine.start(countInBars === 0 ? NO_COUNT_IN_LEAD : 0.15);
      controls.setPlaying(true);
      keepAwake(true);
    }
  },
  onBpm: (bpm) => engine.setBpm(bpm),
  onClickBeats: (beats) => engine.setClickBeats(beats),
  onVolume: (v) => engine.setVolume(v),
  // Any change in Settings stops the metronome and clears the wall.
  onSettingsChanged() {
    if (engine.isPlaying) {
      engine.stop();
      controls.setPlaying(false);
      keepAwake(false);
    }
    frozenBeat = RESET;
    perWall = settings.perWall;
    countInBars = settings.countInBars;
  },
});

// Handy for timing checks from the browser console / tests.
const debug: { engine: Engine; settings: typeof settings; wall?: unknown; renderChime: unknown; renderHiHat: unknown } = {
  engine,
  settings,
  renderChime,
  renderHiHat,
};
(window as unknown as { __jdm: unknown }).__jdm = debug;

export interface Settings {
  bpm: number;
  clickBeats: number[]; // 1-based beats that click
  /** Bars (= bricks) per wall: one chorus. */
  perWall: number;
  /** Bars of count-in (clicks on all four beats). The last count-in bar is wall bar 1. */
  countInBars: 0 | 1 | 2;
  volume: number; // 0..1
  /** Shift the visuals vs. the sound, in ms (positive = visuals later). For Bluetooth etc. */
  visualOffsetMs: number;
}

export const DEFAULTS: Settings = {
  bpm: 120,
  clickBeats: [1, 2, 3, 4],
  perWall: 16,
  countInBars: 1,
  volume: 0.8,
  visualOffsetMs: 0,
};

/** Wall sizes offered in Settings (multiples of 4: one row of bricks is 4 bars). */
export const WALL_SIZES = [8, 12, 16, 24, 32];

export const BPM_MIN = 40;
export const BPM_MAX = 320;

const KEY = "jdm.settings.v2";
const OLD_KEY = "jdm.settings.v1";

export function loadSettings(): Settings {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      // v0.3 changed the click default to all four beats: carry over the
      // other saved settings but take the new click default.
      const old = localStorage.getItem(OLD_KEY);
      if (!old) return { ...DEFAULTS };
      const o = JSON.parse(old);
      delete o.clickBeats;
      raw = JSON.stringify(o);
    }
    const s = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
    s.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(s.bpm)));
    if (!WALL_SIZES.includes(s.perWall)) s.perWall = DEFAULTS.perWall;
    // v0.4 stored an on/off switch; carry it over.
    const legacy = (s as unknown as { countIn?: boolean }).countIn;
    if (legacy !== undefined) {
      if (!("countInBars" in JSON.parse(raw))) s.countInBars = legacy ? 1 : 0;
      delete (s as unknown as { countIn?: boolean }).countIn;
    }
    if (![0, 1, 2].includes(s.countInBars)) s.countInBars = 1;
    if (!Array.isArray(s.clickBeats)) s.clickBeats = [...DEFAULTS.clickBeats];
    return s;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

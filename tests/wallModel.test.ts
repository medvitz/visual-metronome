import { describe, expect, it } from "vitest";
import { wallBar, wallBeat, wallState } from "../src/visual/wallModel";

describe("wallState", () => {
  it("is empty during the first three beats", () => {
    expect(wallState(0, 16).bricks).toHaveLength(0);
    expect(wallState(2.99, 16).bricks).toHaveLength(0);
  });

  it("drops brick 1 on beat 4 and lands it on the next downbeat", () => {
    const falling = wallState(3.5, 16);
    expect(falling.bricks).toHaveLength(1);
    expect(falling.bricks[0]).toMatchObject({ number: 1, fall: 0.5 });
    const landed = wallState(4, 16);
    expect(landed.bricks[0]).toMatchObject({ number: 1, fall: 1 });
  });

  it("fills a 16-brick wall, then clears it", () => {
    // Bar 16 begins at beat 64: all 16 landed, clearing.
    const s = wallState(64.5, 16);
    expect(s.bricks).toHaveLength(16);
    expect(s.clearing).toBeGreaterThan(0);
    expect(s.wallIndex).toBe(0);
  });

  it("restarts numbering on the next wall", () => {
    // Beat 67.5: beat 4 of bar 17 -> wall 2, brick 1 falling.
    const s = wallState(67.5, 16);
    expect(s.clearing).toBeNull();
    expect(s.wallIndex).toBe(1);
    expect(s.bricks).toHaveLength(1);
    expect(s.bricks[0]).toMatchObject({ slot: 0, number: 1 });
    // Wall 2: brick 1 landed, brick 2 falling.
    const t = wallState(71.5, 16);
    expect(t.bricks.map((b) => b.number)).toEqual([1, 2]);
  });

  it("supports 32-brick walls", () => {
    expect(wallState(64.5, 32).clearing).toBeNull();
    expect(wallState(64.5, 32).bricks).toHaveLength(16);
    expect(wallState(128.5, 32).bricks).toHaveLength(32);
    expect(wallState(128.5, 32).clearing).not.toBeNull();
    expect(wallState(131.5, 32).bricks[0].number).toBe(1);
  });
});

describe("wall sizes", () => {
  for (const size of [8, 12, 16, 24, 32]) {
    it(`${size}-bar wall fills, clears and restarts at 1`, () => {
      const end = size * 4; // the 1 after the last brick lands
      expect(wallState(end - 0.5, size).bricks).toHaveLength(size); // last brick falling
      const full = wallState(end + 0.5, size);
      expect(full.bricks).toHaveLength(size);
      expect(full.clearing).not.toBeNull();
      expect(wallState(end + 3.5, size).bricks[0]).toMatchObject({ number: 1, slot: 0 });
      expect(wallState(end + 3.5, size).wallIndex).toBe(1);
    });
  }
});

describe("count-in", () => {
  it("1 bar: the count-in clicks count toward brick 1", () => {
    // Brick 1 falls on the count-in's beat 4 and lands on the first 1 after it.
    expect(wallState(wallBeat(2, 1), 16).bricks).toHaveLength(0);
    expect(wallState(wallBeat(3.5, 1), 16).bricks[0]).toMatchObject({ number: 1, fall: 0.5 });
    expect(wallState(wallBeat(4, 1), 16).bricks[0]).toMatchObject({ number: 1, fall: 1 });
  });

  it("2 bars: first bar is pure count-in, second counts toward brick 1", () => {
    expect(wallBeat(3.5, 2)).toBeLessThan(0);
    expect(wallState(wallBeat(3.5, 2), 16).bricks).toHaveLength(0);
    expect(wallState(wallBeat(7.5, 2), 16).bricks[0]).toMatchObject({ number: 1, fall: 0.5 });
    expect(wallState(wallBeat(8, 2), 16).bricks[0].fall).toBe(1);
  });

  it("off: brick 1 lands on the very first click, brick 2 on the next 1", () => {
    // Just before the first click (beat -0.5) brick 1 is mid-fall...
    expect(wallState(wallBeat(-0.5, 0), 16).bricks[0]).toMatchObject({ number: 1, fall: 0.5 });
    // ...lands on the first click (beat 0)...
    expect(wallState(wallBeat(0, 0), 16).bricks[0]).toMatchObject({ number: 1, fall: 1 });
    // ...and brick 2 lands on the next 1.
    expect(wallState(wallBeat(4, 0), 16).bricks.map((x) => x.number)).toEqual([1, 2]);
    expect(wallBar(0, 0)).toBe(0);
    expect(wallBar(4, 0)).toBe(1);
  });

  it("the bar counter matches the top brick in every mode", () => {
    for (const n of [0, 1, 2]) {
      for (let bar = 0; bar < 15; bar++) {
        const beat = n * 4 + bar * 4 + 0.5; // just after the 1 of each wall bar
        const bricks = wallState(wallBeat(beat, n), 16).bricks;
        expect(wallBar(beat, n)).toBe(bar);
        expect(bricks[bricks.length - 1].number).toBe(bar + 1);
      }
    }
  });
});

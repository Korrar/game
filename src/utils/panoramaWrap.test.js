import { describe, it, expect } from 'vitest';
import { wrapPctToScreen, wrapPxToScreen, PANORAMA_WORLD_W } from './panoramaWrap.js';

const GAME_W = 1280;

describe('wrapPctToScreen', () => {
  it('returns raw position when panOffset is 0', () => {
    expect(wrapPctToScreen(50, 0, GAME_W)).toBe(50);
    expect(wrapPctToScreen(0, 0, GAME_W)).toBe(0);
    expect(wrapPctToScreen(100, 0, GAME_W)).toBe(100);
  });

  it('object stays in place — camera pans right by 10%', () => {
    // panOffset = 10% of 1280 = 128px, object at 50%
    // Screen position = 50% - 10% = 40%
    const result = wrapPctToScreen(50, 128, GAME_W);
    expect(result).toBeCloseTo(40, 0);
  });

  it('object stays in place — camera pans right by 50%', () => {
    // panOffset = 50% of 1280 = 640px, object at 80%
    // Screen position = 80% - 50% = 30%
    const result = wrapPctToScreen(80, 640, GAME_W);
    expect(result).toBeCloseTo(30, 0);
  });

  it('object just past left edge is at margin', () => {
    // panOffset = 20% of 1280 = 256px, object at 10%
    // Screen = 10% - 20% = -10% (just at left margin edge)
    const result = wrapPctToScreen(10, 256, GAME_W);
    expect(result).toBeCloseTo(-10, 0);
  });

  it('object reappears on right after full 360° minus viewport', () => {
    // Object at 10%, camera at 220% → 10% - 220% = -210%, wraps to 90%
    // (Object has traveled 200% past left edge, reappears on right)
    const panPx = (220 / 100) * GAME_W;
    const result = wrapPctToScreen(10, panPx, GAME_W);
    expect(result).toBeCloseTo(90, 0);
  });

  it('full 360° wrap: panning by 300% returns to start', () => {
    // panOffset = 300% of 1280 = 3840px → normPan wraps to 0
    const result = wrapPctToScreen(50, 3840, GAME_W);
    expect(result).toBe(50); // same as no pan (pass-through: panOffset=3840, !3840 is false)
  });

  it('returns null for objects far outside viewport', () => {
    // Object at 50%, camera at 200% → screen = 50 - 200 = -150, wraps to 150% → >110% = null
    const panPx = (200 / 100) * GAME_W;
    const result = wrapPctToScreen(50, panPx, GAME_W);
    expect(result).toBeNull();
  });

  it('object exactly at camera left edge is visible', () => {
    const result = wrapPctToScreen(30, 0.3 * GAME_W, GAME_W);
    expect(result).toBeCloseTo(0, 0);
    expect(result).not.toBeNull();
  });

  it('negative panOffset wraps correctly', () => {
    // panOffset = -128px → panPct = -10% → normPan wraps to 290%
    // object at 50%: sx = 50 - (-10) = 60% ... let's compute:
    // sx = ((50 - (-10) + 10) % 300 + 300) % 300 - 10 = (70 % 300 + 300) % 300 - 10 = 60
    const result = wrapPctToScreen(50, -128, GAME_W);
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(60, 0);
  });
});

describe('wrapPxToScreen', () => {
  it('returns raw position when panOffset is 0', () => {
    expect(wrapPxToScreen(640, 0, GAME_W)).toBe(640);
    expect(wrapPxToScreen(0, 0, GAME_W)).toBe(0);
  });

  it('object stays in place — camera pans right by 200px', () => {
    const result = wrapPxToScreen(640, 200, GAME_W);
    expect(result).toBeCloseTo(440, 0);
  });

  it('object wraps around when it goes past left edge', () => {
    // Object at 100px, pan 300px → screen = -200px, wraps to 3640px → >1360 = null
    // Object comes back after more panning
    const result = wrapPxToScreen(100, 300, GAME_W);
    expect(result).toBeNull(); // too far left, not yet wrapped to right
  });

  it('full 360° wrap returns same position', () => {
    const result = wrapPxToScreen(640, 3840, GAME_W);
    expect(result).toBe(640);
  });

  it('negative panOffset wraps correctly', () => {
    const result = wrapPxToScreen(640, -200, GAME_W);
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(840, 0);
  });
});

describe('wrapping invariants', () => {
  it('pct wrapping is smooth — no jumps > 0.2% per 1px pan change', () => {
    // Sweep panOffset smoothly from 0 to 3840 in 1px steps
    for (let objPct = 0; objPct <= 100; objPct += 25) {
      let prev = null;
      for (let pan = 1; pan < 3840; pan += 1) { // start at 1 to avoid pass-through discontinuity
        const sx = wrapPctToScreen(objPct, pan, GAME_W);
        if (sx !== null && prev !== null) {
          const jump = Math.abs(sx - prev);
          // 1px pan = 100/1280 ≈ 0.078% change. Allow up to 0.2% for rounding.
          expect(jump).toBeLessThan(0.2);
        }
        prev = sx;
      }
    }
  });

  it('px wrapping is smooth — no jumps > 2px per 1px pan change', () => {
    for (let objPx = 0; objPx <= GAME_W; objPx += 320) {
      let prev = null;
      for (let pan = 1; pan < 3840; pan += 1) {
        const sx = wrapPxToScreen(objPx, pan, GAME_W);
        if (sx !== null && prev !== null) {
          const jump = Math.abs(sx - prev);
          expect(jump).toBeLessThan(2);
        }
        prev = sx;
      }
    }
  });

  it('transition from pass-through to wrapping is smooth', () => {
    // pan=0 uses pass-through, pan=1 uses wrapping — check continuity
    for (let objPct = 0; objPct <= 100; objPct += 10) {
      const at0 = wrapPctToScreen(objPct, 0, GAME_W);
      const at1 = wrapPctToScreen(objPct, 1, GAME_W);
      if (at0 !== null && at1 !== null) {
        const jump = Math.abs(at0 - at1);
        expect(jump).toBeLessThan(0.2);
      }
    }
  });

  it('objects visible in viewport range, null outside', () => {
    // Object at 50%, slow pan from 0 to 3840
    // Should be visible when in range, null when too far
    let visibleCount = 0;
    let nullCount = 0;
    for (let pan = 0; pan < 3840; pan += 1) {
      const sx = wrapPctToScreen(50, pan, GAME_W);
      if (sx !== null) visibleCount++;
      else nullCount++;
    }
    // Object is visible for about 120% of 300% = ~40% of the time + margin
    expect(visibleCount).toBeGreaterThan(1000);
    expect(nullCount).toBeGreaterThan(1000);
  });
});

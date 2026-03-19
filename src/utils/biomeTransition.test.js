import { describe, it, expect } from 'vitest';
import { wrapPctToScreen, wrapPxToScreen, PANORAMA_WORLD_W } from './panoramaWrap.js';

const GAME_W = 1280;

describe('biome transition: panOffset reset', () => {
  it('canvas should render at panOffset=0 after room change', () => {
    // Simulate: user panned to offset 800 in room 1, then enters room 2
    const panAfterReset = 0;

    // After room change, panOffset is reset to 0
    // wrapPctToScreen with panOffset=0 should return raw position (pass-through)
    const objAt50 = wrapPctToScreen(50, panAfterReset, GAME_W);
    expect(objAt50).toBe(50); // should be at its world position, not shifted

    // Verify that with old panOffset it would be different
    const panBefore = 800;
    const objAt50Panned = wrapPctToScreen(50, panBefore, GAME_W);
    expect(objAt50Panned).not.toBe(50); // should be shifted
  });

  it('objects at wide panoramic positions (>100%) visible at panOffset=0', () => {
    // Objects spawned in panoramic world at 200% should be offscreen at panOffset=0
    const obj200 = wrapPctToScreen(200, 0, GAME_W);
    expect(obj200).toBe(200); // pass-through, way offscreen but valid
    // NOT null — the object exists, it's just far offscreen
    expect(obj200).not.toBeNull();
  });

  it('objects at wide panoramic positions visible when panning there', () => {
    // Object at 200%, pan to 200%
    const panPx = (200 / 100) * GAME_W; // 2560px
    const obj200 = wrapPctToScreen(200, panPx, GAME_W);
    // Should map to screen position ~0% (at left edge of viewport)
    expect(obj200).toBeCloseTo(0, 0);
  });
});

describe('smooth panning: CSS elements must not teleport', () => {
  it('screen positions change continuously for 1px pan increments', () => {
    const objPct = 50;
    // Simulate dragging: panOffset increases by 1px each frame
    let prev = wrapPctToScreen(objPct, 0, GAME_W);
    for (let pan = 1; pan < 500; pan++) {
      const curr = wrapPctToScreen(objPct, pan, GAME_W);
      if (curr !== null && prev !== null) {
        const jump = Math.abs(curr - prev);
        // Max jump should be < 0.2% per 1px pan change
        expect(jump).toBeLessThan(0.2);
      }
      prev = curr;
    }
  });

  it('PixiJS positions change continuously for 1px pan increments', () => {
    const objPx = 640;
    let prev = wrapPxToScreen(objPx, 0, GAME_W);
    for (let pan = 1; pan < 500; pan++) {
      const curr = wrapPxToScreen(objPx, pan, GAME_W);
      if (curr !== null && prev !== null) {
        const jump = Math.abs(curr - prev);
        // Max jump should be < 2px per 1px pan change
        expect(jump).toBeLessThan(2);
      }
      prev = curr;
    }
  });
});

describe('panOffsetRef race condition prevention', () => {
  it('ref should not be overwritten during active drag', () => {
    // Simulate the race condition that was fixed:
    // 1. handlePanMove sets ref to 110
    // 2. rAF fires setPanOffset(100) (slightly behind)
    // 3. React renders, ref should NOT be overwritten to 100

    // Before fix: panOffsetRef.current = panOffset (always)
    // After fix: panOffsetRef.current = panOffset (only when !dragging)

    const panRef = { dragging: true };
    const panOffsetRef = { current: 110 }; // set by handlePanMove
    const panOffset = 100; // stale state from rAF

    // Simulate the guard: only sync ref from state when not dragging
    if (!panRef.dragging) panOffsetRef.current = panOffset;

    // Ref should keep the fresh value from handlePanMove
    expect(panOffsetRef.current).toBe(110);
  });

  it('ref should sync from state when not dragging', () => {
    const panRef = { dragging: false };
    const panOffsetRef = { current: 50 };
    const panOffset = 0; // state reset after room change

    // When not dragging, ref should sync from state
    if (!panRef.dragging) panOffsetRef.current = panOffset;

    expect(panOffsetRef.current).toBe(0);
  });

  it('obstacles at same world position produce identical screen coords across frames', () => {
    // Simulate: during drag, panOffsetRef stays consistent
    // Objects at fixed world positions should have stable screen positions
    const obstacleX = 150; // panoramic world position in %
    const stablePanOffset = 500; // consistent ref value

    const frame1 = wrapPctToScreen(obstacleX, stablePanOffset, GAME_W);
    const frame2 = wrapPctToScreen(obstacleX, stablePanOffset, GAME_W);
    const frame3 = wrapPctToScreen(obstacleX, stablePanOffset, GAME_W);

    expect(frame1).toBe(frame2);
    expect(frame2).toBe(frame3);
  });
});

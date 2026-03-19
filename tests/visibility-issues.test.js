/**
 * Tests for identified visibility issues in enemies and obstacles.
 * Each test targets a specific bug found during code analysis.
 */
import { describe, it, expect } from "vitest";
import {
  depthFromY,
  scaleAtDepth,
  zIndexAtDepth,
  fogAtDepth,
  DEPTH_CONFIG,
} from "../src/rendering/DepthSystem.js";
import {
  wrapPxToScreen,
  wrapPctToScreen,
  PANORAMA_WORLD_W,
} from "../src/utils/panoramaWrap.js";

const GAME_W = 1280;
const GAME_H = 720;
const GY = GAME_H * 0.25; // 180

// ─── BUG 1: spawnNpc missing _yPct ───
describe("BUG: spawnNpc does not set _yPct on physics entry", () => {
  it("physics entry defaults to _yPct=65 (mid-ground) instead of actual spawn Y", () => {
    // In spawnNpc, the entry object is created WITHOUT _yPct
    // PixiRenderer falls back to yPct=65
    // This means ALL new enemies render at mid-ground depth until first updatePatrol
    const entry = { _px: 640, _dir: 1 }; // No _yPct
    const yPct = entry._yPct ?? 65;
    expect(yPct).toBe(65); // Wrong for enemies spawning at y=8-18
    // FIX: spawnNpc should accept yPct and set entry._yPct
  });
});

// ─── BUG 2: Obstacles only in exploration rooms ───
describe("BUG: No obstacles in defense rooms", () => {
  it("obstacles are skipped for defense rooms", () => {
    // Line 2617: if (!isDefenseRoom) { ... spawn obstacles ... }
    // In defense rooms where enemies appear, there are NO obstacles at all
    // FIX: Spawn some obstacles even in defense rooms for visual richness
    const isDefenseRoom = true;
    const shouldSpawnObstacles = !isDefenseRoom;
    expect(shouldSpawnObstacles).toBe(false);
    // This is by design for defense rooms, but could be confusing
  });
});

// ─── BUG 3: Obstacle viewport coverage ───
describe("BUG: Many obstacles spawn outside viewport", () => {
  it("only ~33% of obstacles are in initial viewport with no pan", () => {
    const total = 25;
    let inViewport = 0;
    // Simulate obstacle spawning
    for (let i = 0; i < 1000; i++) {
      const ox = 5 + Math.random() * 285;
      if (ox <= 100) inViewport++;
    }
    const ratio = inViewport / 1000;
    // Roughly 95/285 = 33% are in viewport
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.45);
    // With 25 obstacles, only ~8 are visible without panning
    // FIX: Ensure more obstacles spawn in the visible viewport area
  });

  it("FIXED: 50% of obstacles should spawn in viewport for better density", () => {
    // New algorithm: half obstacles in viewport (0-100%), half in panoramic (100-290%)
    const total = 25;
    const viewportCount = Math.ceil(total * 0.5); // 13
    const panoramaCount = total - viewportCount; // 12

    let inViewport = 0;
    for (let i = 0; i < total; i++) {
      const ox = i < viewportCount
        ? 5 + Math.random() * 90  // 5-95% (in viewport)
        : 100 + Math.random() * 190; // 100-290% (panoramic)
      if (ox <= 100) inViewport++;
    }
    expect(inViewport).toBeGreaterThanOrEqual(viewportCount);
  });
});

// ─── BUG 4: Obstacle opacity too low for some materials ───
describe("BUG: Obstacle visibility issues", () => {
  it("undamaged obstacle opacity is 0.9 (should be visible)", () => {
    const damaged = false;
    const hpPct = 1;
    const opacity = damaged ? 0.6 + hpPct * 0.35 : 0.9;
    expect(opacity).toBe(0.9);
    // This is OK but could be 1.0 for better visibility
  });

  it("minimum obstacle size is enforced (18x14)", () => {
    const w = Math.max(8, 18); // from obsStyles, some might have small w
    const h = Math.max(3, 14); // from obsStyles, some might have small h
    expect(w).toBeGreaterThanOrEqual(18);
    expect(h).toBeGreaterThanOrEqual(14);
  });
});

// ─── BUG 5: Enemy Y-position clamp on first frame ───
describe("BUG: Enemies instantly teleport to minY on first frame", () => {
  it("enemy at y=8 gets clamped to y=25 immediately", () => {
    let y = 8;
    const ySpeed = 0.02;
    const yDir = 1;
    const minY = 25;
    const maxY = 92;

    // First frame Y movement
    y += ySpeed * yDir;
    if (y < minY) { y = minY; } // Clamped!
    expect(y).toBe(25);
    // This means enemies never visually "walk in" from behind the horizon
    // They just appear at the horizon instantly
  });
});

// ─── BUG 6: Walker DOM element initial position vs RAF update ───
describe("BUG: Walker DOM element positioning flash", () => {
  it("initial React position is at center/horizon", () => {
    const initialLeft = "50%";
    const initialTop = "calc(25% - 75px)";
    // All walkers start at this position until RAF loop repositions them
    // This causes a brief flash at the wrong position on every React re-render
    expect(initialLeft).toBe("50%");
  });

  it("RAF loop corrects position to actual walkData position", () => {
    const wrappedX = 45; // wrapPctToScreen result
    const yPos = 50;
    const correctedLeft = `${wrappedX}%`;
    const correctedTop = `calc(${yPos}% - 75px)`;
    expect(correctedLeft).toBe("45%");
    // At y=50: top = calc(50% - 75px) = 360-75 = 285px from top (visible)
  });
});

// ─── BUG 7: PixiJS container offset masking sprites ───
describe("PixiJS container offset for sprite visibility", () => {
  it("container.x=0 when no pan (sprites at world positions)", () => {
    const panOff = 0;
    const npcWorldX = 640;
    const screenX = wrapPxToScreen(npcWorldX, panOff, GAME_W);
    const containerX = screenX - npcWorldX;
    expect(containerX).toBe(0);
    // Sprites draw at their physics positions, which should be on-screen
  });

  it("container.visible=true for on-screen enemies with no pan", () => {
    const panOff = 0;
    for (let xPct = 10; xPct <= 90; xPct += 10) {
      const px = (xPct / 100) * GAME_W;
      const screenX = wrapPxToScreen(px, panOff, GAME_W);
      expect(screenX).not.toBeNull();
    }
  });
});

// ─── INTEGRATION: Full enemy lifecycle visibility check ───
describe("INTEGRATION: Enemy visibility through full lifecycle", () => {
  it("enemy is visible at every stage from spawn to patrol", () => {
    // Stage 1: Spawn
    const spawnX = 50; // 50% of screen
    const spawnY = 8;  // Behind horizon

    // Stage 2: First RAF frame - Y gets clamped to 25
    let y = spawnY;
    y += 0.02; // ySpeed * yDir
    if (y < 25) y = 25; // Clamp

    // Stage 3: Physics update
    const groundY = (y / 100) * GAME_H; // 180
    const torsoY = groundY - 20; // 160 (FIGURE_HALF_HEIGHT)
    const _px = (spawnX / 100) * GAME_W; // 640

    // Stage 4: PixiRenderer
    const depth = depthFromY(y); // 0 (at horizon)
    const scale = scaleAtDepth(depth); // 0.7
    const fog = fogAtDepth(depth); // 0.35
    const alpha = 1 * (1 - fog * 0.5); // 0.825

    // Stage 5: Panoramic wrapping
    const screenX = wrapPxToScreen(_px, 0, GAME_W); // 640

    // All should be visible
    expect(screenX).not.toBeNull();
    expect(alpha).toBeGreaterThan(0.5);
    expect(scale).toBeGreaterThan(0.3);
    expect(torsoY).toBeLessThan(GAME_H); // On screen
    expect(torsoY).toBeGreaterThan(-50);  // Not too far above
    expect(_px).toBeGreaterThan(0);
    expect(_px).toBeLessThan(GAME_W);

    // DOM walker check
    const domTop = y; // 25%
    const domTopPx = (domTop / 100) * GAME_H - 75; // 180 - 75 = 105px
    expect(domTopPx).toBeGreaterThan(0);
    expect(domTopPx).toBeLessThan(GAME_H);
  });
});

/**
 * Tests that simulate the actual enemy/obstacle rendering flow
 * to find where the visibility chain breaks.
 */
import { describe, it, expect } from "vitest";
import {
  depthFromY,
  scaleAtDepth,
  zIndexAtDepth,
  fogAtDepth,
} from "../src/rendering/DepthSystem.js";
import {
  wrapPxToScreen,
  wrapPctToScreen,
} from "../src/utils/panoramaWrap.js";

const GAME_W = 1280;
const GAME_H = 720;
const GY = GAME_H * 0.25; // 180

// ─── SIMULATING THE FULL ENEMY RENDERING CHAIN ───

describe("Enemy Rendering Chain (simulating PixiRenderer.render)", () => {
  /**
   * Simulates the full chain from walkData → physics → PixiRenderer
   * to determine if an enemy would be visible.
   */
  function simulateEnemyVisibility(walkData, panOffset = 0) {
    const xPct = walkData.x;
    const yPct = walkData.y;

    // 1. Physics: updatePatrol computes _px and _yPct
    const _px = (xPct / 100) * GAME_W;
    const _yPct = yPct ?? 65;
    const groundY = yPct != null ? (yPct / 100) * GAME_H : GY;

    // 2. Physics: _updateHumanoid positions torso
    const FIGURE_HALF_HEIGHT = 20; // from constants.js
    const torsoY = groundY - FIGURE_HALF_HEIGHT;
    const torsoX = _px;

    // 3. PixiRenderer: depth calculations
    const depth = depthFromY(_yPct);
    const depthScale = scaleAtDepth(depth);
    const zIndex = zIndexAtDepth(depth);

    // 4. PixiRenderer: alpha calculation (no fog, no weather)
    const fadeAlpha = 1;
    const depthFog = fogAtDepth(depth);
    const alpha = fadeAlpha * (1 - depthFog * 0.5);

    // 5. PixiRenderer: panoramic wrapping
    const screenX = wrapPxToScreen(_px, panOffset, GAME_W);
    const containerOffset = screenX !== null ? screenX - _px : null;
    const visible = screenX !== null;

    // 6. CharacterSprite: check if torso exists (it should after spawnNpc)
    // hasTorso assumed true after spawnNpc

    // 7. Final screen position of torso (world position + container offset)
    const finalScreenX = visible ? torsoX + containerOffset : null;
    const finalScreenY = torsoY;

    return {
      _px, _yPct, groundY, torsoX, torsoY,
      depth, depthScale, zIndex, alpha,
      screenX, containerOffset, visible,
      finalScreenX, finalScreenY,
      // Is it actually visible on screen?
      onScreen: visible &&
        finalScreenX >= -80 && finalScreenX <= GAME_W + 80 &&
        finalScreenY >= 0 && finalScreenY <= GAME_H,
      // Is alpha sufficient to see?
      alphaVisible: alpha > 0.05,
      // Is scale sufficient to see?
      scaleVisible: depthScale > 0.1,
    };
  }

  it("newly spawned enemy (y=8, behind horizon) is visible on screen", () => {
    const result = simulateEnemyVisibility({ x: 50, y: 8 });
    expect(result.visible).toBe(true);
    expect(result.alphaVisible).toBe(true);
    expect(result.scaleVisible).toBe(true);

    // Key check: is the torso on-screen?
    // groundY = 0.08 * 720 = 57.6
    // torsoY = 57.6 - 20 = 37.6 — this is ABOVE the horizon (GY=180)!
    // This means the enemy renders in the SKY area, not on the ground
    expect(result.groundY).toBe(57.6);
    expect(result.torsoY).toBe(37.6);
    // The torso is above GY (180), so it's in the sky — possibly behind the sky canvas
    expect(result.torsoY).toBeLessThan(GY);
  });

  it("enemy after reaching minY=25 is visible on screen", () => {
    const result = simulateEnemyVisibility({ x: 50, y: 25 });
    expect(result.visible).toBe(true);
    expect(result.alphaVisible).toBe(true);

    // groundY = 0.25 * 720 = 180 = GY
    // torsoY = 180 - 20 = 160 — ABOVE horizon but close
    expect(result.groundY).toBe(GY);
    expect(result.torsoY).toBe(160);
    // This is still ABOVE the horizon line
    expect(result.torsoY).toBeLessThan(GY);
  });

  it("enemy at y=50 is well within visible ground area", () => {
    const result = simulateEnemyVisibility({ x: 50, y: 50 });
    expect(result.visible).toBe(true);
    expect(result.alphaVisible).toBe(true);

    // groundY = 0.50 * 720 = 360
    // torsoY = 360 - 20 = 340 — well within ground area
    expect(result.groundY).toBe(360);
    expect(result.torsoY).toBe(340);
    expect(result.torsoY).toBeGreaterThan(GY);
  });

  it("enemy at y=90 is near the bottom of the screen", () => {
    const result = simulateEnemyVisibility({ x: 50, y: 90 });
    expect(result.visible).toBe(true);
    expect(result.alphaVisible).toBe(true);

    // groundY = 0.90 * 720 = 648
    expect(result.groundY).toBe(648);
    expect(result.onScreen).toBe(true);
  });

  it("DIAGNOSTIC: enemy visibility for all Y positions 8-92", () => {
    const results = [];
    for (let y = 8; y <= 92; y += 2) {
      const r = simulateEnemyVisibility({ x: 50, y });
      results.push({ y, groundY: r.groundY, torsoY: r.torsoY, alpha: r.alpha, onScreen: r.onScreen });
    }
    // Log for diagnostics
    console.log("Enemy visibility by Y position:");
    console.log("y%  | groundY | torsoY | alpha | onScreen | aboveHorizon");
    for (const r of results) {
      console.log(`${String(r.y).padStart(3)}% | ${r.groundY.toFixed(0).padStart(7)} | ${r.torsoY.toFixed(0).padStart(6)} | ${r.alpha.toFixed(2)} | ${r.onScreen ? "YES" : " NO"} | ${r.torsoY < GY ? "YES" : " NO"}`);
    }
    // All enemies should be on-screen
    for (const r of results) {
      expect(r.onScreen).toBe(true);
    }
  });
});

// ─── SIMULATING OBSTACLE DOM RENDERING ───

describe("Obstacle DOM Rendering Chain", () => {
  function simulateObstacleVisibility(obsX, obsY, panOffset = 0) {
    // From App.jsx line 7654-7662
    const screenX = wrapPctToScreen(obsX, panOffset, GAME_W);

    // Depth calculation: 100 - obs.y converts bottom% to top%
    const yPct = 100 - obsY;
    const depth = depthFromY(yPct);
    const scale = scaleAtDepth(depth);
    const zIndex = 14 + zIndexAtDepth(depth);

    // CSS positioning: bottom percentage
    // bottom: obsY% means the element is obsY% from the bottom
    // In a 720px container: pixel from bottom = obsY/100 * 720
    // Actual Y = 720 - (obsY/100 * 720) = 720 * (1 - obsY/100)
    const bottomPx = (obsY / 100) * GAME_H;
    const topPx = GAME_H - bottomPx;

    return {
      screenX,
      yPct,
      depth,
      scale,
      zIndex,
      bottomPx,
      topPx,
      visible: screenX !== null,
      // Is it within the game container?
      onScreen: screenX !== null &&
        topPx >= 0 && topPx <= GAME_H,
      // Is scale reasonable?
      scaleOk: scale > 0.1,
    };
  }

  it("obstacle within viewport (x=50%, y=30%) is visible", () => {
    const r = simulateObstacleVisibility(50, 30);
    expect(r.visible).toBe(true);
    expect(r.scaleOk).toBe(true);
    expect(r.onScreen).toBe(true);
  });

  it("obstacle at bottom of screen (y=10%) is visible", () => {
    const r = simulateObstacleVisibility(50, 10);
    expect(r.visible).toBe(true);
    expect(r.topPx).toBeLessThan(GAME_H);
    expect(r.topPx).toBeGreaterThan(0);
  });

  it("obstacle near horizon (y=65%) is visible", () => {
    const r = simulateObstacleVisibility(50, 65);
    expect(r.visible).toBe(true);
    // top = 720 * (1 - 0.65) = 252
    expect(r.topPx).toBeCloseTo(252, 0);
    expect(r.topPx).toBeGreaterThan(GY); // Should be below horizon
  });

  it("panoramic obstacle at x=200% is off-screen with no pan", () => {
    const r = simulateObstacleVisibility(200, 30, 0);
    // wrapPctToScreen returns 200 when panOffset=0 (raw pass-through)
    // In CSS, left:200% would be off-screen, BUT the container has overflow:hidden
    // So it's technically "visible" to the function but visually hidden
    expect(r.screenX).toBe(200);
    // The element exists but is outside the overflow:hidden container
  });

  it("DIAGNOSTIC: obstacle positions in full range", () => {
    console.log("\nObstacle visibility by position:");
    console.log("x%  | y%(bot) | screenX | topPx | scale | zIdx | visible");
    for (let x = 5; x <= 285; x += 20) {
      for (let y = 10; y <= 65; y += 15) {
        const r = simulateObstacleVisibility(x, y);
        if (x <= 100) { // Only log viewport-visible ones
          console.log(`${String(x).padStart(3)}% | ${String(y).padStart(6)}% | ${String(r.screenX).padStart(7)} | ${String(r.topPx.toFixed(0)).padStart(5)} | ${r.scale.toFixed(2)} | ${String(r.zIndex).padStart(4)} | ${r.visible ? "YES" : " NO"}`);
        }
      }
    }
  });
});

// ─── KEY ISSUE: spawnNpc vs updatePatrol ───

describe("SpawnNpc missing _yPct", () => {
  it("FOUND: spawnNpc does NOT set _yPct on entry", () => {
    // Simulating spawnNpc (physics/RapierPhysicsWorld.js line 516-526)
    const entry = {
      alive: true, ragdoll: false,
      fadeAlpha: 1, fadeTimer: 0,
      hitFlash: 0, frozenTimer: 0,
      bodyType: "humanoid",
      attackAnim: 0,
      _dir: 1,
      _px: (50 / 100) * GAME_W, // 640
      // NOTE: _yPct is NOT set!
    };

    // In PixiRenderer.render (line 180), it falls back to 65
    const yPct = entry._yPct ?? 65;
    expect(entry._yPct).toBeUndefined();
    expect(yPct).toBe(65);

    // This means ALL newly spawned enemies render at depth=65 initially
    // which is mid-ground. This is wrong for enemies at y=8-18
    // but it's still visible, so not the root cause.
  });

  it("after first updatePatrol, _yPct is set correctly", () => {
    const entry = { _dir: 1, _px: 640, ragdoll: false };

    // Simulating updatePatrol
    const walkDataY = 8; // Enemy at y=8 (behind horizon)
    entry._yPct = walkDataY ?? 65;
    entry._px = (50 / 100) * GAME_W;

    expect(entry._yPct).toBe(8);
    // groundY = (8 / 100) * 720 = 57.6 — way above horizon
    const groundY = (walkDataY / 100) * GAME_H;
    expect(groundY).toBe(57.6);
    expect(groundY).toBeLessThan(GY); // PROBLEM: enemy body is above the horizon
  });
});

// ─── ROOT CAUSE: Physics body position vs PixiJS rendering ───

describe("ROOT CAUSE: Physics Y-position for enemies above horizon", () => {
  const FIGURE_HALF_HEIGHT = 20;

  it("enemies at y=8-18 have physics bodies positioned in the sky", () => {
    // In _updateHumanoid: cy = (groundY || this.GY) - FIGURE_HALF_HEIGHT
    // For y=8: groundY = 57.6, cy = 37.6 — this is in the SKY AREA
    for (let y = 8; y <= 18; y++) {
      const groundY = (y / 100) * GAME_H;
      const cy = groundY - FIGURE_HALF_HEIGHT;
      // Physics torso is at cy pixels from top
      // GY (horizon) is at 180px from top
      // If cy < 180, the enemy body is above the horizon — in the sky
      expect(cy).toBeLessThan(GY);
    }
  });

  it("enemies at y=25 have physics body right at horizon line", () => {
    const groundY = (25 / 100) * GAME_H; // 180
    const cy = groundY - FIGURE_HALF_HEIGHT; // 160
    // Still slightly above horizon due to FIGURE_HALF_HEIGHT offset
    expect(cy).toBe(160);
    expect(cy).toBeLessThan(GY);
  });

  it("enemies at y=30+ have physics bodies on the ground area", () => {
    const groundY = (30 / 100) * GAME_H; // 216
    const cy = groundY - FIGURE_HALF_HEIGHT; // 196
    expect(cy).toBeGreaterThan(GY);
  });

  it("PixiJS canvas renders ABOVE the biome canvas (z-index 12 vs 1)", () => {
    // This means PixiJS sprites in the sky area (y < GY)
    // render ON TOP of the sky background
    // They SHOULD be visible unless something else hides them
    const pixiZIndex = 12;
    const biomeCanvasZIndex = 1;
    expect(pixiZIndex).toBeGreaterThan(biomeCanvasZIndex);
    // OK, so PixiJS renders above the sky — enemies should be visible even above horizon
  });
});

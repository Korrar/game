// TDD Tests for isometricUtils — Isometric coordinate system
// Tests written FIRST, implementation follows

import { describe, it, expect } from "vitest";
import {
  ISO_CONFIG,
  worldToScreen,
  screenToWorld,
  isoDepth,
  worldToTile,
  tileToWorld,
  isInMapBounds,
  distanceWorld,
  generateHeightMap,
  getHeightAt,
  getHeightSmooth,
} from "../isometricUtils.js";

// ─── CONFIGURATION ───

describe("ISO_CONFIG", () => {
  it("defines tile dimensions with 2:1 ratio", () => {
    expect(ISO_CONFIG.TILE_W).toBeDefined();
    expect(ISO_CONFIG.TILE_H).toBeDefined();
    expect(ISO_CONFIG.TILE_W).toBe(ISO_CONFIG.TILE_H * 2);
  });

  it("defines map size in tiles", () => {
    expect(ISO_CONFIG.MAP_COLS).toBeGreaterThanOrEqual(20);
    expect(ISO_CONFIG.MAP_ROWS).toBeGreaterThanOrEqual(20);
  });

  it("defines game dimensions", () => {
    expect(ISO_CONFIG.GAME_W).toBe(1280);
    expect(ISO_CONFIG.GAME_H).toBe(720);
  });
});

// ─── WORLD TO SCREEN ───

describe("worldToScreen", () => {
  it("converts world origin (0,0) to screen center when camera is at (0,0)", () => {
    const { x, y } = worldToScreen(0, 0, 0, 0);
    expect(x).toBe(ISO_CONFIG.GAME_W / 2);
    expect(y).toBe(ISO_CONFIG.GAME_H / 2);
  });

  it("moving right in world (wx+1) moves right and down on screen", () => {
    const origin = worldToScreen(0, 0, 0, 0);
    const moved = worldToScreen(1, 0, 0, 0);
    expect(moved.x).toBeGreaterThan(origin.x);
    expect(moved.y).toBeGreaterThan(origin.y);
  });

  it("moving down in world (wy+1) moves left and down on screen", () => {
    const origin = worldToScreen(0, 0, 0, 0);
    const moved = worldToScreen(0, 1, 0, 0);
    expect(moved.x).toBeLessThan(origin.x);
    expect(moved.y).toBeGreaterThan(origin.y);
  });

  it("camera offset shifts screen position", () => {
    const noCam = worldToScreen(5, 5, 0, 0);
    const withCam = worldToScreen(5, 5, 100, 50);
    expect(withCam.x).toBe(noCam.x - 100);
    expect(withCam.y).toBe(noCam.y - 50);
  });

  it("diagonal movement (wx+1, wy+1) moves straight down on screen", () => {
    const origin = worldToScreen(0, 0, 0, 0);
    const diag = worldToScreen(1, 1, 0, 0);
    // iso: sx = (wx-wy)*TW/2, so equal wx,wy → same x
    expect(diag.x).toBeCloseTo(origin.x, 1);
    expect(diag.y).toBeGreaterThan(origin.y);
  });

  it("opposite diagonal (wx+1, wy-1) moves straight right on screen", () => {
    const origin = worldToScreen(0, 0, 0, 0);
    const diag = worldToScreen(1, -1, 0, 0);
    expect(diag.x).toBeGreaterThan(origin.x);
    expect(diag.y).toBeCloseTo(origin.y, 1);
  });
});

// ─── SCREEN TO WORLD ───

describe("screenToWorld", () => {
  it("is the inverse of worldToScreen (round-trip)", () => {
    const wx = 10.5, wy = 7.3;
    const camX = 50, camY = 30;
    const screen = worldToScreen(wx, wy, camX, camY);
    const world = screenToWorld(screen.x, screen.y, camX, camY);
    expect(world.x).toBeCloseTo(wx, 4);
    expect(world.y).toBeCloseTo(wy, 4);
  });

  it("screen center maps to world origin when camera is at (0,0)", () => {
    const { x, y } = screenToWorld(ISO_CONFIG.GAME_W / 2, ISO_CONFIG.GAME_H / 2, 0, 0);
    expect(x).toBeCloseTo(0, 4);
    expect(y).toBeCloseTo(0, 4);
  });

  it("round-trips for multiple positions", () => {
    const testCases = [
      { wx: 0, wy: 0 },
      { wx: 20, wy: 20 },
      { wx: 5, wy: 15 },
      { wx: -3, wy: 8 },
      { wx: 30, wy: 0 },
    ];
    for (const { wx, wy } of testCases) {
      const screen = worldToScreen(wx, wy, 0, 0);
      const world = screenToWorld(screen.x, screen.y, 0, 0);
      expect(world.x).toBeCloseTo(wx, 4);
      expect(world.y).toBeCloseTo(wy, 4);
    }
  });

  it("round-trips with camera offset", () => {
    const screen = worldToScreen(15, 10, 200, 100);
    const world = screenToWorld(screen.x, screen.y, 200, 100);
    expect(world.x).toBeCloseTo(15, 4);
    expect(world.y).toBeCloseTo(10, 4);
  });
});

// ─── ISO DEPTH ───

describe("isoDepth", () => {
  it("returns higher depth for objects further down-right (higher wx+wy)", () => {
    expect(isoDepth(10, 10)).toBeGreaterThan(isoDepth(5, 5));
  });

  it("objects on same diagonal have same depth (no height)", () => {
    // wx+wy = 20 for both
    expect(isoDepth(15, 5)).toBe(isoDepth(10, 10));
    expect(isoDepth(15, 5)).toBe(isoDepth(5, 15));
  });

  it("height increases depth slightly", () => {
    expect(isoDepth(10, 10, 2)).toBeGreaterThan(isoDepth(10, 10, 0));
    expect(isoDepth(10, 10, 0)).toBe(isoDepth(10, 10));
  });

  it("is a number", () => {
    expect(typeof isoDepth(5, 5)).toBe("number");
  });
});

// ─── WORLD TO TILE ───

describe("worldToTile", () => {
  it("converts world coordinates to tile indices", () => {
    const { col, row } = worldToTile(0, 0);
    expect(col).toBe(0);
    expect(row).toBe(0);
  });

  it("fractional world coords map to correct tile", () => {
    const { col, row } = worldToTile(1.5, 2.7);
    expect(col).toBe(1);
    expect(row).toBe(2);
  });

  it("negative coords give negative tiles", () => {
    const { col, row } = worldToTile(-1, -1);
    expect(col).toBe(-1);
    expect(row).toBe(-1);
  });
});

// ─── TILE TO WORLD ───

describe("tileToWorld", () => {
  it("returns center of tile in world coordinates", () => {
    const { x, y } = tileToWorld(0, 0);
    expect(x).toBe(0.5);
    expect(y).toBe(0.5);
  });

  it("adjacent tiles are 1 unit apart", () => {
    const t0 = tileToWorld(0, 0);
    const t1 = tileToWorld(1, 0);
    expect(t1.x - t0.x).toBe(1);
    expect(t1.y - t0.y).toBe(0);
  });
});

// ─── IS IN MAP BOUNDS ───

describe("isInMapBounds", () => {
  it("returns true for coordinates inside the map", () => {
    expect(isInMapBounds(5, 5)).toBe(true);
    expect(isInMapBounds(0, 0)).toBe(true);
    expect(isInMapBounds(ISO_CONFIG.MAP_COLS - 1, ISO_CONFIG.MAP_ROWS - 1)).toBe(true);
  });

  it("returns false for coordinates outside the map", () => {
    expect(isInMapBounds(-1, 0)).toBe(false);
    expect(isInMapBounds(0, -1)).toBe(false);
    expect(isInMapBounds(ISO_CONFIG.MAP_COLS, 0)).toBe(false);
    expect(isInMapBounds(0, ISO_CONFIG.MAP_ROWS)).toBe(false);
  });
});

// ─── DISTANCE WORLD ───

describe("distanceWorld", () => {
  it("returns 0 for same point", () => {
    expect(distanceWorld(5, 5, 5, 5)).toBe(0);
  });

  it("returns correct euclidean distance", () => {
    expect(distanceWorld(0, 0, 3, 4)).toBeCloseTo(5, 4);
  });

  it("is symmetric", () => {
    expect(distanceWorld(1, 2, 5, 8)).toBeCloseTo(distanceWorld(5, 8, 1, 2), 4);
  });
});

// ─── INTEGRATION ───

describe("integration: isometric pipeline", () => {
  it("clicking on screen, converting to world, then back gives same screen pos", () => {
    const clickX = 400, clickY = 300;
    const camX = 150, camY = 80;
    const world = screenToWorld(clickX, clickY, camX, camY);
    const screen = worldToScreen(world.x, world.y, camX, camY);
    expect(screen.x).toBeCloseTo(clickX, 2);
    expect(screen.y).toBeCloseTo(clickY, 2);
  });

  it("NPC at tile (5,5) can be rendered to screen and clicked back", () => {
    const tile = tileToWorld(5, 5);
    const camX = 0, camY = 0;
    const screen = worldToScreen(tile.x, tile.y, camX, camY);
    const world = screenToWorld(screen.x, screen.y, camX, camY);
    expect(world.x).toBeCloseTo(tile.x, 4);
    expect(world.y).toBeCloseTo(tile.y, 4);
  });

  it("depth sorting: NPC at (10,10) renders behind NPC at (15,15)", () => {
    expect(isoDepth(15, 15)).toBeGreaterThan(isoDepth(10, 10));
  });

  it("visible tiles on screen have valid map bounds", () => {
    const centerTile = tileToWorld(
      Math.floor(ISO_CONFIG.MAP_COLS / 2),
      Math.floor(ISO_CONFIG.MAP_ROWS / 2)
    );
    expect(isInMapBounds(
      Math.floor(ISO_CONFIG.MAP_COLS / 2),
      Math.floor(ISO_CONFIG.MAP_ROWS / 2)
    )).toBe(true);
  });
});

// ─── TERRAIN HEIGHT SYSTEM ───

describe("worldToScreen with height", () => {
  it("height lifts object upward on screen (lower Y)", () => {
    const flat = worldToScreen(10, 10, 0, 0);
    const elevated = worldToScreen(10, 10, 0, 0, 2);
    expect(elevated.x).toBe(flat.x); // X unchanged
    expect(elevated.y).toBeLessThan(flat.y); // lifted up
  });

  it("height 0 returns same as no height", () => {
    const noH = worldToScreen(5, 5, 0, 0);
    const zeroH = worldToScreen(5, 5, 0, 0, 0);
    expect(zeroH.x).toBe(noH.x);
    expect(zeroH.y).toBe(noH.y);
  });
});

describe("generateHeightMap", () => {
  it("generates a height map with correct dimensions", () => {
    const hm = generateHeightMap(1, { terrain: "forest" });
    expect(hm.cols).toBe(ISO_CONFIG.MAP_COLS);
    expect(hm.rows).toBe(ISO_CONFIG.MAP_ROWS);
    expect(hm.data.length).toBe(hm.cols * hm.rows);
  });

  it("is deterministic for same room number", () => {
    const hm1 = generateHeightMap(42, { terrain: "forest" });
    const hm2 = generateHeightMap(42, { terrain: "forest" });
    for (let i = 0; i < hm1.data.length; i++) {
      expect(hm1.data[i]).toBe(hm2.data[i]);
    }
  });

  it("different rooms produce different height maps", () => {
    const hm1 = generateHeightMap(1, { terrain: "forest" });
    const hm2 = generateHeightMap(2, { terrain: "forest" });
    let different = false;
    for (let i = 0; i < hm1.data.length; i++) {
      if (hm1.data[i] !== hm2.data[i]) { different = true; break; }
    }
    expect(different).toBe(true);
  });

  it("heights are non-negative", () => {
    const hm = generateHeightMap(5, { terrain: "mountain" });
    for (let i = 0; i < hm.data.length; i++) {
      expect(hm.data[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it("edges have low/zero height", () => {
    const hm = generateHeightMap(1, { terrain: "forest" });
    // Corner tiles should be 0 (edge falloff)
    expect(getHeightAt(hm, 0, 0)).toBe(0);
    expect(getHeightAt(hm, hm.cols - 1, hm.rows - 1)).toBe(0);
  });

  it("flatCenter profile flattens map center", () => {
    const hm = generateHeightMap(1, { terrain: "forest" });
    const cx = Math.floor(hm.cols / 2);
    const cy = Math.floor(hm.rows / 2);
    const centerH = getHeightAt(hm, cx, cy);
    // Center should be low due to flatCenter
    expect(centerH).toBeLessThan(1.0);
  });
});

describe("getHeightAt", () => {
  it("returns 0 for null height map", () => {
    expect(getHeightAt(null, 5, 5)).toBe(0);
  });

  it("returns 0 for out-of-bounds coordinates", () => {
    const hm = generateHeightMap(1, { terrain: "forest" });
    expect(getHeightAt(hm, -1, 5)).toBe(0);
    expect(getHeightAt(hm, 5, -1)).toBe(0);
    expect(getHeightAt(hm, 100, 5)).toBe(0);
  });
});

describe("getHeightSmooth", () => {
  it("returns 0 for null height map", () => {
    expect(getHeightSmooth(null, 5, 5)).toBe(0);
  });

  it("interpolates between tile centers", () => {
    const hm = generateHeightMap(1, { terrain: "mountain" });
    const h1 = getHeightAt(hm, 10, 10);
    const h2 = getHeightAt(hm, 11, 10);
    const hMid = getHeightSmooth(hm, 10.5, 10);
    // Should be between the two tile heights (or close)
    const minH = Math.min(h1, h2);
    const maxH = Math.max(h1, h2);
    expect(hMid).toBeGreaterThanOrEqual(minH - 0.01);
    expect(hMid).toBeLessThanOrEqual(maxH + 0.01);
  });
});

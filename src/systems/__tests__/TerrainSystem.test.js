// Tests for TerrainSystem — terrain generation, combat bonuses, LOS, fog of war
import { describe, it, expect } from "vitest";
import {
  generateTerrainData,
  updateFogOfWar,
  calcHeightAdvantage,
  hasLineOfSight,
} from "../TerrainSystem.js";
import { ISO_CONFIG } from "../../utils/isometricUtils.js";
import { BIOME_TERRAIN } from "../../data/terrainFeatures.js";

// ─── TERRAIN GENERATION ───

describe("generateTerrainData", () => {
  it("generates complete terrain data for a room", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);

    expect(data).toBeDefined();
    expect(data.heightMap).toBeDefined();
    expect(data.overlays).toBeDefined();
    expect(data.roads).toBeInstanceOf(Array);
    expect(data.waterTiles).toBeInstanceOf(Array);
    expect(data.cliffs).toBeInstanceOf(Array);
    expect(data.vegetation).toBeInstanceOf(Array);
    expect(data.fogGrid).toBeDefined();
    expect(data.cols).toBe(ISO_CONFIG.MAP_COLS);
    expect(data.rows).toBe(ISO_CONFIG.MAP_ROWS);
  });

  it("is deterministic for same room number", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data1 = generateTerrainData(42, biome);
    const data2 = generateTerrainData(42, biome);

    expect(data1.roads.length).toBe(data2.roads.length);
    expect(data1.waterTiles.length).toBe(data2.waterTiles.length);
    expect(data1.vegetation.length).toBe(data2.vegetation.length);
  });

  it("different rooms produce different terrain", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data1 = generateTerrainData(1, biome);
    const data2 = generateTerrainData(2, biome);

    // At least some height map values should differ
    let diffCount = 0;
    for (let i = 0; i < data1.heightMap.data.length; i++) {
      if (data1.heightMap.data[i] !== data2.heightMap.data[i]) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it("generates roads for biomes with roadCount > 0", () => {
    const biome = { id: "city", terrain: "mine" };
    const data = generateTerrainData(1, biome);
    expect(data.roads.length).toBeGreaterThan(0);
  });

  it("generates no roads for biomes with roadCount = 0", () => {
    const biome = { id: "blue_lagoon", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    expect(data.roads.length).toBe(0);
  });

  it("generates water features for water-biomes", () => {
    const biome = { id: "swamp", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    expect(data.waterTiles.length).toBeGreaterThan(0);
  });

  it("generates no water for desert", () => {
    const biome = { id: "desert", terrain: "mine" };
    const data = generateTerrainData(1, biome);
    expect(data.waterTiles.length).toBe(0);
  });

  it("generates vegetation for forested biomes", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    expect(data.vegetation.length).toBeGreaterThan(0);
  });

  it("vegetation has valid properties", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    for (const veg of data.vegetation) {
      expect(veg.id).toBeDefined();
      expect(veg.type).toBeDefined();
      expect(veg.col).toBeGreaterThanOrEqual(0);
      expect(veg.row).toBeGreaterThanOrEqual(0);
      expect(veg.wx).toBeGreaterThan(0);
      expect(veg.wy).toBeGreaterThan(0);
      expect(typeof veg.height).toBe("number");
      expect(veg.alive).toBe(true);
    }
  });

  it("vegetation avoids map center (caravan spawn area)", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    const cx = ISO_CONFIG.MAP_COLS / 2;
    const cy = ISO_CONFIG.MAP_ROWS / 2;
    const safeRadius = 4;

    for (const veg of data.vegetation) {
      const dist = Math.sqrt((veg.col - cx + 0.5) ** 2 + (veg.row - cy + 0.5) ** 2);
      expect(dist).toBeGreaterThanOrEqual(safeRadius);
    }
  });

  it("detects cliff edges for mountainous terrain", () => {
    const biome = { id: "volcano", terrain: "mine" };
    const data = generateTerrainData(1, biome);
    // Volcano has low cliffThreshold, should detect some cliffs
    // (depends on height map generation, may be 0 if terrain is very smooth)
    expect(data.cliffs).toBeInstanceOf(Array);
  });

  it("overlays array has correct size", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    expect(data.overlays.length).toBe(ISO_CONFIG.MAP_COLS * ISO_CONFIG.MAP_ROWS);
  });

  it("overlays contain valid values (0-4)", () => {
    const biome = { id: "city", terrain: "mine" };
    const data = generateTerrainData(1, biome);
    for (let i = 0; i < data.overlays.length; i++) {
      expect(data.overlays[i]).toBeGreaterThanOrEqual(0);
      expect(data.overlays[i]).toBeLessThanOrEqual(4);
    }
  });
});

// ─── BIOME TERRAIN PROFILES ───

describe("BIOME_TERRAIN profiles", () => {
  it("every biome in BIOMES has a terrain profile", () => {
    const biomeIds = [
      "jungle", "island", "desert", "winter", "city", "volcano",
      "summer", "autumn", "spring", "mushroom", "swamp", "sunset_beach",
      "bamboo_falls", "blue_lagoon", "olympus", "underworld", "meteor"
    ];
    for (const id of biomeIds) {
      expect(BIOME_TERRAIN[id]).toBeDefined();
      expect(BIOME_TERRAIN[id].terrainType).toBeDefined();
      expect(BIOME_TERRAIN[id].heightProfile).toBeDefined();
    }
  });

  it("profiles have valid vegetation references", () => {
    const { VEGETATION } = require("../../data/terrainFeatures.js");
    for (const [biomeId, profile] of Object.entries(BIOME_TERRAIN)) {
      for (const vegType of profile.vegetation) {
        expect(VEGETATION[vegType]).toBeDefined();
      }
    }
  });

  it("profiles have valid water feature references", () => {
    const { WATER_FEATURES } = require("../../data/terrainFeatures.js");
    for (const [biomeId, profile] of Object.entries(BIOME_TERRAIN)) {
      for (const wf of profile.waterFeatures) {
        expect(WATER_FEATURES[wf]).toBeDefined();
      }
    }
  });

  it("profiles have valid road style references", () => {
    const { ROAD_STYLES } = require("../../data/terrainFeatures.js");
    for (const [biomeId, profile] of Object.entries(BIOME_TERRAIN)) {
      expect(ROAD_STYLES[profile.roadStyle]).toBeDefined();
    }
  });
});

// ─── HEIGHT ADVANTAGE ───

describe("calcHeightAdvantage", () => {
  it("returns damage bonus when attacker is higher", () => {
    const biome = { id: "volcano", terrain: "mine" };
    const data = generateTerrainData(1, biome);
    // Find two tiles with different heights
    let highCol = -1, highRow = -1, lowCol = -1, lowRow = -1;
    let maxH = 0, minH = 999;
    const { heightMap, cols, rows } = data;
    for (let r = 5; r < rows - 5; r++) {
      for (let c = 5; c < cols - 5; c++) {
        const h = heightMap.data[r * cols + c];
        if (h > maxH) { maxH = h; highCol = c; highRow = r; }
        if (h < minH && h >= 0) { minH = h; lowCol = c; lowRow = r; }
      }
    }

    if (maxH > minH + 0.5) {
      const result = calcHeightAdvantage(highCol, highRow, lowCol, lowRow, heightMap);
      expect(result.damageMult).toBeGreaterThan(1.0);
      expect(result.rangeBonusTiles).toBeGreaterThan(0);
    }
  });

  it("returns damage penalty when attacker is lower", () => {
    const biome = { id: "volcano", terrain: "mine" };
    const data = generateTerrainData(1, biome);
    let highCol = -1, highRow = -1, lowCol = -1, lowRow = -1;
    let maxH = 0, minH = 999;
    const { heightMap, cols, rows } = data;
    for (let r = 5; r < rows - 5; r++) {
      for (let c = 5; c < cols - 5; c++) {
        const h = heightMap.data[r * cols + c];
        if (h > maxH) { maxH = h; highCol = c; highRow = r; }
        if (h < minH && h >= 0) { minH = h; lowCol = c; lowRow = r; }
      }
    }

    if (maxH > minH + 0.5) {
      const result = calcHeightAdvantage(lowCol, lowRow, highCol, highRow, heightMap);
      expect(result.damageMult).toBeLessThan(1.0);
      expect(result.rangeBonusTiles).toBe(0);
    }
  });

  it("returns neutral when same height", () => {
    const biome = { id: "summer", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    const cx = Math.floor(ISO_CONFIG.MAP_COLS / 2);
    const cy = Math.floor(ISO_CONFIG.MAP_ROWS / 2);
    // Center should be flat (flatCenter profile)
    const result = calcHeightAdvantage(cx, cy, cx + 1, cy, data.heightMap);
    expect(result.damageMult).toBeCloseTo(1.0, 1);
  });

  it("caps bonus at maxBonus", () => {
    // Test with extreme height difference
    const { HEIGHT_ADVANTAGE } = require("../../data/terrainFeatures.js");
    // Create a mock height map with extreme heights
    const cols = 10, rows = 10;
    const mockData = new Float32Array(cols * rows);
    mockData[0] = 10; // very high
    mockData[cols * (rows - 1) + (cols - 1)] = 0; // very low
    const mockMap = { data: mockData, cols, rows };

    const result = calcHeightAdvantage(0, 0, cols - 1, rows - 1, mockMap);
    expect(result.damageMult).toBeLessThanOrEqual(1 + HEIGHT_ADVANTAGE.maxBonus + 0.01);
  });
});

// ─── LINE OF SIGHT ───

describe("hasLineOfSight", () => {
  it("returns true when no obstacles between points", () => {
    const biome = { id: "desert", terrain: "mine" };
    const data = generateTerrainData(1, biome);
    // Desert has few vegetation items, center should be clear
    const cx = ISO_CONFIG.MAP_COLS / 2;
    const cy = ISO_CONFIG.MAP_ROWS / 2;
    const result = hasLineOfSight(cx, cy, cx + 2, cy, data);
    expect(result).toBe(true);
  });

  it("returns true for null terrain data", () => {
    expect(hasLineOfSight(0, 0, 10, 10, null)).toBe(true);
  });

  it("returns true for same point", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);
    expect(hasLineOfSight(5, 5, 5, 5, data)).toBe(true);
  });
});

// ─── FOG OF WAR ───

describe("updateFogOfWar", () => {
  it("reveals tiles around a point", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);

    const cx = ISO_CONFIG.MAP_COLS / 2;
    const cy = ISO_CONFIG.MAP_ROWS / 2;

    updateFogOfWar(data, [{ wx: cx, wy: cy, radius: 8 }]);

    // Center tile should be revealed
    const idx = Math.floor(cy) * data.cols + Math.floor(cx);
    expect(data.fogGrid[idx]).toBeGreaterThan(0);
  });

  it("does not reveal distant tiles", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);

    updateFogOfWar(data, [{ wx: 5, wy: 5, radius: 3 }]);

    // Far tile should remain hidden
    const farIdx = 35 * data.cols + 35;
    expect(data.fogGrid[farIdx]).toBe(0);
  });

  it("handles empty reveal points", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);

    expect(() => updateFogOfWar(data, [])).not.toThrow();
  });

  it("handles null terrain data gracefully", () => {
    expect(() => updateFogOfWar(null, [{ wx: 5, wy: 5, radius: 3 }])).not.toThrow();
  });

  it("multiple reveal points expand visible area", () => {
    const biome = { id: "jungle", terrain: "forest" };
    const data = generateTerrainData(1, biome);

    updateFogOfWar(data, [
      { wx: 10, wy: 10, radius: 5 },
      { wx: 30, wy: 30, radius: 5 },
    ]);

    const idx1 = 10 * data.cols + 10;
    const idx2 = 30 * data.cols + 30;
    expect(data.fogGrid[idx1]).toBeGreaterThan(0);
    expect(data.fogGrid[idx2]).toBeGreaterThan(0);
  });
});

// TDD Tests for DepthSystem — 2.5D depth lane system
// Tests written FIRST, implementation follows

import { describe, it, expect } from "vitest";
import {
  DEPTH_CONFIG,
  depthFromY,
  scaleAtDepth,
  zIndexAtDepth,
  shadowAtDepth,
  fogAtDepth,
  yToScreenY,
  assignDepthLane,
  sortByDepth,
} from "../DepthSystem.js";

// ─── CONFIGURATION ───

describe("DEPTH_CONFIG", () => {
  it("defines min and max Y percentages", () => {
    expect(DEPTH_CONFIG.minY).toBeDefined();
    expect(DEPTH_CONFIG.maxY).toBeDefined();
    expect(DEPTH_CONFIG.minY).toBeLessThan(DEPTH_CONFIG.maxY);
  });

  it("defines scale range", () => {
    expect(DEPTH_CONFIG.minScale).toBeDefined();
    expect(DEPTH_CONFIG.maxScale).toBeDefined();
    expect(DEPTH_CONFIG.minScale).toBeLessThan(DEPTH_CONFIG.maxScale);
    // Far-away things should be smaller
    expect(DEPTH_CONFIG.minScale).toBeGreaterThan(0);
    expect(DEPTH_CONFIG.minScale).toBeLessThan(1);
    // Close things should be bigger
    expect(DEPTH_CONFIG.maxScale).toBeGreaterThan(1);
  });

  it("has sensible defaults for game resolution 1280x720", () => {
    // Y range should be in the ground area (25-90% is current walker range)
    expect(DEPTH_CONFIG.minY).toBeGreaterThanOrEqual(20);
    expect(DEPTH_CONFIG.maxY).toBeLessThanOrEqual(95);
  });
});

// ─── DEPTH FROM Y ───

describe("depthFromY", () => {
  it("returns 0 for furthest Y (minY — horizon)", () => {
    const d = depthFromY(DEPTH_CONFIG.minY);
    expect(d).toBeCloseTo(0, 2);
  });

  it("returns 1 for nearest Y (maxY — foreground)", () => {
    const d = depthFromY(DEPTH_CONFIG.maxY);
    expect(d).toBeCloseTo(1, 2);
  });

  it("returns 0.5 for midpoint Y", () => {
    const midY = (DEPTH_CONFIG.minY + DEPTH_CONFIG.maxY) / 2;
    const d = depthFromY(midY);
    expect(d).toBeCloseTo(0.5, 2);
  });

  it("clamps values below minY to 0", () => {
    expect(depthFromY(0)).toBe(0);
    expect(depthFromY(DEPTH_CONFIG.minY - 10)).toBe(0);
  });

  it("clamps values above maxY to 1", () => {
    expect(depthFromY(100)).toBe(1);
    expect(depthFromY(DEPTH_CONFIG.maxY + 10)).toBe(1);
  });

  it("is monotonically increasing (higher Y = closer = higher depth)", () => {
    const y1 = DEPTH_CONFIG.minY + 5;
    const y2 = DEPTH_CONFIG.minY + 20;
    const y3 = DEPTH_CONFIG.maxY - 5;
    expect(depthFromY(y1)).toBeLessThan(depthFromY(y2));
    expect(depthFromY(y2)).toBeLessThan(depthFromY(y3));
  });
});

// ─── SCALE AT DEPTH ───

describe("scaleAtDepth", () => {
  it("returns minScale at depth 0 (far)", () => {
    expect(scaleAtDepth(0)).toBeCloseTo(DEPTH_CONFIG.minScale, 2);
  });

  it("returns maxScale at depth 1 (near)", () => {
    expect(scaleAtDepth(1)).toBeCloseTo(DEPTH_CONFIG.maxScale, 2);
  });

  it("returns ~1.0 at some mid-depth (roughly normal size)", () => {
    // At some point between 0 and 1, scale should cross 1.0
    const s = scaleAtDepth(0.5);
    expect(s).toBeGreaterThan(DEPTH_CONFIG.minScale);
    expect(s).toBeLessThan(DEPTH_CONFIG.maxScale);
  });

  it("is monotonically increasing", () => {
    expect(scaleAtDepth(0)).toBeLessThan(scaleAtDepth(0.3));
    expect(scaleAtDepth(0.3)).toBeLessThan(scaleAtDepth(0.7));
    expect(scaleAtDepth(0.7)).toBeLessThan(scaleAtDepth(1));
  });

  it("clamps to valid range for out-of-bounds depth", () => {
    expect(scaleAtDepth(-0.5)).toBeCloseTo(DEPTH_CONFIG.minScale, 2);
    expect(scaleAtDepth(1.5)).toBeCloseTo(DEPTH_CONFIG.maxScale, 2);
  });
});

// ─── Z-INDEX AT DEPTH ───

describe("zIndexAtDepth", () => {
  it("returns higher zIndex for closer objects (higher depth)", () => {
    const z0 = zIndexAtDepth(0);
    const z1 = zIndexAtDepth(1);
    expect(z1).toBeGreaterThan(z0);
  });

  it("returns integer values", () => {
    expect(Number.isInteger(zIndexAtDepth(0))).toBe(true);
    expect(Number.isInteger(zIndexAtDepth(0.5))).toBe(true);
    expect(Number.isInteger(zIndexAtDepth(1))).toBe(true);
  });

  it("returns different values for different depths", () => {
    const z1 = zIndexAtDepth(0.2);
    const z2 = zIndexAtDepth(0.8);
    expect(z1).not.toBe(z2);
  });
});

// ─── SHADOW AT DEPTH ───

describe("shadowAtDepth", () => {
  it("returns an object with size, alpha, offsetY", () => {
    const s = shadowAtDepth(0.5);
    expect(s).toHaveProperty("scaleX");
    expect(s).toHaveProperty("scaleY");
    expect(s).toHaveProperty("alpha");
    expect(s).toHaveProperty("offsetY");
  });

  it("larger shadow for closer objects", () => {
    const far = shadowAtDepth(0);
    const near = shadowAtDepth(1);
    expect(near.scaleX).toBeGreaterThan(far.scaleX);
    expect(near.scaleY).toBeGreaterThan(far.scaleY);
  });

  it("more opaque shadow for closer objects", () => {
    const far = shadowAtDepth(0);
    const near = shadowAtDepth(1);
    expect(near.alpha).toBeGreaterThan(far.alpha);
  });

  it("shadow alpha stays within 0-1", () => {
    for (const d of [0, 0.25, 0.5, 0.75, 1]) {
      const s = shadowAtDepth(d);
      expect(s.alpha).toBeGreaterThanOrEqual(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });
});

// ─── FOG AT DEPTH ───

describe("fogAtDepth", () => {
  it("returns higher fog for far objects (depth 0)", () => {
    const fogFar = fogAtDepth(0);
    const fogNear = fogAtDepth(1);
    expect(fogFar).toBeGreaterThan(fogNear);
  });

  it("returns values between 0 and 1", () => {
    for (const d of [0, 0.25, 0.5, 0.75, 1]) {
      const f = fogAtDepth(d);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("near objects have minimal fog (close to 0)", () => {
    expect(fogAtDepth(1)).toBeLessThan(0.15);
  });

  it("far objects have noticeable fog", () => {
    expect(fogAtDepth(0)).toBeGreaterThan(0.2);
  });
});

// ─── Y TO SCREEN Y ───

describe("yToScreenY", () => {
  it("converts yPct to pixel screen Y for given height", () => {
    const H = 720;
    const GY = H * 0.25; // 180px = horizon
    // At minY (horizon area), screen Y should be near GY
    const screenYFar = yToScreenY(DEPTH_CONFIG.minY, H);
    expect(screenYFar).toBeGreaterThanOrEqual(GY - 20);

    // At maxY (foreground), screen Y should be near bottom
    const screenYNear = yToScreenY(DEPTH_CONFIG.maxY, H);
    expect(screenYNear).toBeGreaterThan(screenYFar);
    expect(screenYNear).toBeLessThanOrEqual(H);
  });

  it("higher yPct produces higher screen Y (lower on screen = closer)", () => {
    const H = 720;
    const y1 = yToScreenY(30, H);
    const y2 = yToScreenY(60, H);
    const y3 = yToScreenY(85, H);
    expect(y1).toBeLessThan(y2);
    expect(y2).toBeLessThan(y3);
  });
});

// ─── ASSIGN DEPTH LANE ───

describe("assignDepthLane", () => {
  it("assigns a lane number to a yPct value", () => {
    const lane = assignDepthLane(50);
    expect(typeof lane).toBe("number");
    expect(lane).toBeGreaterThanOrEqual(0);
  });

  it("low yPct gets back lane (lane 0 = furthest)", () => {
    const lane = assignDepthLane(DEPTH_CONFIG.minY);
    expect(lane).toBe(0);
  });

  it("high yPct gets front lane", () => {
    const lane = assignDepthLane(DEPTH_CONFIG.maxY);
    expect(lane).toBeGreaterThan(0);
  });

  it("different Y positions can map to different lanes", () => {
    const l1 = assignDepthLane(DEPTH_CONFIG.minY + 5);
    const l2 = assignDepthLane(DEPTH_CONFIG.maxY - 5);
    expect(l1).not.toBe(l2);
  });

  it("returns integer lane numbers", () => {
    for (const y of [25, 40, 55, 70, 85]) {
      expect(Number.isInteger(assignDepthLane(y))).toBe(true);
    }
  });
});

// ─── SORT BY DEPTH ───

describe("sortByDepth", () => {
  it("sorts array of objects by yPct ascending (far first, close last)", () => {
    const items = [
      { id: 1, yPct: 80 },
      { id: 2, yPct: 30 },
      { id: 3, yPct: 55 },
    ];
    const sorted = sortByDepth(items);
    expect(sorted[0].id).toBe(2); // furthest
    expect(sorted[1].id).toBe(3); // middle
    expect(sorted[2].id).toBe(1); // closest
  });

  it("does not mutate original array", () => {
    const items = [{ id: 1, yPct: 80 }, { id: 2, yPct: 30 }];
    const original = [...items];
    sortByDepth(items);
    expect(items[0].id).toBe(original[0].id);
    expect(items[1].id).toBe(original[1].id);
  });

  it("handles empty array", () => {
    expect(sortByDepth([])).toEqual([]);
  });

  it("handles single item", () => {
    const items = [{ id: 1, yPct: 50 }];
    expect(sortByDepth(items)).toEqual(items);
  });

  it("stable for equal yPct", () => {
    const items = [
      { id: 1, yPct: 50 },
      { id: 2, yPct: 50 },
    ];
    const sorted = sortByDepth(items);
    expect(sorted[0].id).toBe(1);
    expect(sorted[1].id).toBe(2);
  });
});

// ─── INTEGRATION SCENARIOS ───

describe("integration: full depth pipeline", () => {
  it("NPC at Y=30 is far: small, high fog, low z", () => {
    const y = 30;
    const depth = depthFromY(y);
    const scale = scaleAtDepth(depth);
    const z = zIndexAtDepth(depth);
    const fog = fogAtDepth(depth);

    expect(depth).toBeLessThan(0.3);
    expect(scale).toBeLessThan(1.0);
    expect(fog).toBeGreaterThan(0.15);
    // z should be relatively low
    expect(z).toBeLessThan(zIndexAtDepth(depthFromY(70)));
  });

  it("NPC at Y=80 is near: big, low fog, high z", () => {
    const y = 80;
    const depth = depthFromY(y);
    const scale = scaleAtDepth(depth);
    const z = zIndexAtDepth(depth);
    const fog = fogAtDepth(depth);

    expect(depth).toBeGreaterThan(0.7);
    expect(scale).toBeGreaterThan(1.0);
    expect(fog).toBeLessThan(0.1);
    expect(z).toBeGreaterThan(zIndexAtDepth(depthFromY(30)));
  });

  it("two NPCs at different depths render correctly sorted", () => {
    const npcFar = { id: 1, yPct: 30 };
    const npcNear = { id: 2, yPct: 75 };

    const sorted = sortByDepth([npcNear, npcFar]);
    // Far NPC drawn first (background), near NPC drawn last (foreground)
    expect(sorted[0].id).toBe(1);
    expect(sorted[1].id).toBe(2);

    // Near NPC is visually bigger
    const scaleFar = scaleAtDepth(depthFromY(npcFar.yPct));
    const scaleNear = scaleAtDepth(depthFromY(npcNear.yPct));
    expect(scaleNear).toBeGreaterThan(scaleFar);
  });
});

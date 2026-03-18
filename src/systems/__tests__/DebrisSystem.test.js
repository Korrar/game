// TDD Tests for DebrisSystem — persistent debris after obstacle destruction
import { describe, it, expect } from "vitest";
import {
  DEBRIS_CONFIG,
  createDebris,
  updateDebris,
  clearDebris,
  getDebrisForMaterial,
} from "../DebrisSystem.js";

describe("DEBRIS_CONFIG", () => {
  it("defines max debris count", () => {
    expect(DEBRIS_CONFIG.maxDebris).toBeGreaterThan(0);
    expect(DEBRIS_CONFIG.maxDebris).toBeLessThanOrEqual(100);
  });

  it("defines fade duration", () => {
    expect(DEBRIS_CONFIG.fadeDuration).toBeGreaterThan(0);
  });

  it("defines debris per destruction", () => {
    expect(DEBRIS_CONFIG.debrisPerDestruction).toBeGreaterThan(0);
    expect(DEBRIS_CONFIG.debrisPerDestruction).toBeLessThanOrEqual(12);
  });
});

describe("getDebrisForMaterial", () => {
  it("returns debris definitions for wood", () => {
    const defs = getDebrisForMaterial("wood");
    expect(defs).toBeInstanceOf(Array);
    expect(defs.length).toBeGreaterThan(0);
    defs.forEach(d => {
      expect(d).toHaveProperty("color");
      expect(d).toHaveProperty("shape");
      expect(d).toHaveProperty("sizeMin");
      expect(d).toHaveProperty("sizeMax");
    });
  });

  it("returns different debris for different materials", () => {
    const wood = getDebrisForMaterial("wood");
    const stone = getDebrisForMaterial("stone");
    const ice = getDebrisForMaterial("ice");
    expect(wood[0].color).not.toBe(stone[0].color);
    expect(stone[0].color).not.toBe(ice[0].color);
  });

  it("returns debris for all known materials", () => {
    for (const mat of ["wood", "stone", "ice", "crystal", "organic", "metal", "sand"]) {
      const defs = getDebrisForMaterial(mat);
      expect(defs.length).toBeGreaterThan(0);
    }
  });

  it("returns wood debris as fallback for unknown material", () => {
    const fallback = getDebrisForMaterial("unknown_material");
    const wood = getDebrisForMaterial("wood");
    expect(fallback).toEqual(wood);
  });
});

describe("createDebris", () => {
  it("creates debris array from material and position", () => {
    const debris = createDebris("wood", 100, 200);
    expect(debris).toBeInstanceOf(Array);
    expect(debris.length).toBe(DEBRIS_CONFIG.debrisPerDestruction);
  });

  it("each debris piece has required properties", () => {
    const debris = createDebris("stone", 50, 150);
    debris.forEach(d => {
      expect(d).toHaveProperty("x");
      expect(d).toHaveProperty("y");
      expect(d).toHaveProperty("vx");
      expect(d).toHaveProperty("vy");
      expect(d).toHaveProperty("rotation");
      expect(d).toHaveProperty("rotSpeed");
      expect(d).toHaveProperty("size");
      expect(d).toHaveProperty("color");
      expect(d).toHaveProperty("shape");
      expect(d).toHaveProperty("life");
      expect(d).toHaveProperty("maxLife");
      expect(d).toHaveProperty("grounded");
    });
  });

  it("debris spawns near the given position", () => {
    const debris = createDebris("wood", 500, 300);
    debris.forEach(d => {
      expect(d.x).toBeGreaterThan(450);
      expect(d.x).toBeLessThan(550);
      expect(d.y).toBeGreaterThan(250);
      expect(d.y).toBeLessThan(350);
    });
  });

  it("debris has initial upward velocity (explosive scatter)", () => {
    const debris = createDebris("metal", 100, 100);
    const hasUpward = debris.some(d => d.vy < 0);
    expect(hasUpward).toBe(true);
  });

  it("debris size is within material range", () => {
    const defs = getDebrisForMaterial("wood");
    const debris = createDebris("wood", 100, 100);
    debris.forEach(d => {
      const matching = defs.find(def => def.color === d.color);
      if (matching) {
        expect(d.size).toBeGreaterThanOrEqual(matching.sizeMin);
        expect(d.size).toBeLessThanOrEqual(matching.sizeMax);
      }
    });
  });
});

describe("updateDebris", () => {
  it("applies gravity to non-grounded debris", () => {
    const debris = [{ x: 100, y: 100, vx: 2, vy: -5, rotation: 0, rotSpeed: 0.1, size: 5, color: 0x885533, shape: "rect", life: 300, maxLife: 300, grounded: false }];
    const groundY = 500;
    updateDebris(debris, groundY);
    expect(debris[0].vy).toBeGreaterThan(-5); // gravity pulls down
    expect(debris[0].y).toBeLessThan(500); // not yet at ground
  });

  it("grounds debris when reaching groundY", () => {
    const debris = [{ x: 100, y: 495, vx: 2, vy: 10, rotation: 0, rotSpeed: 0.1, size: 5, color: 0x885533, shape: "rect", life: 300, maxLife: 300, grounded: false }];
    const groundY = 500;
    updateDebris(debris, groundY);
    expect(debris[0].grounded).toBe(true);
    expect(debris[0].vy).toBe(0);
    expect(debris[0].vx).toBe(0);
  });

  it("decrements life each frame", () => {
    const debris = [{ x: 100, y: 100, vx: 0, vy: 0, rotation: 0, rotSpeed: 0, size: 5, color: 0x885533, shape: "rect", life: 300, maxLife: 300, grounded: true }];
    updateDebris(debris, 500);
    expect(debris[0].life).toBe(299);
  });

  it("returns indices of dead debris (life <= 0)", () => {
    const debris = [
      { x: 100, y: 100, vx: 0, vy: 0, rotation: 0, rotSpeed: 0, size: 5, color: 0x885533, shape: "rect", life: 1, maxLife: 300, grounded: true },
      { x: 200, y: 200, vx: 0, vy: 0, rotation: 0, rotSpeed: 0, size: 5, color: 0x885533, shape: "rect", life: 100, maxLife: 300, grounded: true },
    ];
    const dead = updateDebris(debris, 500);
    expect(dead).toContain(0);
    expect(dead).not.toContain(1);
  });

  it("stops rotation when grounded", () => {
    const debris = [{ x: 100, y: 500, vx: 0, vy: 0, rotation: 1.0, rotSpeed: 0.1, size: 5, color: 0x885533, shape: "rect", life: 300, maxLife: 300, grounded: true }];
    const rotBefore = debris[0].rotation;
    updateDebris(debris, 500);
    expect(debris[0].rotation).toBe(rotBefore); // no rotation change when grounded
  });
});

describe("clearDebris", () => {
  it("returns empty array", () => {
    expect(clearDebris()).toEqual([]);
  });
});

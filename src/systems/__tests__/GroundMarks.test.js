// TDD Tests for GroundMarks — ground scorch/frost/blood marks
import { describe, it, expect } from "vitest";
import {
  GROUND_MARKS_CONFIG,
  createGroundMark,
  updateGroundMarks,
  clearGroundMarks,
  getMarkStyle,
} from "../GroundMarks.js";

describe("GROUND_MARKS_CONFIG", () => {
  it("defines max marks", () => {
    expect(GROUND_MARKS_CONFIG.maxMarks).toBeGreaterThan(0);
    expect(GROUND_MARKS_CONFIG.maxMarks).toBeLessThanOrEqual(50);
  });

  it("defines mark lifetime", () => {
    expect(GROUND_MARKS_CONFIG.lifetime).toBeGreaterThan(0);
  });
});

describe("getMarkStyle", () => {
  it("returns style for fire element", () => {
    const s = getMarkStyle("fire");
    expect(s).toHaveProperty("color");
    expect(s).toHaveProperty("type");
    expect(s.type).toBe("scorch");
  });

  it("returns style for ice element", () => {
    const s = getMarkStyle("ice");
    expect(s.type).toBe("frost");
  });

  it("returns style for lightning element", () => {
    const s = getMarkStyle("lightning");
    expect(s.type).toBe("char");
  });

  it("returns style for poison element", () => {
    const s = getMarkStyle("poison");
    expect(s.type).toBe("acid");
  });

  it("returns style for shadow element", () => {
    const s = getMarkStyle("shadow");
    expect(s.type).toBe("void");
  });

  it("returns style for holy element", () => {
    const s = getMarkStyle("holy");
    expect(s.type).toBe("glow");
  });

  it("returns blood style for null/undefined/melee element", () => {
    const s1 = getMarkStyle(null);
    const s2 = getMarkStyle(undefined);
    const s3 = getMarkStyle("melee");
    expect(s1.type).toBe("blood");
    expect(s2.type).toBe("blood");
    expect(s3.type).toBe("blood");
  });

  it("all styles have color and alpha", () => {
    for (const el of ["fire", "ice", "lightning", "poison", "shadow", "holy", null]) {
      const s = getMarkStyle(el);
      expect(s).toHaveProperty("color");
      expect(s).toHaveProperty("alpha");
      expect(s.alpha).toBeGreaterThan(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });
});

describe("createGroundMark", () => {
  it("creates a mark with position and element", () => {
    const mark = createGroundMark(100, 200, "fire", 30);
    expect(mark).toHaveProperty("x", 100);
    expect(mark).toHaveProperty("y", 200);
    expect(mark).toHaveProperty("radius");
    expect(mark).toHaveProperty("life");
    expect(mark).toHaveProperty("maxLife");
    expect(mark).toHaveProperty("style");
  });

  it("radius scales with damage", () => {
    const small = createGroundMark(0, 0, "fire", 10);
    const big = createGroundMark(0, 0, "fire", 50);
    expect(big.radius).toBeGreaterThan(small.radius);
  });

  it("mark life equals config lifetime", () => {
    const mark = createGroundMark(0, 0, "ice", 20);
    expect(mark.maxLife).toBe(GROUND_MARKS_CONFIG.lifetime);
    expect(mark.life).toBe(mark.maxLife);
  });

  it("style matches element", () => {
    const mark = createGroundMark(0, 0, "lightning", 25);
    expect(mark.style.type).toBe("char");
  });
});

describe("updateGroundMarks", () => {
  it("decrements life of each mark", () => {
    const marks = [
      createGroundMark(100, 200, "fire", 20),
      createGroundMark(300, 400, "ice", 15),
    ];
    marks[0].life = 100;
    marks[1].life = 50;
    const dead = updateGroundMarks(marks);
    expect(marks[0].life).toBe(99);
    expect(marks[1].life).toBe(49);
    expect(dead).toEqual([]);
  });

  it("returns indices of expired marks", () => {
    const marks = [
      createGroundMark(0, 0, "fire", 10),
      createGroundMark(0, 0, "ice", 10),
    ];
    marks[0].life = 1;
    marks[1].life = 100;
    const dead = updateGroundMarks(marks);
    expect(dead).toContain(0);
    expect(dead).not.toContain(1);
  });
});

describe("clearGroundMarks", () => {
  it("returns empty array", () => {
    expect(clearGroundMarks()).toEqual([]);
  });
});

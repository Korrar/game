// TDD Tests for ChainReactions — elemental chain reactions between obstacles
import { describe, it, expect } from "vitest";
import {
  CHAIN_RULES,
  findChainTargets,
  getChainDamage,
  getChainDelay,
} from "../ChainReactions.js";

describe("CHAIN_RULES", () => {
  it("defines fire spreads to wood/organic", () => {
    const fire = CHAIN_RULES.fire;
    expect(fire).toBeDefined();
    expect(fire.spreadTo).toContain("wood");
    expect(fire.spreadTo).toContain("organic");
  });

  it("defines lightning chains to metal/crystal", () => {
    const lightning = CHAIN_RULES.lightning;
    expect(lightning).toBeDefined();
    expect(lightning.spreadTo).toContain("metal");
    expect(lightning.spreadTo).toContain("crystal");
  });

  it("defines ice freezes organic/sand", () => {
    const ice = CHAIN_RULES.ice;
    expect(ice).toBeDefined();
    expect(ice.spreadTo).toContain("organic");
  });

  it("defines explosion affects all nearby", () => {
    const explosion = CHAIN_RULES.explosion;
    expect(explosion).toBeDefined();
    expect(explosion.spreadTo.length).toBeGreaterThanOrEqual(5);
  });

  it("each rule has radius and damageMult", () => {
    for (const [, rule] of Object.entries(CHAIN_RULES)) {
      expect(rule).toHaveProperty("radius");
      expect(rule).toHaveProperty("damageMult");
      expect(rule.radius).toBeGreaterThan(0);
      expect(rule.damageMult).toBeGreaterThan(0);
      expect(rule.damageMult).toBeLessThanOrEqual(1);
    }
  });
});

describe("findChainTargets", () => {
  const obstacles = [
    { id: 1, x: 50, y: 50, material: "wood", destructible: true, hp: 20, destroying: false },
    { id: 2, x: 55, y: 50, material: "stone", destructible: true, hp: 30, destroying: false },
    { id: 3, x: 52, y: 48, material: "organic", destructible: true, hp: 15, destroying: false },
    { id: 4, x: 90, y: 90, material: "wood", destructible: true, hp: 10, destroying: false },
  ];

  it("finds nearby wood/organic obstacles for fire", () => {
    // Source is obstacle id=2 (stone), so wood(1) and organic(3) should be found
    const targets = findChainTargets("fire", 50, 50, obstacles, 2);
    const ids = targets.map(t => t.id);
    expect(ids).toContain(1); // wood at 50,50 — within radius
    expect(ids).toContain(3); // organic at 52,48 — within radius
    expect(ids).not.toContain(2); // source excluded
    expect(ids).not.toContain(4); // too far away
  });

  it("excludes the source obstacle", () => {
    const targets = findChainTargets("fire", 50, 50, obstacles, 1);
    expect(targets.every(t => t.id !== 1)).toBe(true);
  });

  it("excludes already-destroying obstacles", () => {
    const obs = [
      ...obstacles,
      { id: 5, x: 51, y: 50, material: "wood", destructible: true, hp: 10, destroying: true },
    ];
    const targets = findChainTargets("fire", 50, 50, obs, 99);
    expect(targets.every(t => t.id !== 5)).toBe(true);
  });

  it("returns empty for elements with no chain rules", () => {
    const targets = findChainTargets("holy", 50, 50, obstacles, 1);
    expect(targets).toEqual([]);
  });

  it("excludes indestructible obstacles", () => {
    const obs = [
      { id: 10, x: 50, y: 50, material: "wood", destructible: false, hp: 0, destroying: false },
    ];
    const targets = findChainTargets("fire", 50, 50, obs, 99);
    expect(targets).toEqual([]);
  });
});

describe("getChainDamage", () => {
  it("returns reduced damage based on element multiplier", () => {
    const dmg = getChainDamage("fire", 30);
    expect(dmg).toBeGreaterThan(0);
    expect(dmg).toBeLessThan(30);
  });

  it("returns 0 for elements with no chain rules", () => {
    expect(getChainDamage("holy", 30)).toBe(0);
  });

  it("rounds to integer", () => {
    const dmg = getChainDamage("fire", 17);
    expect(Number.isInteger(dmg)).toBe(true);
  });
});

describe("getChainDelay", () => {
  it("returns delay in ms", () => {
    const delay = getChainDelay("fire");
    expect(delay).toBeGreaterThan(0);
    expect(delay).toBeLessThanOrEqual(1000);
  });

  it("fire has longer delay (spreading fire)", () => {
    const fireDel = getChainDelay("fire");
    const lightDel = getChainDelay("lightning");
    expect(fireDel).toBeGreaterThan(lightDel);
  });

  it("returns 0 for elements with no chain rules", () => {
    expect(getChainDelay("holy")).toBe(0);
  });
});

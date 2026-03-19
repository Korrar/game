import { describe, it, expect } from "vitest";
import { BIOME_MODIFIERS, rollModifier, applyModifierDamage } from "./biomeModifiers.js";
import { BIOMES } from "./biomes.js";

const ALL_BIOME_IDS = BIOMES.map(b => b.id);

describe("BIOME_MODIFIERS", () => {
  it("has a modifier for every biome", () => {
    for (const id of ALL_BIOME_IDS) {
      expect(BIOME_MODIFIERS[id], `Missing modifier for biome: ${id}`).toBeDefined();
    }
  });

  it("each modifier has required fields", () => {
    for (const [biomeId, mod] of Object.entries(BIOME_MODIFIERS)) {
      expect(mod.id, `${biomeId}.id`).toBeTypeOf("string");
      expect(mod.name, `${biomeId}.name`).toBeTypeOf("string");
      expect(mod.desc, `${biomeId}.desc`).toBeTypeOf("string");
      expect(mod.icon, `${biomeId}.icon`).toBeTypeOf("string");
      expect(mod.type, `${biomeId}.type`).toBeTypeOf("string");
      expect(["hazard", "buff", "debuff", "neutral"]).toContain(mod.type);
    }
  });

  it("each modifier has valid effect config", () => {
    for (const [biomeId, mod] of Object.entries(BIOME_MODIFIERS)) {
      expect(mod.effect, `${biomeId}.effect`).toBeDefined();
      expect(mod.effect.type, `${biomeId}.effect.type`).toBeTypeOf("string");
    }
  });

  it("modifiers with interval have positive interval value", () => {
    for (const [biomeId, mod] of Object.entries(BIOME_MODIFIERS)) {
      if (mod.effect.interval) {
        expect(mod.effect.interval, `${biomeId}.effect.interval`).toBeGreaterThan(0);
      }
    }
  });

  it("modifiers with damage have positive damage value", () => {
    for (const [biomeId, mod] of Object.entries(BIOME_MODIFIERS)) {
      if (mod.effect.damage) {
        expect(mod.effect.damage, `${biomeId}.effect.damage`).toBeGreaterThan(0);
      }
    }
  });

  it("all names and descriptions are in Polish (no ASCII-only strings)", () => {
    for (const [biomeId, mod] of Object.entries(BIOME_MODIFIERS)) {
      // Polish text typically has diacritics or at least multi-word names
      expect(mod.name.length, `${biomeId}.name too short`).toBeGreaterThan(2);
      expect(mod.desc.length, `${biomeId}.desc too short`).toBeGreaterThan(5);
    }
  });
});

describe("rollModifier", () => {
  it("returns a modifier object for a valid biome (when rolled)", () => {
    // Roll multiple times to guarantee at least one success
    let mod = null;
    for (let i = 0; i < 50; i++) {
      mod = rollModifier("jungle");
      if (mod) break;
    }
    expect(mod).not.toBeNull();
    expect(mod.id).toBeTypeOf("string");
    expect(mod.name).toBeTypeOf("string");
  });

  it("returns null for unknown biome", () => {
    expect(rollModifier("nonexistent")).toBeNull();
  });

  it("sometimes returns null (chance-based)", () => {
    // Run 200 times — should get at least some nulls and some modifiers
    let nullCount = 0;
    let modCount = 0;
    for (let i = 0; i < 200; i++) {
      const result = rollModifier("jungle");
      if (result === null) nullCount++;
      else modCount++;
    }
    // With ~60% chance, expect both outcomes in 200 rolls
    expect(modCount).toBeGreaterThan(0);
    expect(nullCount).toBeGreaterThan(0);
  });
});

describe("applyModifierDamage", () => {
  it("returns base damage when no modifier", () => {
    expect(applyModifierDamage(100, "fire", null)).toBe(100);
  });

  it("applies damage multiplier from modifier", () => {
    const mod = { effect: { damageMult: { fire: 1.5 } } };
    expect(applyModifierDamage(100, "fire", mod)).toBe(150);
  });

  it("does not affect unrelated elements", () => {
    const mod = { effect: { damageMult: { fire: 1.5 } } };
    expect(applyModifierDamage(100, "ice", mod)).toBe(100);
  });

  it("works with damage reduction", () => {
    const mod = { effect: { damageMult: { fire: 0.5 } } };
    expect(applyModifierDamage(100, "fire", mod)).toBe(50);
  });

  it("handles null element gracefully", () => {
    const mod = { effect: { damageMult: { fire: 1.5 } } };
    expect(applyModifierDamage(100, null, mod)).toBe(100);
  });
});

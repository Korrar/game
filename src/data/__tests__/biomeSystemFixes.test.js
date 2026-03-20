// Tests for biome system fixes — verifying data-level correctness
// of biome modifiers, relics, and difficulty scaling

import { describe, it, expect } from "vitest";
import { BIOMES } from "../biomes.js";
import { BIOME_MODIFIERS, rollModifier, applyModifierDamage, MODIFIER_CHANCE } from "../biomeModifiers.js";
import { RELICS } from "../relics.js";

// ─── FIX 1: applyModifierDamage works correctly ───

describe("applyModifierDamage function", () => {
  it("should multiply damage when modifier has matching element", () => {
    const modifier = {
      effect: { damageMult: { fire: 1.20, ice: 1.15 } },
    };
    expect(applyModifierDamage(100, "fire", modifier)).toBe(120);
    expect(applyModifierDamage(100, "ice", modifier)).toBe(115);
  });

  it("should return base damage when element not in damageMult", () => {
    const modifier = {
      effect: { damageMult: { fire: 1.20 } },
    };
    expect(applyModifierDamage(100, "shadow", modifier)).toBe(100);
  });

  it("should return base damage when modifier is null", () => {
    expect(applyModifierDamage(100, "fire", null)).toBe(100);
  });

  it("should return base damage when element is null", () => {
    const modifier = { effect: { damageMult: { fire: 1.20 } } };
    expect(applyModifierDamage(100, null, modifier)).toBe(100);
  });

  it("should return base damage for modifiers without damageMult", () => {
    const modifier = { effect: { type: "periodic_heal" } };
    expect(applyModifierDamage(100, "fire", modifier)).toBe(100);
  });
});

// ─── FIX 2: Every biome has a modifier ───

describe("Biome modifier completeness", () => {
  it("every biome should have a defined modifier", () => {
    for (const biome of BIOMES) {
      expect(
        BIOME_MODIFIERS[biome.id],
        `Biome "${biome.id}" (${biome.name}) has no modifier in BIOME_MODIFIERS`
      ).toBeDefined();
    }
  });

  it("every modifier should have required fields", () => {
    for (const [biomeId, mod] of Object.entries(BIOME_MODIFIERS)) {
      expect(mod.id, `${biomeId} missing id`).toBeTruthy();
      expect(mod.name, `${biomeId} missing name`).toBeTruthy();
      expect(mod.desc, `${biomeId} missing desc`).toBeTruthy();
      expect(mod.type, `${biomeId} missing type`).toBeTruthy();
      expect(mod.effect, `${biomeId} missing effect`).toBeDefined();
      expect(mod.effect.type, `${biomeId} missing effect.type`).toBeTruthy();
    }
  });

  it("modifier types should be valid", () => {
    const validTypes = ["hazard", "buff", "debuff", "neutral"];
    for (const [biomeId, mod] of Object.entries(BIOME_MODIFIERS)) {
      expect(
        validTypes.includes(mod.type),
        `${biomeId} has invalid type "${mod.type}"`
      ).toBe(true);
    }
  });

  it("rollModifier should return modifier or null", () => {
    // Run many times to test both paths
    let gotModifier = false;
    let gotNull = false;
    for (let i = 0; i < 200; i++) {
      const result = rollModifier("jungle");
      if (result) gotModifier = true;
      else gotNull = true;
    }
    // With 60% chance, 200 rolls should hit both
    expect(gotModifier).toBe(true);
    expect(gotNull).toBe(true);
  });

  it("rollModifier should return null for non-existent biome", () => {
    expect(rollModifier("nonexistent")).toBeNull();
  });
});

// ─── FIX 2b: Specific modifier effect types are correctly defined ───

describe("Biome modifier effect structures", () => {
  it("loot_mult (summer) should have copperMult > 1", () => {
    const mod = BIOME_MODIFIERS.summer;
    expect(mod.effect.type).toBe("loot_mult");
    expect(mod.effect.copperMult).toBeGreaterThan(1);
  });

  it("bonus_loot (city) should have bonusLootChance and bonusLoot", () => {
    const mod = BIOME_MODIFIERS.city;
    expect(mod.effect.type).toBe("bonus_loot");
    expect(mod.effect.bonusLootChance).toBeGreaterThan(0);
    expect(mod.effect.bonusLootChance).toBeLessThanOrEqual(1);
    expect(mod.effect.bonusLoot).toBeDefined();
  });

  it("slow_and_drag (jungle) should have enemySpeedMult < 1", () => {
    const mod = BIOME_MODIFIERS.jungle;
    expect(mod.effect.type).toBe("slow_and_drag");
    expect(mod.effect.enemySpeedMult).toBeLessThan(1);
    expect(mod.effect.enemySpeedMult).toBeGreaterThan(0);
  });

  it("illusion_enemies (desert) should have illusionChance between 0 and 1", () => {
    const mod = BIOME_MODIFIERS.desert;
    expect(mod.effect.type).toBe("illusion_enemies");
    expect(mod.effect.illusionChance).toBeGreaterThan(0);
    expect(mod.effect.illusionChance).toBeLessThanOrEqual(1);
  });

  it("slow_all (winter) should slow both player and enemies", () => {
    const mod = BIOME_MODIFIERS.winter;
    expect(mod.effect.type).toBe("slow_all");
    expect(mod.effect.playerProjSpeedMult).toBeLessThan(1);
    expect(mod.effect.enemySpeedMult).toBeLessThan(1);
  });

  it("enemy_targeting_slow (bamboo_falls) should have targetingMult < 1", () => {
    const mod = BIOME_MODIFIERS.bamboo_falls;
    expect(mod.effect.type).toBe("enemy_targeting_slow");
    expect(mod.effect.targetingMult).toBeLessThan(1);
    expect(mod.effect.targetingMult).toBeGreaterThan(0);
  });

  it("kill_heal (blue_lagoon) should have healPerKill > 0", () => {
    const mod = BIOME_MODIFIERS.blue_lagoon;
    expect(mod.effect.type).toBe("kill_heal");
    expect(mod.effect.healPerKill).toBeGreaterThan(0);
  });

  it("zombie_respawn (underworld) should have valid respawn params", () => {
    const mod = BIOME_MODIFIERS.underworld;
    expect(mod.effect.type).toBe("zombie_respawn");
    expect(mod.effect.respawnChance).toBeGreaterThan(0);
    expect(mod.effect.respawnChance).toBeLessThanOrEqual(1);
    expect(mod.effect.respawnDelay).toBeGreaterThan(0);
    expect(mod.effect.respawnHpMult).toBeGreaterThan(0);
    expect(mod.effect.respawnHpMult).toBeLessThan(1);
  });

  it("damageMult modifiers should have valid multipliers", () => {
    // sunset_beach, meteor, olympus have damageMult in effect
    for (const biomeId of ["sunset_beach", "meteor"]) {
      const mod = BIOME_MODIFIERS[biomeId];
      if (mod.effect.damageMult) {
        for (const [elem, mult] of Object.entries(mod.effect.damageMult)) {
          expect(mult, `${biomeId} ${elem} multiplier`).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ─── FIX 3: Sea biome relics exist ───

describe("Sea biome relic definitions", () => {
  const seaRelicIds = ["sea_shanty", "barnacle_shield", "mermaid_tear", "sea_compass", "ghost_lantern"];

  it("all sea relics should exist in RELICS", () => {
    for (const id of seaRelicIds) {
      const relic = RELICS.find(r => r.id === id);
      expect(relic, `Relic "${id}" not found in RELICS`).toBeDefined();
    }
  });

  it("all sea relics should have name, desc, icon, and rarity", () => {
    for (const id of seaRelicIds) {
      const relic = RELICS.find(r => r.id === id);
      expect(relic.name, `${id} missing name`).toBeTruthy();
      expect(relic.desc, `${id} missing desc`).toBeTruthy();
      expect(relic.icon, `${id} missing icon`).toBeTruthy();
      expect(relic.rarity, `${id} missing rarity`).toBeTruthy();
    }
  });
});

// ─── FIX 4: Biome difficulty values ───

describe("Biome difficulty scaling", () => {
  it("every biome should have a difficulty value", () => {
    for (const biome of BIOMES) {
      expect(biome.difficulty, `Biome "${biome.id}" missing difficulty`).toBeDefined();
      expect(biome.difficulty).toBeGreaterThanOrEqual(1);
      expect(biome.difficulty).toBeLessThanOrEqual(3);
    }
  });

  it("should have a good distribution of difficulties", () => {
    const diffs = BIOMES.map(b => b.difficulty);
    expect(diffs.filter(d => d === 1).length).toBeGreaterThan(0);
    expect(diffs.filter(d => d === 2).length).toBeGreaterThan(0);
    expect(diffs.filter(d => d === 3).length).toBeGreaterThan(0);
  });

  it("difficulty 3 biomes should be harder areas", () => {
    const hard = BIOMES.filter(b => b.difficulty === 3).map(b => b.id);
    // Volcano, winter, olympus, underworld, meteor should be difficulty 3
    expect(hard).toContain("volcano");
    expect(hard).toContain("winter");
    expect(hard).toContain("olympus");
    expect(hard).toContain("underworld");
    expect(hard).toContain("meteor");
  });
});

// Bug Hunting TDD — testy pisane PRZED poprawkami
// Każdy test opisuje znaleziony bug i oczekiwane zachowanie po naprawie

import { describe, it, expect } from "vitest";
import { BIOME_NPCS, SPELLS, RESIST_NAMES } from "../npcs.js";
import { BIOMES } from "../biomes.js";
import { RELICS, RELIC_RARITY_COLOR } from "../relics.js";
import { SKILLSHOT_TYPES } from "../skillshots.js";
import { FORTIFICATION_TREE, getAvailableFortifications } from "../advancedTraps.js";
import { BOSSES } from "../bosses.js";
import { CONTRACT_TYPES, rollContracts } from "../contracts.js";
import { COMBOS } from "../combos.js";

// ─── BUG 1: RESIST_NAMES missing elements ───
// RESIST_NAMES only has fire and ice, but NPCs/bosses can resist lightning, shadow, poison
// This causes raw English element names to be shown in Polish UI

describe("Bug 1: RESIST_NAMES completeness", () => {
  it("should have Polish names for all elements used as resistances", () => {
    // Collect all resist values used across all NPCs
    const allResists = new Set();
    for (const pool of Object.values(BIOME_NPCS)) {
      for (const npc of pool) {
        if (npc.resist) allResists.add(npc.resist);
      }
    }
    // Also check boss resistances
    for (const boss of BOSSES) {
      if (boss.resist) allResists.add(boss.resist);
    }

    for (const resist of allResists) {
      expect(RESIST_NAMES[resist], `RESIST_NAMES missing '${resist}'`).toBeDefined();
    }
  });

  it("should include fire, ice, shadow, poison, lightning", () => {
    expect(RESIST_NAMES.fire).toBeDefined();
    expect(RESIST_NAMES.ice).toBeDefined();
    expect(RESIST_NAMES.shadow).toBeDefined();
    expect(RESIST_NAMES.poison).toBeDefined();
    expect(RESIST_NAMES.lightning).toBeDefined();
  });
});

// ─── BUG 2: Jadowitа Hydra has Cyrillic 'а' (U+0430) instead of 'a' (U+0061) ───

describe("Bug 2: NPC names must not contain Cyrillic characters", () => {
  it("all NPC names should contain only Polish/Latin characters", () => {
    const cyrillicRegex = /[\u0400-\u04FF]/; // Cyrillic Unicode range
    for (const [biomeId, pool] of Object.entries(BIOME_NPCS)) {
      for (const npc of pool) {
        expect(
          cyrillicRegex.test(npc.name),
          `NPC "${npc.name}" in biome "${biomeId}" contains Cyrillic character`
        ).toBe(false);
      }
    }
  });
});

// ─── BUG 3: FORTIFICATION_TREE broken 'requires' references ───
// poison_mine, net_trap, water_geyser require "spike_pit" which doesn't exist

describe("Bug 3: Fortification tree requires references", () => {
  it("all 'requires' references should point to existing fortification IDs", () => {
    const allIds = new Set(FORTIFICATION_TREE.map(f => f.id));
    for (const fort of FORTIFICATION_TREE) {
      if (fort.requires) {
        expect(
          allIds.has(fort.requires),
          `Fortification "${fort.id}" requires "${fort.requires}" which doesn't exist`
        ).toBe(true);
      }
    }
  });

  it("tier 2 traps should be unlockable via tier 1 fortifications", () => {
    // Start with all tier 1 IDs unlocked
    const tier1Ids = FORTIFICATION_TREE.filter(f => f.tier === 1).map(f => f.id);
    const available = getAvailableFortifications(tier1Ids);
    // Should include tier 2 ground traps
    const tier2Traps = available.filter(f => f.tier === 2 && f.type === "ground_trap");
    expect(tier2Traps.length, "Tier 2 ground traps should be available after unlocking tier 1").toBeGreaterThan(0);
  });
});

// ─── BUG 4: BIOME_NPCS 'meteor' has no matching BIOME ───

describe("Bug 4: NPC pools match biome definitions", () => {
  it("every NPC pool key should have a corresponding biome in BIOMES", () => {
    const biomeIds = new Set(BIOMES.map(b => b.id));
    for (const npcBiomeId of Object.keys(BIOME_NPCS)) {
      expect(
        biomeIds.has(npcBiomeId),
        `NPC pool "${npcBiomeId}" has no matching biome in BIOMES`
      ).toBe(true);
    }
  });

  it("every biome should have an NPC pool", () => {
    for (const biome of BIOMES) {
      expect(BIOME_NPCS[biome.id], `Biome "${biome.id}" has no NPC pool`).toBeDefined();
      expect(BIOME_NPCS[biome.id].length, `Biome "${biome.id}" NPC pool is empty`).toBeGreaterThan(0);
    }
  });
});

// ─── BUG 5: rollContracts ignores calculated weights ───

describe("Bug 5: rollContracts weighted selection", () => {
  it("should use weight values, not random shuffle", () => {
    // There is 1 easy contract and 4 hard contracts in the pool
    // At room 1: easy weight=3, hard weight=1 each
    // Per-contract appearance rate for easy should be much higher than per-contract rate for hard
    const appearances = {};
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const contracts = rollContracts(1, null);
      for (const c of contracts) {
        appearances[c.id] = (appearances[c.id] || 0) + 1;
      }
    }
    // The single easy contract ("no_traps") should appear more often
    // than any individual hard contract, because its weight is 3x higher
    const easyContractAppearances = appearances["no_traps"] || 0;
    const hardContracts = CONTRACT_TYPES.filter(c => c.difficulty === "hard");
    for (const hc of hardContracts) {
      const hardAppearances = appearances[hc.id] || 0;
      expect(
        easyContractAppearances,
        `Easy "no_traps" (weight 3) should appear more than hard "${hc.id}" (weight 1)`
      ).toBeGreaterThan(hardAppearances);
    }
  });
});

// ─── BUG 6: RELIC_RARITY_COLOR missing 'legendary' ───

describe("Bug 6: RELIC_RARITY_COLOR completeness", () => {
  it("should have colors for all rarity levels used in game", () => {
    // Collect all rarities used in relics
    const relicRarities = new Set(RELICS.map(r => r.rarity));
    for (const rarity of relicRarities) {
      expect(
        RELIC_RARITY_COLOR[rarity],
        `RELIC_RARITY_COLOR missing '${rarity}'`
      ).toBeDefined();
    }
  });

  it("should include legendary rarity color", () => {
    expect(RELIC_RARITY_COLOR.legendary).toBeDefined();
  });
});

// ─── BUG 7: Skillshot 'earthquake' has type 'mine' not in documented types ───

describe("Bug 7: Skillshot type consistency", () => {
  it("all skillshot types should be valid (arc, linear, area, mine)", () => {
    const validTypes = ["arc", "linear", "area", "mine"];
    for (const [spellId, shot] of Object.entries(SKILLSHOT_TYPES)) {
      expect(
        validTypes.includes(shot.type),
        `Skillshot "${spellId}" has invalid type "${shot.type}"`
      ).toBe(true);
    }
  });
});

// ─── BUG 8: Element combo keys should be sorted consistently ───

describe("Bug 8: Combo element consistency", () => {
  it("all combo keys should have both elements alphabetically sorted", () => {
    for (const key of Object.keys(COMBOS)) {
      const [e1, e2] = key.split("+");
      expect(e1 < e2, `Combo key "${key}" elements not sorted: should be "${[e1, e2].sort().join("+")}"`)
        .toBe(true);
    }
  });

  it("every element pair used in NPC abilities should have a combo", () => {
    // All elements that appear in game spells
    const spellElements = new Set(SPELLS.filter(s => s.element && s.element !== "summon").map(s => s.element));
    const comboKeys = Object.keys(COMBOS);

    // Check at least fire+ice, fire+lightning, ice+lightning exist
    for (const key of ["fire+ice", "fire+lightning", "ice+lightning"]) {
      expect(comboKeys).toContain(key);
    }
  });
});

// ─── BUG 9: NPC ability type must match element ───

describe("Bug 9: NPC ability type-element consistency", () => {
  const abilityElementMap = {
    fireBreath: "fire",
    iceShot: "ice",
    // shadowBolt can use shadow or lightning
    // poisonSpit uses shadow element
    // charge uses null element
  };

  it("iceShot abilities should always use ice element", () => {
    for (const [biomeId, pool] of Object.entries(BIOME_NPCS)) {
      for (const npc of pool) {
        if (npc.ability && npc.ability.type === "iceShot") {
          expect(
            npc.ability.element,
            `${biomeId}/${npc.name} has iceShot with element "${npc.ability.element}" instead of "ice"`
          ).toBe("ice");
        }
      }
    }
  });

  it("fireBreath abilities should always use fire element", () => {
    for (const [biomeId, pool] of Object.entries(BIOME_NPCS)) {
      for (const npc of pool) {
        if (npc.ability && npc.ability.type === "fireBreath") {
          expect(
            npc.ability.element,
            `${biomeId}/${npc.name} has fireBreath with element "${npc.ability.element}" instead of "fire"`
          ).toBe("fire");
        }
      }
    }
  });
});

// ─── BUG 10: NPC data validation ───

describe("Bug 9: NPC data integrity", () => {
  it("all NPCs should have positive HP", () => {
    for (const [biomeId, pool] of Object.entries(BIOME_NPCS)) {
      for (const npc of pool) {
        expect(npc.hp, `${biomeId}/${npc.name} HP`).toBeGreaterThan(0);
      }
    }
  });

  it("all NPCs with abilities should have valid ability types", () => {
    const validAbilityTypes = ["charge", "fireBreath", "iceShot", "shadowBolt", "poisonSpit"];
    for (const [biomeId, pool] of Object.entries(BIOME_NPCS)) {
      for (const npc of pool) {
        if (npc.ability) {
          expect(
            validAbilityTypes.includes(npc.ability.type),
            `${biomeId}/${npc.name} has invalid ability type: ${npc.ability.type}`
          ).toBe(true);
        }
      }
    }
  });

  it("all NPCs should have valid bodyType", () => {
    const validTypes = ["humanoid", "quadruped", "floating", "serpent", "spider", "scorpion", "frog"];
    for (const [biomeId, pool] of Object.entries(BIOME_NPCS)) {
      for (const npc of pool) {
        expect(
          validTypes.includes(npc.bodyType),
          `${biomeId}/${npc.name} has invalid bodyType: ${npc.bodyType}`
        ).toBe(true);
      }
    }
  });

  it("all NPCs with abilities should have positive cooldown and damage", () => {
    for (const [biomeId, pool] of Object.entries(BIOME_NPCS)) {
      for (const npc of pool) {
        if (npc.ability) {
          expect(npc.ability.cooldown, `${biomeId}/${npc.name} ability cooldown`).toBeGreaterThan(0);
          expect(npc.ability.damage, `${biomeId}/${npc.name} ability damage`).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ─── BUG 10: Boss data validation ───

describe("Bug 11: Boss data integrity", () => {
  it("all bosses should have unique IDs", () => {
    const ids = BOSSES.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all bosses should have phase2 with valid hpThreshold", () => {
    for (const boss of BOSSES) {
      expect(boss.phase2, `Boss "${boss.name}" missing phase2`).toBeDefined();
      expect(boss.phase2.hpThreshold, `Boss "${boss.name}" phase2 missing hpThreshold`).toBeDefined();
      expect(boss.phase2.hpThreshold).toBeGreaterThan(0);
      expect(boss.phase2.hpThreshold).toBeLessThan(1);
    }
  });

  it("all bosses should have valid bodyType", () => {
    const validTypes = ["humanoid", "quadruped", "floating", "serpent", "spider", "scorpion", "frog"];
    for (const boss of BOSSES) {
      expect(
        validTypes.includes(boss.bodyType),
        `Boss "${boss.name}" has invalid bodyType: ${boss.bodyType}`
      ).toBe(true);
    }
  });
});

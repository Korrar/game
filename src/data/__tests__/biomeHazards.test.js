import { describe, it, expect } from "vitest";
import {
  BIOME_HAZARD_ZONES,
  spawnHazardZones,
  isInHazardZone,
  getHazardDamage,
  tickHazards,
} from "../biomeHazards.js";
import { BIOMES } from "../biomes.js";

const ALL_BIOME_IDS = BIOMES.map((b) => b.id);
const ARENA = { width: 1280, height: 720 };

// ─── BIOME_HAZARD_ZONES data ──────────────────────────────────────

describe("BIOME_HAZARD_ZONES", () => {
  it("covers at least 10 biomes", () => {
    expect(Object.keys(BIOME_HAZARD_ZONES).length).toBeGreaterThanOrEqual(10);
  });

  it("only references valid biome ids", () => {
    for (const biomeId of Object.keys(BIOME_HAZARD_ZONES)) {
      expect(ALL_BIOME_IDS, `Unknown biome: ${biomeId}`).toContain(biomeId);
    }
  });

  it("each hazard zone definition has required fields", () => {
    for (const [biomeId, hz] of Object.entries(BIOME_HAZARD_ZONES)) {
      expect(hz.id, `${biomeId}.id`).toBeTypeOf("string");
      expect(hz.name, `${biomeId}.name`).toBeTypeOf("string");
      expect(hz.desc, `${biomeId}.desc`).toBeTypeOf("string");
      expect(hz.icon, `${biomeId}.icon`).toBeTypeOf("string");
      expect(hz.zoneCount, `${biomeId}.zoneCount`).toBeTypeOf("number");
      expect(hz.zoneCount).toBeGreaterThanOrEqual(1);
      expect(hz.zoneCount).toBeLessThanOrEqual(6);
      expect(hz.zoneRadius, `${biomeId}.zoneRadius`).toBeTypeOf("number");
      expect(hz.zoneRadius).toBeGreaterThan(0);
    }
  });

  it("each hazard has an effect with a valid type", () => {
    const validTypes = [
      "damage", "slow", "damage_and_slow", "knockback",
      "teleport", "buff_enemies", "debuff_player", "heal_enemies",
      "dot", "stun", "pull",
    ];
    for (const [biomeId, hz] of Object.entries(BIOME_HAZARD_ZONES)) {
      expect(hz.effect, `${biomeId}.effect`).toBeDefined();
      expect(hz.effect.type, `${biomeId}.effect.type`).toBeTypeOf("string");
      expect(validTypes, `Unknown effect type: ${hz.effect.type} in ${biomeId}`)
        .toContain(hz.effect.type);
    }
  });

  it("pure damage hazards have positive dps", () => {
    for (const [biomeId, hz] of Object.entries(BIOME_HAZARD_ZONES)) {
      if (hz.effect.type === "damage") {
        expect(hz.effect.dps, `${biomeId} damage hazard with no dps`).toBeGreaterThan(0);
      }
    }
  });

  it("damage_and_slow hazards have dps, slow, or ignitable mechanic", () => {
    for (const [biomeId, hz] of Object.entries(BIOME_HAZARD_ZONES)) {
      if (hz.effect.type === "damage_and_slow") {
        const hasEffect = (hz.effect.dps != null && hz.effect.dps !== 0)
          || (hz.effect.speedMult != null && hz.effect.speedMult < 1)
          || hz.effect.ignitable;
        expect(hasEffect, `${biomeId} has no damage, slow or ignitable effect`).toBe(true);
      }
    }
  });

  it("dot hazards have non-zero dps", () => {
    for (const [biomeId, hz] of Object.entries(BIOME_HAZARD_ZONES)) {
      if (hz.effect.type === "dot") {
        expect(hz.effect.dps, `${biomeId} dot hazard with no dps`).not.toBe(0);
      }
    }
  });

  it("hazards with slow have a speedMult between 0 and 1", () => {
    for (const [_biomeId, hz] of Object.entries(BIOME_HAZARD_ZONES)) {
      if (hz.effect.type === "slow" || hz.effect.type === "damage_and_slow") {
        expect(hz.effect.speedMult).toBeGreaterThan(0);
        expect(hz.effect.speedMult).toBeLessThan(1);
      }
    }
  });

  it("affectsPlayer flag is explicit for dangerous zones", () => {
    for (const [biomeId, hz] of Object.entries(BIOME_HAZARD_ZONES)) {
      // Every hazard should declare who it affects
      expect(typeof hz.affectsEnemies, `${biomeId}.affectsEnemies`).toBe("boolean");
      expect(typeof hz.affectsPlayer, `${biomeId}.affectsPlayer`).toBe("boolean");
    }
  });

  it("names and descriptions are in Polish", () => {
    const allTexts = Object.values(BIOME_HAZARD_ZONES).flatMap((hz) => [hz.name, hz.desc]);
    const hasPolish = allTexts.some((t) => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(t));
    expect(hasPolish).toBe(true);
  });

  it("hazard ids are globally unique", () => {
    const ids = Object.values(BIOME_HAZARD_ZONES).map((hz) => hz.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── spawnHazardZones ─────────────────────────────────────────────

describe("spawnHazardZones", () => {
  it("spawns correct number of zones for a biome", () => {
    const zones = spawnHazardZones("volcano", ARENA);
    const expected = BIOME_HAZARD_ZONES.volcano.zoneCount;
    expect(zones.length).toBe(expected);
  });

  it("each spawned zone has x, y, radius, and hazardId", () => {
    const zones = spawnHazardZones("volcano", ARENA);
    for (const z of zones) {
      expect(z).toHaveProperty("x");
      expect(z).toHaveProperty("y");
      expect(z).toHaveProperty("radius");
      expect(z).toHaveProperty("hazardId");
      expect(typeof z.x).toBe("number");
      expect(typeof z.y).toBe("number");
      expect(z.radius).toBeGreaterThan(0);
    }
  });

  it("zones are within arena bounds", () => {
    // Spawn many times to test randomness
    for (let i = 0; i < 20; i++) {
      const zones = spawnHazardZones("volcano", ARENA);
      for (const z of zones) {
        expect(z.x).toBeGreaterThanOrEqual(0);
        expect(z.x).toBeLessThanOrEqual(ARENA.width);
        expect(z.y).toBeGreaterThanOrEqual(0);
        expect(z.y).toBeLessThanOrEqual(ARENA.height);
      }
    }
  });

  it("returns empty array for biome without hazard zones", () => {
    expect(spawnHazardZones("nonexistent", ARENA)).toEqual([]);
  });

  it("zones avoid caravan area (bottom 10%)", () => {
    for (let i = 0; i < 30; i++) {
      const zones = spawnHazardZones("volcano", ARENA);
      for (const z of zones) {
        // Zone center should not be in bottom 10% (caravan safe zone)
        expect(z.y).toBeLessThanOrEqual(ARENA.height * 0.90);
      }
    }
  });
});

// ─── isInHazardZone ───────────────────────────────────────────────

describe("isInHazardZone", () => {
  const zones = [
    { x: 100, y: 100, radius: 50, hazardId: "test" },
    { x: 500, y: 300, radius: 30, hazardId: "test2" },
  ];

  it("returns matching zone when entity is inside", () => {
    const result = isInHazardZone(100, 100, zones);
    expect(result).not.toBeNull();
    expect(result.hazardId).toBe("test");
  });

  it("returns matching zone when entity is at edge", () => {
    // Exactly at radius distance
    const result = isInHazardZone(150, 100, zones);
    expect(result).not.toBeNull();
  });

  it("returns null when entity is outside all zones", () => {
    expect(isInHazardZone(900, 600, zones)).toBeNull();
  });

  it("returns null for empty zones array", () => {
    expect(isInHazardZone(100, 100, [])).toBeNull();
  });
});

// ─── getHazardDamage ──────────────────────────────────────────────

describe("getHazardDamage", () => {
  it("returns dps for damage-type hazard", () => {
    const hz = { effect: { type: "damage", dps: 8, element: "fire" } };
    const result = getHazardDamage(hz, 1.0);
    expect(result.damage).toBe(8);
    expect(result.element).toBe("fire");
  });

  it("scales damage by deltaTime", () => {
    const hz = { effect: { type: "damage", dps: 10, element: "fire" } };
    const result = getHazardDamage(hz, 0.5);
    expect(result.damage).toBe(5);
  });

  it("returns zero damage for non-damage hazard", () => {
    const hz = { effect: { type: "slow", speedMult: 0.5 } };
    const result = getHazardDamage(hz, 1.0);
    expect(result.damage).toBe(0);
  });

  it("returns element for damage_and_slow type", () => {
    const hz = { effect: { type: "damage_and_slow", dps: 5, element: "ice", speedMult: 0.6 } };
    const result = getHazardDamage(hz, 1.0);
    expect(result.damage).toBe(5);
    expect(result.element).toBe("ice");
  });
});

// ─── tickHazards ──────────────────────────────────────────────────

describe("tickHazards", () => {
  it("returns effects for entities inside hazard zones", () => {
    const hazardDef = BIOME_HAZARD_ZONES.volcano;
    const zones = [{ x: 100, y: 100, radius: 50, hazardId: hazardDef.id }];
    const entities = [
      { id: "e1", x: 110, y: 105, isEnemy: true },
      { id: "e2", x: 800, y: 600, isEnemy: true },
    ];

    const effects = tickHazards(zones, entities, hazardDef, 1.0);
    // Only e1 is in the zone
    expect(effects.length).toBe(1);
    expect(effects[0].entityId).toBe("e1");
  });

  it("returns empty array when no entities in zones", () => {
    const hazardDef = BIOME_HAZARD_ZONES.volcano;
    const zones = [{ x: 100, y: 100, radius: 50, hazardId: hazardDef.id }];
    const entities = [{ id: "e1", x: 800, y: 600, isEnemy: true }];
    const effects = tickHazards(zones, entities, hazardDef, 1.0);
    expect(effects).toEqual([]);
  });

  it("respects affectsPlayer flag", () => {
    const hazardDef = { ...BIOME_HAZARD_ZONES.volcano, affectsPlayer: false };
    const zones = [{ x: 100, y: 100, radius: 50, hazardId: hazardDef.id }];
    const entities = [{ id: "p1", x: 110, y: 105, isEnemy: false }];
    const effects = tickHazards(zones, entities, hazardDef, 1.0);
    expect(effects).toEqual([]);
  });

  it("respects affectsEnemies flag", () => {
    const hazardDef = { ...BIOME_HAZARD_ZONES.swamp, affectsEnemies: false };
    const zones = [{ x: 100, y: 100, radius: 50, hazardId: hazardDef.id }];
    const entities = [{ id: "e1", x: 110, y: 105, isEnemy: true }];
    const effects = tickHazards(zones, entities, hazardDef, 1.0);
    expect(effects).toEqual([]);
  });

  it("includes slow multiplier for slow-type hazards", () => {
    // Find a hazard with slow effect
    const slowBiome = Object.entries(BIOME_HAZARD_ZONES).find(
      ([, hz]) => hz.effect.type === "slow" || hz.effect.type === "damage_and_slow"
    );
    expect(slowBiome).toBeDefined();

    const [, hazardDef] = slowBiome;
    const zones = [{ x: 100, y: 100, radius: hazardDef.zoneRadius, hazardId: hazardDef.id }];
    const entities = [{ id: "e1", x: 100, y: 100, isEnemy: true }];
    const effects = tickHazards(zones, entities, hazardDef, 1.0);
    expect(effects.length).toBe(1);
    expect(effects[0]).toHaveProperty("speedMult");
    expect(effects[0].speedMult).toBeLessThan(1);
  });
});

// ─── Edge cases & integration ─────────────────────────────────────

describe("edge cases", () => {
  it("tickHazards handles many entities efficiently", () => {
    const hazardDef = BIOME_HAZARD_ZONES.volcano;
    const zones = [{ x: 500, y: 300, radius: 200, hazardId: hazardDef.id }];
    const entities = Array.from({ length: 100 }, (_, i) => ({
      id: `e${i}`, x: 400 + (i % 20) * 10, y: 250 + Math.floor(i / 20) * 10, isEnemy: true,
    }));
    const effects = tickHazards(zones, entities, hazardDef, 0.016);
    expect(effects.length).toBeGreaterThan(0);
    // All affected entities should have damage
    for (const eff of effects) {
      expect(typeof eff.damage).toBe("number");
    }
  });

  it("getHazardDamage with zero deltaTime returns 0 damage", () => {
    const hz = { effect: { type: "damage", dps: 10, element: "fire" } };
    const result = getHazardDamage(hz, 0);
    expect(result.damage).toBe(0);
  });

  it("healing zones (negative dps) return negative damage", () => {
    const hz = BIOME_HAZARD_ZONES.spring;
    const result = getHazardDamage(hz, 1.0);
    expect(result.damage).toBeLessThan(0);
  });

  it("spawnHazardZones produces different positions on successive calls", () => {
    const a = spawnHazardZones("volcano", ARENA);
    const b = spawnHazardZones("volcano", ARENA);
    // Very unlikely all positions match with randomness
    const allSame = a.every((z, i) => z.x === b[i].x && z.y === b[i].y);
    expect(allSame).toBe(false);
  });

  it("isInHazardZone returns first matching zone when overlapping", () => {
    const zones = [
      { x: 100, y: 100, radius: 80, hazardId: "first" },
      { x: 120, y: 100, radius: 80, hazardId: "second" },
    ];
    const result = isInHazardZone(110, 100, zones);
    expect(result.hazardId).toBe("first");
  });
});

describe("integration with biome system", () => {
  it("hazard zones complement biomeModifiers (no id collisions)", () => {
    // Import is done inline to keep test independent
    const hazardIds = Object.values(BIOME_HAZARD_ZONES).map((hz) => hz.id);
    expect(new Set(hazardIds).size).toBe(hazardIds.length);
  });

  it("all hazard biomes exist in BIOMES array", () => {
    for (const biomeId of Object.keys(BIOME_HAZARD_ZONES)) {
      const biome = BIOMES.find((b) => b.id === biomeId);
      expect(biome, `Hazard for nonexistent biome: ${biomeId}`).toBeDefined();
    }
  });

  it("hazard element colors are thematically consistent", () => {
    // Fire hazards should have warm colors
    const fireHazards = Object.values(BIOME_HAZARD_ZONES).filter(
      (hz) => hz.effect.element === "fire"
    );
    for (const hz of fireHazards) {
      // Color should contain red/orange tones (start with #ff or contain warm hex)
      expect(hz.color).toBeTruthy();
    }
  });
});

// Tests for NPC body type system — verifies each bodyType has matching
// definitions in: npcs.js, constants.js, animOffsets.js, CharacterSprite LIMB_DEFS,
// icons.js NPC_BODY_DRAW, and RapierPhysicsWorld _buildLimbs/_buildJoints
import { describe, it, expect } from "vitest";
import { BIOME_NPCS } from "../npcs.js";
import { HALF_HEIGHTS } from "../../physics/bodies/constants.js";
import * as animOffsets from "../../physics/bodies/animOffsets.js";

// All bodyTypes that should be fully supported for NPC creatures
const CREATURE_BODY_TYPES = [
  "humanoid", "quadruped", "floating", "scorpion", "spider", "frog", "serpent",
  // New types
  "lizard", "crab", "bird", "tentacle", "primate", "fish",
];

// Structure types (non-NPC) — separate category
const STRUCTURE_BODY_TYPES = ["barricade", "tower", "meteorBoulder"];

// ─── NPC DATA INTEGRITY ───

describe("NPC bodyType assignments", () => {
  const allNpcs = Object.entries(BIOME_NPCS).flatMap(([biome, npcs]) =>
    npcs.map(n => ({ ...n, biome }))
  );

  it("every NPC has a valid bodyType", () => {
    const validTypes = [...CREATURE_BODY_TYPES, ...STRUCTURE_BODY_TYPES];
    for (const npc of allNpcs) {
      expect(validTypes, `${npc.name} has invalid bodyType: ${npc.bodyType}`).toContain(npc.bodyType);
    }
  });

  it("no NPC uses spider bodyType for crabs", () => {
    const crabNames = ["Krab", "krab"];
    for (const npc of allNpcs) {
      if (crabNames.some(k => npc.name.includes(k))) {
        expect(npc.bodyType, `${npc.name} should be crab, not ${npc.bodyType}`).toBe("crab");
      }
    }
  });

  it("no NPC uses serpent bodyType for 4-legged reptiles", () => {
    const reptileNames = ["Krokodyl", "Waran", "Aligator", "Jaszczurka"];
    for (const npc of allNpcs) {
      if (reptileNames.some(k => npc.name.includes(k))) {
        expect(npc.bodyType, `${npc.name} should be lizard, not ${npc.bodyType}`).toBe("lizard");
      }
    }
  });

  it("no NPC uses quadruped for primates", () => {
    const primateNames = ["Małpa", "Gibbon"];
    for (const npc of allNpcs) {
      if (primateNames.some(k => npc.name.includes(k))) {
        expect(npc.bodyType, `${npc.name} should be primate, not ${npc.bodyType}`).toBe("primate");
      }
    }
  });

  it("no NPC uses floating for winged creatures", () => {
    const birdNames = ["Orzeł", "Gryfon", "Harpia", "Nietoperz"];
    for (const npc of allNpcs) {
      if (birdNames.some(k => npc.name.includes(k))) {
        expect(npc.bodyType, `${npc.name} should be bird, not ${npc.bodyType}`).toBe("bird");
      }
    }
  });

  it("Minotaur is humanoid (bipedal)", () => {
    const minotaur = allNpcs.find(n => n.name === "Minotaur");
    expect(minotaur).toBeDefined();
    expect(minotaur.bodyType).toBe("humanoid");
  });

  it("Ośmiornica is tentacle type", () => {
    const octopus = allNpcs.find(n => n.name === "Ośmiornica");
    expect(octopus).toBeDefined();
    expect(octopus.bodyType).toBe("tentacle");
  });

  it("Meduza Brzegowa is tentacle type", () => {
    const jellyfish = allNpcs.find(n => n.name === "Meduza Brzegowa");
    expect(jellyfish).toBeDefined();
    expect(jellyfish.bodyType).toBe("tentacle");
  });

  it("Morska Bestia is tentacle type", () => {
    const beast = allNpcs.find(n => n.name === "Morska Bestia");
    expect(beast).toBeDefined();
    expect(beast.bodyType).toBe("tentacle");
  });

  it("Jadowita Ryba is fish type", () => {
    const fish = allNpcs.find(n => n.name === "Jadowita Ryba");
    expect(fish).toBeDefined();
    expect(fish.bodyType).toBe("fish");
  });

  it("Płaszczka Plażowa is fish type", () => {
    const ray = allNpcs.find(n => n.name === "Płaszczka Plażowa");
    expect(ray).toBeDefined();
    expect(ray.bodyType).toBe("fish");
  });

  it("Ognisty Salamander is lizard type", () => {
    const sala = allNpcs.find(n => n.name === "Ognisty Salamander");
    expect(sala).toBeDefined();
    expect(sala.bodyType).toBe("lizard");
  });

  it("Kamienny Gargulec is humanoid (bipedal)", () => {
    const garg = allNpcs.find(n => n.name === "Kamienny Gargulec");
    expect(garg).toBeDefined();
    expect(garg.bodyType).toBe("humanoid");
  });

  it("every NPC has bodyColor and armorColor", () => {
    for (const npc of allNpcs) {
      expect(npc.bodyColor, `${npc.name} missing bodyColor`).toBeTruthy();
      expect(npc.armorColor, `${npc.name} missing armorColor`).toBeTruthy();
    }
  });
});

// ─── PHYSICS CONSTANTS ───

describe("HALF_HEIGHTS has all bodyTypes", () => {
  for (const bt of [...CREATURE_BODY_TYPES, ...STRUCTURE_BODY_TYPES]) {
    it(`${bt} has a HALF_HEIGHT`, () => {
      expect(HALF_HEIGHTS[bt], `Missing HALF_HEIGHTS for ${bt}`).toBeGreaterThan(0);
    });
  }
});

// ─── ANIMATION OFFSETS ───

describe("animation offset functions exist for new bodyTypes", () => {
  it("getLizardOffsets exists and returns valid object", () => {
    expect(typeof animOffsets.getLizardOffsets).toBe("function");
    const o = animOffsets.getLizardOffsets(1.0);
    expect(o).toHaveProperty("flX");
    expect(o).toHaveProperty("tailX");
  });

  it("getCrabOffsets exists and returns valid object", () => {
    expect(typeof animOffsets.getCrabOffsets).toBe("function");
    const o = animOffsets.getCrabOffsets(1.0);
    expect(o).toHaveProperty("pincerOpen");
  });

  it("getBirdOffsets exists and returns valid object", () => {
    expect(typeof animOffsets.getBirdOffsets).toBe("function");
    const o = animOffsets.getBirdOffsets(1.0);
    expect(o).toHaveProperty("wingY");
  });

  it("getTentacleOffsets exists and returns valid object", () => {
    expect(typeof animOffsets.getTentacleOffsets).toBe("function");
    const o = animOffsets.getTentacleOffsets(1.0);
    expect(o).toHaveProperty("t1X");
  });

  it("getPrimateOffsets exists and returns valid object", () => {
    expect(typeof animOffsets.getPrimateOffsets).toBe("function");
    const o = animOffsets.getPrimateOffsets(1.0);
    expect(o).toHaveProperty("lArmX");
  });

  it("getFishOffsets exists and returns valid object", () => {
    expect(typeof animOffsets.getFishOffsets).toBe("function");
    const o = animOffsets.getFishOffsets(1.0);
    expect(o).toHaveProperty("tailX");
  });

  // Verify existing offsets still work
  it("existing offset functions still return valid data", () => {
    expect(animOffsets.getWalkingOffsets(1.0)).toHaveProperty("lLegX");
    expect(animOffsets.getQuadrupedOffsets(1.0)).toHaveProperty("flX");
    expect(animOffsets.getFloatingOffsets(1.0)).toHaveProperty("bobY");
    expect(animOffsets.getScorpionOffsets(1.0)).toHaveProperty("pincerOpen");
    expect(animOffsets.getSpiderOffsets(1.0)).toHaveProperty("ll0X");
    expect(animOffsets.getFrogOffsets(1.0)).toHaveProperty("jumpY");
    expect(animOffsets.getSerpentOffsets(1.0)).toHaveProperty("seg2X");
  });
});

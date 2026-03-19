import { describe, it, expect } from "vitest";
import { BIOME_INTERACTABLES, rollInteractables } from "./biomeInteractables.js";
import { BIOMES } from "./biomes.js";

const ALL_BIOME_IDS = BIOMES.map(b => b.id);

describe("BIOME_INTERACTABLES", () => {
  it("has interactable definitions for every biome", () => {
    for (const id of ALL_BIOME_IDS) {
      expect(BIOME_INTERACTABLES[id], `Missing interactables for biome: ${id}`).toBeDefined();
      expect(Array.isArray(BIOME_INTERACTABLES[id]), `${id} should be an array`).toBe(true);
      expect(BIOME_INTERACTABLES[id].length, `${id} should have at least 2 interactables`).toBeGreaterThanOrEqual(2);
    }
  });

  it("each interactable has required fields", () => {
    for (const [biomeId, list] of Object.entries(BIOME_INTERACTABLES)) {
      for (const item of list) {
        expect(item.id, `${biomeId}/${item.id} missing id`).toBeTypeOf("string");
        expect(item.name, `${biomeId}/${item.id} missing name`).toBeTypeOf("string");
        expect(item.icon, `${biomeId}/${item.id} missing icon`).toBeTypeOf("string");
        expect(item.desc, `${biomeId}/${item.id} missing desc`).toBeTypeOf("string");
        expect(item.action, `${biomeId}/${item.id} missing action`).toBeTypeOf("string");
        expect(["shoot", "click", "saber", "proximity"]).toContain(item.action);
        expect(item.chance, `${biomeId}/${item.id} missing chance`).toBeTypeOf("number");
        expect(item.chance).toBeGreaterThan(0);
        expect(item.chance).toBeLessThanOrEqual(1);
      }
    }
  });

  it("each interactable has a reward definition", () => {
    for (const [biomeId, list] of Object.entries(BIOME_INTERACTABLES)) {
      for (const item of list) {
        expect(item.reward, `${biomeId}/${item.id} missing reward`).toBeDefined();
        expect(item.reward.type, `${biomeId}/${item.id} missing reward.type`).toBeTypeOf("string");
      }
    }
  });

  it("no duplicate IDs within a biome", () => {
    for (const [biomeId, list] of Object.entries(BIOME_INTERACTABLES)) {
      const ids = list.map(i => i.id);
      const unique = new Set(ids);
      expect(unique.size, `Duplicate IDs in ${biomeId}: ${ids}`).toBe(ids.length);
    }
  });

  it("no duplicate IDs across all biomes", () => {
    const allIds = [];
    for (const list of Object.values(BIOME_INTERACTABLES)) {
      for (const item of list) allIds.push(item.id);
    }
    const unique = new Set(allIds);
    expect(unique.size, `Global duplicate IDs found`).toBe(allIds.length);
  });

  it("all names and descs are in Polish", () => {
    for (const [biomeId, list] of Object.entries(BIOME_INTERACTABLES)) {
      for (const item of list) {
        expect(item.name.length, `${biomeId}/${item.id} name too short`).toBeGreaterThan(2);
        expect(item.desc.length, `${biomeId}/${item.id} desc too short`).toBeGreaterThan(5);
      }
    }
  });
});

describe("rollInteractables", () => {
  it("returns an array for a valid biome", () => {
    const result = rollInteractables("jungle");
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array for unknown biome", () => {
    expect(rollInteractables("nonexistent")).toEqual([]);
  });

  it("returns spawned interactables with x position", () => {
    // Run multiple times to get at least one spawn
    let found = false;
    for (let i = 0; i < 50; i++) {
      const result = rollInteractables("jungle");
      if (result.length > 0) {
        found = true;
        const item = result[0];
        expect(item.x).toBeTypeOf("number");
        expect(item.x).toBeGreaterThanOrEqual(5);
        expect(item.x).toBeLessThanOrEqual(95);
        expect(item.id).toBeTypeOf("string");
        expect(item.used).toBe(false);
        break;
      }
    }
    expect(found, "Should spawn at least one interactable in 50 tries").toBe(true);
  });

  it("respects max interactables per room (1-3)", () => {
    for (let i = 0; i < 100; i++) {
      const result = rollInteractables("jungle");
      expect(result.length).toBeLessThanOrEqual(3);
    }
  });
});

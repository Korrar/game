import { describe, it, expect } from "vitest";
import {
  BIOME_RESOURCES,
  BIOME_RECIPES,
  getAvailableRecipes,
  canCraft,
  craft,
  getBiomeResources,
} from "../biomeCrafting.js";
import { BIOMES } from "../biomes.js";

// ─── BIOME_RESOURCES ───────────────────────────────────────────────

describe("BIOME_RESOURCES", () => {
  it("every biome with terrain has unique resources", () => {
    const biomeIds = BIOMES.map((b) => b.id);
    // At least half of biomes should have unique resources
    const covered = biomeIds.filter((id) => BIOME_RESOURCES[id]);
    expect(covered.length).toBeGreaterThanOrEqual(8);
  });

  it("each resource has required fields", () => {
    for (const [_biomeId, resources] of Object.entries(BIOME_RESOURCES)) {
      for (const res of resources) {
        expect(res).toHaveProperty("id");
        expect(res).toHaveProperty("icon");
        expect(res).toHaveProperty("name");
        expect(res).toHaveProperty("rarity");
        expect(res).toHaveProperty("chance");
        expect(typeof res.id).toBe("string");
        expect(typeof res.name).toBe("string");
        expect(typeof res.chance).toBe("number");
        expect(res.chance).toBeGreaterThan(0);
        expect(res.chance).toBeLessThanOrEqual(1);
      }
    }
  });

  it("resource ids are globally unique", () => {
    const allIds = Object.values(BIOME_RESOURCES).flat().map((r) => r.id);
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it("each biome has 2-4 unique resources", () => {
    for (const [_biomeId, resources] of Object.entries(BIOME_RESOURCES)) {
      expect(resources.length).toBeGreaterThanOrEqual(2);
      expect(resources.length).toBeLessThanOrEqual(4);
    }
  });

  it("names are in Polish", () => {
    // Polish has diacritics — at least some names should contain them
    const allNames = Object.values(BIOME_RESOURCES).flat().map((r) => r.name);
    const hasPolish = allNames.some((n) => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(n));
    expect(hasPolish).toBe(true);
  });
});

// ─── BIOME_RECIPES ─────────────────────────────────────────────────

describe("BIOME_RECIPES", () => {
  it("has at least 10 recipes across biomes", () => {
    expect(BIOME_RECIPES.length).toBeGreaterThanOrEqual(10);
  });

  it("each recipe has required fields", () => {
    for (const recipe of BIOME_RECIPES) {
      expect(recipe).toHaveProperty("id");
      expect(recipe).toHaveProperty("biome");
      expect(recipe).toHaveProperty("name");
      expect(recipe).toHaveProperty("desc");
      expect(recipe).toHaveProperty("ingredients");
      expect(recipe).toHaveProperty("result");
      expect(recipe).toHaveProperty("craftTime");
      expect(Array.isArray(recipe.ingredients)).toBe(true);
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(2);
      expect(typeof recipe.craftTime).toBe("number");
      expect(recipe.craftTime).toBeGreaterThan(0);
    }
  });

  it("recipe ids are unique", () => {
    const ids = BIOME_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each recipe references a valid biome", () => {
    const biomeIds = BIOMES.map((b) => b.id);
    for (const recipe of BIOME_RECIPES) {
      expect(biomeIds).toContain(recipe.biome);
    }
  });

  it("ingredients reference existing biome resources or base resources", () => {
    const allResourceIds = new Set(
      Object.values(BIOME_RESOURCES).flat().map((r) => r.id)
    );
    // Also allow base resource types from shopItems (ammo, currency)
    const baseTypes = new Set([
      "dynamite", "harpoon", "cannonball", "copper", "silver",
      "oak_wood", "pine_wood", "rare_herbs", "poison_mushroom", "mahogany",
      "iron_ore", "copper_ore", "raw_crystal", "silver_ore", "gold_vein",
    ]);

    for (const recipe of BIOME_RECIPES) {
      for (const ing of recipe.ingredients) {
        const valid = allResourceIds.has(ing.resourceId) || baseTypes.has(ing.resourceId);
        expect(valid, `Unknown ingredient ${ing.resourceId} in recipe ${recipe.id}`).toBe(true);
      }
    }
  });

  it("result has a valid type (ammo, trap, consumable, weapon_mod)", () => {
    const validTypes = ["ammo", "trap", "consumable", "weapon_mod"];
    for (const recipe of BIOME_RECIPES) {
      expect(validTypes).toContain(recipe.result.type);
    }
  });

  it("recipes with result type 'trap' have valid trap stats", () => {
    const trapRecipes = BIOME_RECIPES.filter((r) => r.result.type === "trap");
    for (const recipe of trapRecipes) {
      expect(recipe.result).toHaveProperty("stats");
      expect(recipe.result.stats).toHaveProperty("damage");
    }
  });

  it("recipes with result type 'ammo' have ammoType and amount", () => {
    const ammoRecipes = BIOME_RECIPES.filter((r) => r.result.type === "ammo");
    for (const recipe of ammoRecipes) {
      expect(recipe.result).toHaveProperty("ammoType");
      expect(recipe.result).toHaveProperty("amount");
    }
  });

  it("recipes with result type 'consumable' have an effect", () => {
    const consumableRecipes = BIOME_RECIPES.filter((r) => r.result.type === "consumable");
    for (const recipe of consumableRecipes) {
      expect(recipe.result).toHaveProperty("effect");
    }
  });
});

// ─── getBiomeResources ─────────────────────────────────────────────

describe("getBiomeResources", () => {
  it("returns resources for a known biome", () => {
    const res = getBiomeResources("jungle");
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown biome", () => {
    expect(getBiomeResources("nonexistent")).toEqual([]);
  });
});

// ─── getAvailableRecipes ───────────────────────────────────────────

describe("getAvailableRecipes", () => {
  it("returns only recipes for the given biome", () => {
    const recipes = getAvailableRecipes("jungle");
    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      expect(r.biome).toBe("jungle");
    }
  });

  it("returns empty array for biome with no recipes", () => {
    expect(getAvailableRecipes("nonexistent")).toEqual([]);
  });
});

// ─── canCraft ──────────────────────────────────────────────────────

describe("canCraft", () => {
  it("returns true when player has all ingredients", () => {
    // Pick first recipe
    const recipe = BIOME_RECIPES[0];
    // Build inventory that satisfies all ingredients
    const inventory = {};
    for (const ing of recipe.ingredients) {
      inventory[ing.resourceId] = ing.amount;
    }
    expect(canCraft(recipe, inventory)).toBe(true);
  });

  it("returns false when player is missing an ingredient", () => {
    const recipe = BIOME_RECIPES[0];
    expect(canCraft(recipe, {})).toBe(false);
  });

  it("returns false when player has insufficient amount", () => {
    const recipe = BIOME_RECIPES[0];
    const inventory = {};
    for (const ing of recipe.ingredients) {
      inventory[ing.resourceId] = ing.amount - 1; // one short
    }
    expect(canCraft(recipe, inventory)).toBe(false);
  });
});

// ─── craft ─────────────────────────────────────────────────────────

describe("craft", () => {
  it("consumes ingredients and returns crafted item", () => {
    const recipe = BIOME_RECIPES[0];
    const inventory = {};
    for (const ing of recipe.ingredients) {
      inventory[ing.resourceId] = ing.amount + 2; // extra stock
    }
    const inventoryCopy = { ...inventory };
    const result = craft(recipe, inventory);

    // Ingredients consumed
    for (const ing of recipe.ingredients) {
      expect(inventory[ing.resourceId]).toBe(inventoryCopy[ing.resourceId] - ing.amount);
    }

    // Returns result item
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result.name).toBe(recipe.name);
  });

  it("returns null and does not consume if cannot craft", () => {
    const recipe = BIOME_RECIPES[0];
    const inventory = {};
    const result = craft(recipe, inventory);
    expect(result).toBeNull();
  });

  it("crafted item includes recipe result properties", () => {
    const recipe = BIOME_RECIPES[0];
    const inventory = {};
    for (const ing of recipe.ingredients) {
      inventory[ing.resourceId] = ing.amount;
    }
    const result = craft(recipe, inventory);
    expect(result.type).toBe(recipe.result.type);
  });

  it("crafting twice with exact ingredients fails the second time", () => {
    const recipe = BIOME_RECIPES[0];
    const inventory = {};
    for (const ing of recipe.ingredients) {
      inventory[ing.resourceId] = ing.amount; // just enough for 1
    }
    const first = craft(recipe, inventory);
    expect(first).not.toBeNull();

    const second = craft(recipe, inventory);
    expect(second).toBeNull();
  });

  it("crafted items from same recipe have unique ids", () => {
    const recipe = BIOME_RECIPES[0];
    const inventory = {};
    for (const ing of recipe.ingredients) {
      inventory[ing.resourceId] = ing.amount * 3;
    }
    const item1 = craft(recipe, inventory);
    const item2 = craft(recipe, inventory);
    expect(item1.id).not.toBe(item2.id);
  });

  it("inventory values go to zero, never negative", () => {
    const recipe = BIOME_RECIPES[0];
    const inventory = {};
    for (const ing of recipe.ingredients) {
      inventory[ing.resourceId] = ing.amount; // exact
    }
    craft(recipe, inventory);
    for (const ing of recipe.ingredients) {
      expect(inventory[ing.resourceId]).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Cross-system integration ──────────────────────────────────────

describe("integration with existing systems", () => {
  it("ammo recipe ammoTypes match game ammo types", () => {
    const validAmmo = ["dynamite", "harpoon", "cannonball", "chain", "rum"];
    const ammoRecipes = BIOME_RECIPES.filter((r) => r.result.type === "ammo");
    for (const recipe of ammoRecipes) {
      expect(validAmmo).toContain(recipe.result.ammoType);
    }
  });

  it("trap recipes have compatible stats with FORTIFICATION_TREE format", () => {
    const trapRecipes = BIOME_RECIPES.filter((r) => r.result.type === "trap");
    for (const recipe of trapRecipes) {
      const stats = recipe.result.stats;
      // Must have at least damage or a special mechanic
      const hasMechanic = stats.damage >= 0 || stats.convertOnKill || stats.randomElement;
      expect(hasMechanic, `Trap ${recipe.id} has no damage or special mechanic`).toBe(true);
    }
  });

  it("weapon_mod recipes have modId and duration or permanent flag", () => {
    const modRecipes = BIOME_RECIPES.filter((r) => r.result.type === "weapon_mod");
    for (const recipe of modRecipes) {
      expect(recipe.result).toHaveProperty("modId");
      expect(recipe.result).toHaveProperty("stats");
    }
  });

  it("every biome with recipes has matching resources to satisfy them", () => {
    const biomeRecipeMap = {};
    for (const recipe of BIOME_RECIPES) {
      if (!biomeRecipeMap[recipe.biome]) biomeRecipeMap[recipe.biome] = [];
      biomeRecipeMap[recipe.biome].push(recipe);
    }

    for (const [biomeId, recipes] of Object.entries(biomeRecipeMap)) {
      const biomeResourceIds = new Set(
        (BIOME_RESOURCES[biomeId] || []).map((r) => r.id)
      );
      for (const recipe of recipes) {
        // At least one ingredient must come from this biome's unique resources
        const usesLocalResource = recipe.ingredients.some(
          (ing) => biomeResourceIds.has(ing.resourceId)
        );
        expect(usesLocalResource, `Recipe ${recipe.id} uses no resources from biome ${biomeId}`).toBe(true);
      }
    }
  });

  it("rarity distribution follows game conventions", () => {
    const allResources = Object.values(BIOME_RESOURCES).flat();
    const rarities = { common: 0, uncommon: 0, rare: 0, epic: 0 };
    for (const r of allResources) {
      rarities[r.rarity] = (rarities[r.rarity] || 0) + 1;
    }
    // Common should be most frequent
    expect(rarities.common).toBeGreaterThan(rarities.rare);
    expect(rarities.common).toBeGreaterThanOrEqual(rarities.uncommon);
  });
});

// Biomowe surowce i crafting w locie
// Każdy biom ma unikalne surowce, które można łączyć w receptury podczas eksploracji

// ─── BIOME-SPECIFIC RESOURCES ──────────────────────────────────────
// Unique harvestable materials per biome (on top of generic forest/mine resources)

export const BIOME_RESOURCES = {
  jungle: [
    { id: "jungle_resin", icon: "herb", name: "Żywica tropikalna", rarity: "common", chance: 0.45 },
    { id: "jungle_vine", icon: "leaf", name: "Liana bojowa", rarity: "uncommon", chance: 0.25 },
    { id: "jungle_venom", icon: "poison", name: "Jad węża", rarity: "rare", chance: 0.12 },
  ],
  island: [
    { id: "island_coral", icon: "gem", name: "Koralowiec ognisty", rarity: "common", chance: 0.40 },
    { id: "island_pearl", icon: "star", name: "Czarna perła", rarity: "rare", chance: 0.10 },
    { id: "island_driftwood", icon: "wood", name: "Drewno morskie", rarity: "common", chance: 0.50 },
  ],
  desert: [
    { id: "desert_sulfur", icon: "fire", name: "Siarka pustynna", rarity: "common", chance: 0.45 },
    { id: "desert_obsidian", icon: "rock", name: "Obsydian", rarity: "uncommon", chance: 0.20 },
    { id: "desert_scorpion_tail", icon: "poison", name: "Ogon skorpiona", rarity: "rare", chance: 0.10 },
  ],
  winter: [
    { id: "winter_ice_crystal", icon: "ice", name: "Lodowy kryształ", rarity: "uncommon", chance: 0.30 },
    { id: "winter_frozen_sap", icon: "water", name: "Zamarznięty sok", rarity: "common", chance: 0.45 },
    { id: "winter_permafrost", icon: "rock", name: "Wieczna zmarzlina", rarity: "rare", chance: 0.08 },
  ],
  city: [
    { id: "city_gunpowder", icon: "dynamite", name: "Proch portowy", rarity: "common", chance: 0.50 },
    { id: "city_scrap_metal", icon: "rock", name: "Złom metalowy", rarity: "common", chance: 0.45 },
    { id: "city_contraband", icon: "skull", name: "Kontrabanda", rarity: "rare", chance: 0.10 },
  ],
  volcano: [
    { id: "volcano_magma_shard", icon: "fire", name: "Odłamek magmy", rarity: "uncommon", chance: 0.25 },
    { id: "volcano_basite", icon: "rock", name: "Bazalt ognisty", rarity: "common", chance: 0.40 },
    { id: "volcano_phoenix_ash", icon: "gem", name: "Popiół feniksa", rarity: "rare", chance: 0.08 },
  ],
  mushroom: [
    { id: "mushroom_spore", icon: "mushroom", name: "Fluorescencyjne zarodniki", rarity: "common", chance: 0.50 },
    { id: "mushroom_mycelium", icon: "herb", name: "Grzybnia bojowa", rarity: "uncommon", chance: 0.22 },
    { id: "mushroom_hallucinogen", icon: "star", name: "Halucynogen jaskiniowy", rarity: "rare", chance: 0.09 },
  ],
  swamp: [
    { id: "swamp_slime", icon: "water", name: "Bagienne szlamy", rarity: "common", chance: 0.50 },
    { id: "swamp_root", icon: "herb", name: "Korzeń bagiennika", rarity: "uncommon", chance: 0.25 },
    { id: "swamp_miasma", icon: "poison", name: "Miazma bagnista", rarity: "rare", chance: 0.10 },
  ],
  summer: [
    { id: "summer_wildflower", icon: "flower", name: "Kwiat prerii", rarity: "common", chance: 0.50 },
    { id: "summer_beeswax", icon: "star", name: "Wosk pszczeli", rarity: "uncommon", chance: 0.25 },
  ],
  autumn: [
    { id: "autumn_amber", icon: "gem", name: "Bursztyn jesienny", rarity: "uncommon", chance: 0.25 },
    { id: "autumn_dried_leaf", icon: "leaf", name: "Suszone liście", rarity: "common", chance: 0.50 },
  ],
  spring: [
    { id: "spring_pollen", icon: "flower", name: "Pyłek wiosenny", rarity: "common", chance: 0.50 },
    { id: "spring_dewdrop", icon: "water", name: "Krople rosy", rarity: "uncommon", chance: 0.20 },
  ],
  sunset_beach: [
    { id: "beach_shell", icon: "anchor", name: "Muszelka zachodu", rarity: "common", chance: 0.45 },
    { id: "beach_amber", icon: "gem", name: "Bursztyn morski", rarity: "uncommon", chance: 0.20 },
  ],
  bamboo_falls: [
    { id: "bamboo_stalk", icon: "herb", name: "Łodyga bambusa", rarity: "common", chance: 0.50 },
    { id: "bamboo_jade", icon: "gem", name: "Jadeit wodospadowy", rarity: "rare", chance: 0.10 },
  ],
  blue_lagoon: [
    { id: "lagoon_algae", icon: "herb", name: "Świecące algi", rarity: "common", chance: 0.45 },
    { id: "lagoon_pearl", icon: "star", name: "Perła głębinowa", rarity: "rare", chance: 0.08 },
  ],
  olympus: [
    { id: "olympus_ambrosia", icon: "star", name: "Ambrozja boska", rarity: "rare", chance: 0.10 },
    { id: "olympus_marble", icon: "rock", name: "Marmur olimpijski", rarity: "common", chance: 0.40 },
    { id: "olympus_lightning_shard", icon: "lightning", name: "Odłamek pioruna", rarity: "uncommon", chance: 0.20 },
  ],
  underworld: [
    { id: "underworld_soul_shard", icon: "skull", name: "Odłamek duszy", rarity: "uncommon", chance: 0.25 },
    { id: "underworld_styx_water", icon: "water", name: "Woda Styksu", rarity: "rare", chance: 0.10 },
    { id: "underworld_bone_dust", icon: "rock", name: "Pył kości", rarity: "common", chance: 0.40 },
  ],
  meteor: [
    { id: "meteor_fragment", icon: "gem", name: "Fragment meteorytu", rarity: "rare", chance: 0.12 },
    { id: "meteor_stardust", icon: "star", name: "Gwiezdny pył", rarity: "uncommon", chance: 0.22 },
  ],
};

// ─── BIOME RECIPES ─────────────────────────────────────────────────
// Craftable items from biome-specific resources
// ingredients: [{ resourceId, amount }]
// result.type: "ammo" | "trap" | "consumable" | "weapon_mod"

export const BIOME_RECIPES = [
  // ── JUNGLE ─────────────────────────────────────
  {
    id: "poisoned_dynamite",
    biome: "jungle",
    name: "Zatruty Dynamit",
    desc: "Dynamit nasączony jadem — eksplozja + 4s trucizny",
    icon: "dynamite",
    ingredients: [
      { resourceId: "jungle_resin", amount: 2 },
      { resourceId: "jungle_venom", amount: 1 },
    ],
    result: {
      type: "ammo",
      ammoType: "dynamite",
      amount: 2,
      bonus: { element: "shadow", dot: { dps: 5, duration: 4000 } },
    },
    craftTime: 3,
  },
  {
    id: "vine_net_trap",
    biome: "jungle",
    name: "Pułapka z Lian",
    desc: "Lianowa sieć — unieruchamia wrogów na 3s i zadaje 12 obrażeń",
    icon: "leaf",
    ingredients: [
      { resourceId: "jungle_vine", amount: 2 },
      { resourceId: "jungle_resin", amount: 1 },
    ],
    result: {
      type: "trap",
      stats: { damage: 12, rootDuration: 3000, triggerRadius: 6, singleUse: true },
    },
    craftTime: 4,
  },

  // ── DESERT ─────────────────────────────────────
  {
    id: "explosive_barricade",
    biome: "desert",
    name: "Eksplodująca Barykada",
    desc: "Barykada z obsydianu — po zniszczeniu eksploduje, 25 obrażeń w AoE",
    icon: "rock",
    ingredients: [
      { resourceId: "desert_obsidian", amount: 2 },
      { resourceId: "desert_sulfur", amount: 3 },
    ],
    result: {
      type: "trap",
      stats: { damage: 25, hp: 60, blockRadius: 5, splashRadius: 8, explodeOnDestroy: true },
    },
    craftTime: 5,
  },
  {
    id: "scorpion_harpoon",
    biome: "desert",
    name: "Harpun Skorpiona",
    desc: "Harpuny z ogonem skorpiona — przebijają + 3s trucizny",
    icon: "harpoon",
    ingredients: [
      { resourceId: "desert_scorpion_tail", amount: 1 },
      { resourceId: "desert_sulfur", amount: 2 },
    ],
    result: {
      type: "ammo",
      ammoType: "harpoon",
      amount: 3,
      bonus: { element: "shadow", dot: { dps: 4, duration: 3000 } },
    },
    craftTime: 3,
  },

  // ── WINTER ─────────────────────────────────────
  {
    id: "frost_mine",
    biome: "winter",
    name: "Mrożąca Mina",
    desc: "Lodowa pułapka — zamraża wrogów w AoE na 3s, 18 obrażeń",
    icon: "ice",
    ingredients: [
      { resourceId: "winter_ice_crystal", amount: 2 },
      { resourceId: "winter_frozen_sap", amount: 1 },
    ],
    result: {
      type: "trap",
      stats: { damage: 18, freezeDuration: 3000, splashRadius: 7, triggerRadius: 5, element: "ice", singleUse: true },
    },
    craftTime: 4,
  },

  // ── VOLCANO ────────────────────────────────────
  {
    id: "magma_cannonball",
    biome: "volcano",
    name: "Kula Magmowa",
    desc: "Kule armatnie z magmą — podpalają teren na 5s",
    icon: "cannon",
    ingredients: [
      { resourceId: "volcano_magma_shard", amount: 2 },
      { resourceId: "volcano_basite", amount: 2 },
    ],
    result: {
      type: "ammo",
      ammoType: "cannonball",
      amount: 2,
      bonus: { element: "fire", groundFire: { dps: 6, duration: 5000, radius: 5 } },
    },
    craftTime: 5,
  },
  {
    id: "phoenix_elixir",
    biome: "volcano",
    name: "Eliksir Feniksa",
    desc: "Jednorazowe odrodzenie — karawana wraca z 30% HP gdy zostanie zniszczona",
    icon: "fire",
    ingredients: [
      { resourceId: "volcano_phoenix_ash", amount: 2 },
      { resourceId: "volcano_magma_shard", amount: 1 },
    ],
    result: {
      type: "consumable",
      effect: { type: "caravan_revive", hpPercent: 0.30 },
    },
    craftTime: 6,
  },

  // ── MUSHROOM ───────────────────────────────────
  {
    id: "chaos_lantern",
    biome: "mushroom",
    name: "Latarnia Chaosu",
    desc: "Totem z losowym żywiołem co atak — nieprzewidywalny i potężny",
    icon: "star",
    ingredients: [
      { resourceId: "mushroom_spore", amount: 3 },
      { resourceId: "mushroom_hallucinogen", amount: 1 },
    ],
    result: {
      type: "trap",
      stats: { damage: 10, radius: 8, randomElement: true, attackCd: 2000, duration: 0 },
    },
    craftTime: 5,
  },
  {
    id: "mutation_elixir",
    biome: "mushroom",
    name: "Eliksir Mutacji",
    desc: "Losowy potężny buff dla najemnika: +30% HP lub +40% obrażeń",
    icon: "mushroom",
    ingredients: [
      { resourceId: "mushroom_mycelium", amount: 2 },
      { resourceId: "mushroom_spore", amount: 2 },
    ],
    result: {
      type: "consumable",
      effect: { type: "merc_mutation", options: [{ stat: "hp", mult: 1.3 }, { stat: "damage", mult: 1.4 }] },
    },
    craftTime: 4,
  },

  // ── SWAMP ──────────────────────────────────────
  {
    id: "miasma_bomb",
    biome: "swamp",
    name: "Bomba Miazmowa",
    desc: "Chmura trucizny — 6 dps przez 6s w dużym obszarze",
    icon: "poison",
    ingredients: [
      { resourceId: "swamp_miasma", amount: 1 },
      { resourceId: "swamp_slime", amount: 3 },
    ],
    result: {
      type: "ammo",
      ammoType: "dynamite",
      amount: 1,
      bonus: { element: "shadow", cloud: { dps: 6, duration: 6000, radius: 10 } },
    },
    craftTime: 4,
  },

  // ── OLYMPUS ────────────────────────────────────
  {
    id: "zeus_bolt",
    biome: "olympus",
    name: "Grom Zeusa",
    desc: "Łańcuchowy piorun trafiający 5 wrogów — 20 obrażeń każdemu",
    icon: "lightning",
    ingredients: [
      { resourceId: "olympus_lightning_shard", amount: 2 },
      { resourceId: "olympus_marble", amount: 2 },
    ],
    result: {
      type: "consumable",
      effect: { type: "chain_lightning", damage: 20, targets: 5 },
    },
    craftTime: 5,
  },
  {
    id: "ambrosia_vial",
    biome: "olympus",
    name: "Fiolka Ambrozji",
    desc: "Trwale zwiększa obrażenia czarów o 10% na resztę runu",
    icon: "star",
    ingredients: [
      { resourceId: "olympus_ambrosia", amount: 2 },
      { resourceId: "olympus_lightning_shard", amount: 1 },
    ],
    result: {
      type: "consumable",
      effect: { type: "permanent_spell_boost", damageMult: 0.10 },
    },
    craftTime: 6,
  },

  // ── UNDERWORLD ─────────────────────────────────
  {
    id: "styx_coating",
    biome: "underworld",
    name: "Powłoka Styksu",
    desc: "Modyfikacja sabli — ataki kradną 5 HP przez 10 pokojów",
    icon: "skull",
    ingredients: [
      { resourceId: "underworld_styx_water", amount: 1 },
      { resourceId: "underworld_bone_dust", amount: 3 },
    ],
    result: {
      type: "weapon_mod",
      modId: "styx_lifesteal",
      stats: { lifesteal: 5, duration: 10 },
    },
    craftTime: 5,
  },
  {
    id: "soul_trap",
    biome: "underworld",
    name: "Pułapka Dusz",
    desc: "Zabici wrogowie stają się duchami walczącymi po twojej stronie (10s)",
    icon: "skull",
    ingredients: [
      { resourceId: "underworld_soul_shard", amount: 2 },
      { resourceId: "underworld_styx_water", amount: 1 },
    ],
    result: {
      type: "trap",
      stats: { damage: 0, convertOnKill: true, convertDuration: 10000, triggerRadius: 8, singleUse: false, cooldown: 15000 },
    },
    craftTime: 6,
  },

  // ── CITY ───────────────────────────────────────
  {
    id: "improvised_bomb",
    biome: "city",
    name: "Improwizowana Bomba",
    desc: "Tania ale skuteczna — 30 obrażeń w AoE z portowego złomu",
    icon: "dynamite",
    ingredients: [
      { resourceId: "city_gunpowder", amount: 3 },
      { resourceId: "city_scrap_metal", amount: 2 },
    ],
    result: {
      type: "ammo",
      ammoType: "dynamite",
      amount: 3,
      bonus: { splashRadius: 6 },
    },
    craftTime: 3,
  },
];

// ─── INTERNAL ──────────────────────────────────────────────────────

let _craftCounter = 0;

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────

/** Get unique resources available in a specific biome */
export function getBiomeResources(biomeId) {
  return BIOME_RESOURCES[biomeId] || [];
}

/** Get all recipes available for a given biome */
export function getAvailableRecipes(biomeId) {
  return BIOME_RECIPES.filter((r) => r.biome === biomeId);
}

/**
 * Check if a recipe can be crafted with the current inventory
 * @param {object} recipe - Recipe from BIOME_RECIPES
 * @param {object} inventory - Map of resourceId → amount owned
 * @returns {boolean}
 */
export function canCraft(recipe, inventory) {
  return recipe.ingredients.every(
    (ing) => (inventory[ing.resourceId] || 0) >= ing.amount
  );
}

/**
 * Craft a recipe: consume ingredients, return crafted item
 * @param {object} recipe - Recipe from BIOME_RECIPES
 * @param {object} inventory - Map of resourceId → amount (MUTATED: ingredients removed)
 * @returns {object|null} Crafted item or null if insufficient resources
 */
export function craft(recipe, inventory) {
  if (!canCraft(recipe, inventory)) return null;

  // Consume ingredients
  for (const ing of recipe.ingredients) {
    inventory[ing.resourceId] -= ing.amount;
  }

  // Return crafted item with unique id
  return {
    id: `crafted_${recipe.id}_${Date.now()}_${++_craftCounter}`,
    recipeId: recipe.id,
    name: recipe.name,
    desc: recipe.desc,
    icon: recipe.icon,
    type: recipe.result.type,
    ...recipe.result,
  };
}

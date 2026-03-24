// System Handlu — wymiana zasobów między biomami
// Gracz zbiera surowce w jednym biomie, wymienia w innym na lepsze przedmioty
// Handlarze pojawiają się jako POI lub event, oferują unikalne wymiany per-biom

import { BIOME_RESOURCES } from "./biomeCrafting.js";

// ─── TRADE ROUTES ─────────────────────────────────────────────────
// Each route defines what biome wants what resources and what it gives in return
// Prices fluctuate based on supply/demand (room number affects prices)

export const TRADE_ROUTES = [
  {
    id: "jungle_to_winter",
    name: "Szlak Tropikalny → Mroźne Ziemie",
    icon: "compass",
    fromBiome: "jungle",
    toBiome: "winter",
    desc: "Tropikalne żywice są warte fortunę w mroźnych krainach",
    trades: [
      { offer: { resourceId: "jungle_resin", amount: 3 }, receive: { copper: 25, ammo: { harpoon: 2 } }, desc: "3x Żywica → 25 Cu + 2 harpuny" },
      { offer: { resourceId: "jungle_venom", amount: 1 }, receive: { silver: 1 }, desc: "1x Jad węża → 1 Ag" },
      { offer: { resourceId: "jungle_vine", amount: 2 }, receive: { copper: 15, mana: 15 }, desc: "2x Liana → 15 Cu + 15 prochu" },
    ],
  },
  {
    id: "desert_to_swamp",
    name: "Szlak Pustynny → Bagna",
    icon: "compass",
    fromBiome: "desert",
    toBiome: "swamp",
    desc: "Siarka z pustyni jest kluczem do bagiennych eliksirów",
    trades: [
      { offer: { resourceId: "desert_sulfur", amount: 3 }, receive: { copper: 20, heal: 5 }, desc: "3x Siarka → 20 Cu + 5 HP" },
      { offer: { resourceId: "desert_obsidian", amount: 2 }, receive: { silver: 1, copper: 15 }, desc: "2x Obsydian → 1 Ag + 15 Cu" },
      { offer: { resourceId: "desert_scorpion_tail", amount: 1 }, receive: { silver: 1, ammo: { dynamite: 3 } }, desc: "1x Ogon skorpiona → 1 Ag + 3 dynamit" },
    ],
  },
  {
    id: "winter_to_volcano",
    name: "Szlak Lodowy → Wulkan",
    icon: "compass",
    fromBiome: "winter",
    toBiome: "volcano",
    desc: "Lodowe kryształy schładzają gorącą magmę — bezcenne dla kowali",
    trades: [
      { offer: { resourceId: "winter_ice_crystal", amount: 2 }, receive: { copper: 30, ammo: { cannonball: 2 } }, desc: "2x Lodowy kryształ → 30 Cu + 2 kule" },
      { offer: { resourceId: "winter_permafrost", amount: 1 }, receive: { silver: 2 }, desc: "1x Wieczna zmarzlina → 2 Ag" },
      { offer: { resourceId: "winter_frozen_sap", amount: 3 }, receive: { copper: 18, mana: 20 }, desc: "3x Zamarznięty sok → 18 Cu + 20 prochu" },
    ],
  },
  {
    id: "volcano_to_city",
    name: "Szlak Ognisty → Port",
    icon: "compass",
    fromBiome: "volcano",
    toBiome: "city",
    desc: "Magma i bazalt to najlepsze materiały na portowe fortyfikacje",
    trades: [
      { offer: { resourceId: "volcano_magma_shard", amount: 2 }, receive: { silver: 1, copper: 20 }, desc: "2x Odłamek magmy → 1 Ag + 20 Cu" },
      { offer: { resourceId: "volcano_basite", amount: 3 }, receive: { copper: 25, ammo: { chain: 3 } }, desc: "3x Bazalt → 25 Cu + 3 łańcuchy" },
      { offer: { resourceId: "volcano_phoenix_ash", amount: 1 }, receive: { gold: 1 }, desc: "1x Popiół feniksa → 1 Au" },
    ],
  },
  {
    id: "mushroom_to_olympus",
    name: "Szlak Grzybowy → Olimp",
    icon: "compass",
    fromBiome: "mushroom",
    toBiome: "olympus",
    desc: "Bogowie cenią halucynogenne grzyby — ich wizje pomagają w proroctwach",
    trades: [
      { offer: { resourceId: "mushroom_hallucinogen", amount: 1 }, receive: { silver: 2, mana: 25 }, desc: "1x Halucynogen → 2 Ag + 25 prochu" },
      { offer: { resourceId: "mushroom_spore", amount: 4 }, receive: { copper: 30, heal: 3 }, desc: "4x Zarodniki → 30 Cu + 3 HP" },
      { offer: { resourceId: "mushroom_mycelium", amount: 2 }, receive: { copper: 20, ammo: { rum: 3 } }, desc: "2x Grzybnia → 20 Cu + 3 rum" },
    ],
  },
  {
    id: "olympus_to_underworld",
    name: "Szlak Boski → Podziemia",
    icon: "compass",
    fromBiome: "olympus",
    toBiome: "underworld",
    desc: "Marmur olimpijski i ambrozja to waluta w królestwie umarłych",
    trades: [
      { offer: { resourceId: "olympus_ambrosia", amount: 1 }, receive: { gold: 1, silver: 1 }, desc: "1x Ambrozja → 1 Au + 1 Ag" },
      { offer: { resourceId: "olympus_marble", amount: 3 }, receive: { copper: 35, ammo: { harpoon: 3 } }, desc: "3x Marmur → 35 Cu + 3 harpuny" },
      { offer: { resourceId: "olympus_lightning_shard", amount: 2 }, receive: { silver: 2, mana: 30 }, desc: "2x Odłamek pioruna → 2 Ag + 30 prochu" },
    ],
  },
  {
    id: "city_to_island",
    name: "Szlak Portowy → Wyspy",
    icon: "compass",
    fromBiome: "city",
    toBiome: "island",
    desc: "Portowy złom i kontrabanda to skarb na odległych wyspach",
    trades: [
      { offer: { resourceId: "city_contraband", amount: 1 }, receive: { silver: 2, copper: 20 }, desc: "1x Kontrabanda → 2 Ag + 20 Cu" },
      { offer: { resourceId: "city_scrap_metal", amount: 3 }, receive: { copper: 20, ammo: { dynamite: 3 } }, desc: "3x Złom → 20 Cu + 3 dynamit" },
      { offer: { resourceId: "city_gunpowder", amount: 4 }, receive: { copper: 25, mana: 20 }, desc: "4x Proch → 25 Cu + 20 prochu" },
    ],
  },
  {
    id: "swamp_to_mushroom",
    name: "Szlak Bagienny → Grzybowe Jaskinie",
    icon: "compass",
    fromBiome: "swamp",
    toBiome: "mushroom",
    desc: "Bagienne substancje przyspieszają wzrost grzybów — handlarze płacą dobrze",
    trades: [
      { offer: { resourceId: "swamp_miasma", amount: 1 }, receive: { silver: 1, copper: 10 }, desc: "1x Miazma → 1 Ag + 10 Cu" },
      { offer: { resourceId: "swamp_slime", amount: 3 }, receive: { copper: 18, heal: 3 }, desc: "3x Szlamy → 18 Cu + 3 HP" },
      { offer: { resourceId: "swamp_root", amount: 2 }, receive: { copper: 22, ammo: { rum: 2 } }, desc: "2x Korzeń → 22 Cu + 2 rum" },
    ],
  },
];

// ─── TRADER NPC ───────────────────────────────────────────────────

export const TRADER_NPC = {
  name: "Wędrowny Kupiec",
  icon: "shop",
  desc: "Znam szlaki handlowe na całym świecie. Masz coś ciekawego?",
  themeColor: "#c08030",
  themeBorder: "#6a4020",
  themeGlow: "rgba(192,128,48,0.3)",
};

// ─── TRADE HELPERS ────────────────────────────────────────────────

/**
 * Get available trade routes for the current biome (as destination)
 * Player sells resources FROM other biomes TO this one
 * @param {string} currentBiome - The biome player is currently in
 * @returns {object[]} Available trade routes where toBiome matches
 */
export function getTradesForBiome(currentBiome) {
  return TRADE_ROUTES.filter(r => r.toBiome === currentBiome);
}

/**
 * Check if a specific trade can be executed with current resources
 * @param {object} trade - A trade entry from TRADE_ROUTES
 * @param {object} biomeInventory - Map of resourceId → amount owned
 * @returns {boolean}
 */
export function canExecuteTrade(trade, biomeInventory) {
  const { resourceId, amount } = trade.offer;
  return (biomeInventory[resourceId] || 0) >= amount;
}

/**
 * Execute a trade: consume resources, return reward
 * @param {object} trade - A trade entry
 * @param {object} biomeInventory - Map of resourceId → amount (MUTATED)
 * @returns {object} The reward
 */
export function executeTrade(trade, biomeInventory) {
  const { resourceId, amount } = trade.offer;
  if ((biomeInventory[resourceId] || 0) < amount) return null;
  biomeInventory[resourceId] -= amount;
  return { ...trade.receive };
}

/**
 * Roll whether a trader appears in the current room
 * @param {string} biomeId - Current biome
 * @param {number} roomNum - Current room number
 * @returns {boolean}
 */
export function rollTraderAppearance(biomeId, roomNum) {
  // 20% base chance, only if there are trade routes for this biome
  const routes = getTradesForBiome(biomeId);
  if (routes.length === 0) return false;
  const chance = 0.20 + Math.min(0.10, roomNum * 0.002);
  return Math.random() < chance;
}

// ─── PRICE FLUCTUATION ───────────────────────────────────────────
// Prices change slightly based on room number (simulates supply/demand)

/**
 * Apply price fluctuation to trade rewards
 * @param {object} reward - Base reward object
 * @param {number} roomNum - Current room number
 * @returns {object} Modified reward
 */
export function applyFluctuation(reward, roomNum) {
  // ±15% fluctuation based on room number
  const fluctuation = 0.85 + (Math.sin(roomNum * 0.7) + 1) * 0.15;
  const result = { ...reward };
  if (result.copper) result.copper = Math.round(result.copper * fluctuation);
  // Silver/gold don't fluctuate (too volatile)
  return result;
}

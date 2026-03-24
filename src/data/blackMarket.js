// Czarny Rynek — rzadki tajny sklep z potężnymi, przeklętymi przedmiotami
// Pojawia się losowo jako event, wymagając hasła lub znaku rozpoznawczego
// Oferuje unikalne przedmioty niedostępne nigdzie indziej

// ─── BLACK MARKET VENUE ───────────────────────────────────────────

export const BLACK_MARKET = {
  name: "Czarny Rynek",
  icon: "skull",
  desc: "Kaptur zasłania twarz handlarza. Towary wyglądają podejrzanie... i potężnie.",
  themeColor: "#2a1a2a",
  themeBorder: "#1a0a1a",
  themeGlow: "rgba(100,40,120,0.5)",
  // Appearance chance per travel (lower than normal events)
  appearChance: 0.08,
  // Increases by 2% per room after room 5
  roomScaling: 0.02,
  minRoom: 5,
};

// ─── BLACK MARKET ITEMS ───────────────────────────────────────────
// Cursed but powerful items — each has a benefit AND a drawback

export const BLACK_MARKET_ITEMS = [
  // ── WEAPONS ──
  {
    id: "bm_shadow_blade",
    name: "Ostrze Cienia",
    icon: "swords",
    desc: "+30% obrażeń, ale karawana traci 2 HP co pokój",
    category: "weapon",
    rarity: "epic",
    cost: { silver: 3 },
    benefit: { dmgBuff: 0.30, permanent: true },
    drawback: { caravanDmgPerRoom: 2 },
    color: "#6030a0",
  },
  {
    id: "bm_blood_cannon",
    name: "Krwawy Kanon",
    icon: "cannon",
    desc: "Kule armatnie zadają x2 obrażeń, ale kosztują 5 HP karawany za strzał",
    category: "weapon",
    rarity: "epic",
    cost: { silver: 4 },
    benefit: { cannonballDmgMult: 2.0 },
    drawback: { hpPerCannonball: 5 },
    color: "#a02020",
  },
  {
    id: "bm_void_harpoon",
    name: "Harpun Pustki",
    icon: "harpoon",
    desc: "Harpuny przebijają wszystkich wrogów na linii, ale -20% celności",
    category: "weapon",
    rarity: "rare",
    cost: { silver: 2, copper: 50 },
    benefit: { harpoonPierceAll: true },
    drawback: { accuracyMult: 0.80 },
    color: "#303060",
  },

  // ── ARMOR / DEFENSE ──
  {
    id: "bm_bone_armor",
    name: "Pancerz z Kości",
    icon: "shield",
    desc: "+5 pancerza karawany, ale najemnicy mają -20% HP",
    category: "defense",
    rarity: "rare",
    cost: { silver: 3 },
    benefit: { caravanArmor: 5 },
    drawback: { mercHpMult: 0.80 },
    color: "#8a7a5a",
  },
  {
    id: "bm_cursed_shield",
    name: "Przeklęta Tarcza",
    icon: "shield",
    desc: "50% szans na zablokowanie ataku, ale blokowany atak uderza losowego najemnika",
    category: "defense",
    rarity: "epic",
    cost: { silver: 4 },
    benefit: { blockChance: 0.50 },
    drawback: { blockRedirectToMerc: true },
    color: "#604080",
  },

  // ── CONSUMABLES ──
  {
    id: "bm_demon_rum",
    name: "Rum Demonów",
    icon: "pirateRaid",
    desc: "Najemnicy wpadają w szał: x2 obrażeń i x2 prędkość ataku na 3 pokoje, potem -50% na 2",
    category: "consumable",
    rarity: "rare",
    cost: { copper: 80 },
    benefit: { mercDmgMult: 2.0, mercAtkSpeedMult: 2.0, duration: 3 },
    drawback: { afterEffect: { mercDmgMult: 0.5, mercAtkSpeedMult: 0.5, duration: 2 } },
    color: "#c04040",
  },
  {
    id: "bm_chaos_elixir",
    name: "Eliksir Chaosu",
    icon: "star",
    desc: "Losowy permanentny efekt: +20% obrażeń LUB -20% obrażeń. Szczęście decyduje.",
    category: "consumable",
    rarity: "rare",
    cost: { silver: 1 },
    benefit: { randomPermBuff: { chance: 0.6, buff: { dmgMult: 1.20 } } },
    drawback: { randomPermDebuff: { chance: 0.4, debuff: { dmgMult: 0.80 } } },
    color: "#e040e0",
  },
  {
    id: "bm_soul_potion",
    name: "Mikstura Dusz",
    icon: "ghost",
    desc: "+50 max prochu permanentnie, ale duchowy szept: -10% inicjatywy ze źródeł",
    category: "consumable",
    rarity: "epic",
    cost: { silver: 3, copper: 50 },
    benefit: { permMaxMana: 50 },
    drawback: { initiativeMult: 0.90 },
    color: "#4060a0",
  },

  // ── RELICS ──
  {
    id: "bm_eye_of_greed",
    name: "Oko Chciwości",
    icon: "eye",
    desc: "Wrogowie dropują x3 miedzi, ale sklepy kosztują x2",
    category: "relic",
    rarity: "epic",
    cost: { gold: 1 },
    benefit: { enemyCopperMult: 3.0 },
    drawback: { shopCostMult: 2.0 },
    color: "#d4a030",
  },
  {
    id: "bm_lich_crown",
    name: "Korona Lisza",
    icon: "crown",
    desc: "Zabici wrogowie wstają jako szkielety (15% szans), ale bossowie mają +30% HP",
    category: "relic",
    rarity: "legendary",
    cost: { gold: 2 },
    benefit: { necromancyChance: 0.15 },
    drawback: { bossHpMult: 1.30 },
    color: "#40a060",
  },
  {
    id: "bm_pirate_compass",
    name: "Kompas Potępionych",
    icon: "compass",
    desc: "Ukryte pokoje gwarantowane co 3 pokoje, ale nie możesz leczyć karawany w sklepie",
    category: "relic",
    rarity: "legendary",
    cost: { gold: 1, silver: 5 },
    benefit: { guaranteedSecretRoom: 3 },
    drawback: { noShopHeal: true },
    color: "#a03040",
  },

  // ── AMMUNITION ──
  {
    id: "bm_cursed_dynamite",
    name: "Przeklęty Dynamit",
    icon: "dynamite",
    desc: "+10 dynamitu o x2 obrażeniach, ale 10% szans na samozniszczenie (5 HP karawany)",
    category: "ammo",
    rarity: "rare",
    cost: { copper: 60 },
    benefit: { ammo: { dynamite: 10 }, ammoDmgMult: { dynamite: 2.0 } },
    drawback: { selfDamageChance: 0.10, selfDamage: 5 },
    color: "#c06030",
  },
  {
    id: "bm_phantom_chains",
    name: "Widmowe Łańcuchy",
    icon: "ricochet",
    desc: "+8 łańcuchów — przechodzą przez przeszkody, ale spowalniają karawanę",
    category: "ammo",
    rarity: "rare",
    cost: { copper: 50 },
    benefit: { ammo: { chain: 8 }, chainPhaseThrough: true },
    drawback: { caravanSpeedMult: 0.85 },
    color: "#6080c0",
  },

  // ── SPECIAL ──
  {
    id: "bm_devils_contract",
    name: "Kontrakt Diabła",
    icon: "scroll",
    desc: "Natychmiast +3 Au i +10 Ag, ale karawana traci 50% max HP na resztę runu",
    category: "special",
    rarity: "legendary",
    cost: { copper: 1 }, // Symbolic cost
    benefit: { gold: 3, silver: 10 },
    drawback: { maxHpReductionPct: 0.50 },
    color: "#c02020",
  },
  {
    id: "bm_forbidden_tome",
    name: "Zakazana Księga",
    icon: "scroll",
    desc: "Wszystkie zaklęcia -30% cooldown, ale krytyczne obrażenia wyłączone",
    category: "special",
    rarity: "epic",
    cost: { silver: 5 },
    benefit: { cooldownMult: 0.70 },
    drawback: { noCrits: true },
    color: "#8040a0",
  },
];

// ─── BLACK MARKET HELPERS ─────────────────────────────────────────

/**
 * Roll whether the black market appears this room
 * @param {number} roomNum - Current room number
 * @param {boolean} hasCompass - Whether player has Kompas Potępionych
 * @returns {boolean}
 */
export function rollBlackMarket(roomNum, hasCompass = false) {
  if (roomNum < BLACK_MARKET.minRoom) return false;
  // Compass holders attract dark merchants
  const bonus = hasCompass ? 0.10 : 0;
  const chance = BLACK_MARKET.appearChance + (roomNum - BLACK_MARKET.minRoom) * BLACK_MARKET.roomScaling + bonus;
  return Math.random() < Math.min(chance, 0.25); // cap at 25%
}

/**
 * Roll which items the black market offers (3-4 items from pool)
 * @param {string[]} ownedItemIds - Items already purchased (no duplicates)
 * @param {number} roomNum - Current room number (higher = better items)
 * @returns {object[]} Items offered
 */
export function rollBlackMarketStock(ownedItemIds = [], roomNum = 1) {
  const available = BLACK_MARKET_ITEMS.filter(i => !ownedItemIds.includes(i.id));
  if (available.length === 0) return [];

  // Higher rooms unlock legendary items
  const pool = roomNum >= 15
    ? available
    : available.filter(i => i.rarity !== "legendary");

  const count = Math.random() < 0.3 ? 4 : 3;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Check if the player can afford an item
 * @param {object} item - Black market item
 * @param {object} money - Player money { copper, silver, gold }
 * @returns {boolean}
 */
export function canAffordBlackMarket(item, money) {
  const cost = item.cost;
  const totalCopper = (money.copper || 0) + (money.silver || 0) * 100 + (money.gold || 0) * 10000;
  const costCopper = (cost.copper || 0) + (cost.silver || 0) * 100 + (cost.gold || 0) * 10000;
  return totalCopper >= costCopper;
}

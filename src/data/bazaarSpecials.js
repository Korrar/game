// Rozbudowany system sklepu — unikalne przedmioty, rotujący asortyment, targowanie
// Special shop items, biome-themed rotating stock, bargaining mechanics

// ─── UNIQUE CONSUMABLES ─────────────────────────────────────────
// One-time items per run — powerful effects, strategic decisions
// Once bought, removed from pool for the rest of the run

export const BAZAAR_SPECIALS = [
  {
    id: "chaos_elixir",
    name: "Eliksir Chaosu",
    icon: "star",
    desc: "Losowy buff na 3 pokoje: +30% obrażeń LUB +50 prochu LUB podwójny łup",
    category: "consumable",
    rarity: "rare",
    cost: { silver: 2 },
    stock: 1,
    effect: {
      type: "random_buff",
      duration: 3,
      options: [
        { id: "chaos_dmg", name: "Szał Chaosu", buff: { dmgMult: 1.30 }, color: "#ff4040", desc: "+30% obrażeń" },
        { id: "chaos_mana", name: "Chaotyczna Energia", buff: { manaRestore: 50 }, color: "#4080ff", desc: "+50 prochu" },
        { id: "chaos_loot", name: "Chaotyczny Łup", buff: { lootMult: 2.0 }, color: "#ffd700", desc: "x2 łup z wrogów" },
      ],
    },
    color: "#e040e0",
  },
  {
    id: "ghost_compass",
    name: "Kompas Duchów",
    icon: "compass",
    desc: "Gwarantuje sekretny pokój w następnym biomie",
    category: "consumable",
    rarity: "epic",
    cost: { silver: 5 },
    stock: 1,
    effect: { type: "guarantee_secret", duration: 1 },
    color: "#60c0ff",
  },
  {
    id: "titan_powder",
    name: "Proch Tytanów",
    icon: "gunpowder",
    desc: "Następne 10 strzałów zadaje +50% obrażeń i ma podwójny zasięg",
    category: "consumable",
    rarity: "rare",
    cost: { silver: 3 },
    stock: 1,
    effect: { type: "empowered_shots", charges: 10, dmgMult: 1.5, rangeMult: 2.0 },
    color: "#ff8040",
  },
  {
    id: "phoenix_feather",
    name: "Pióro Feniksa",
    icon: "fire",
    desc: "Jednorazowe wskrzeszenie — karawana odzyskuje 50% HP zamiast umrzeć",
    category: "consumable",
    rarity: "legendary",
    cost: { gold: 1 },
    stock: 1,
    effect: { type: "revive", hpRestore: 0.5 },
    color: "#ff6020",
  },
  {
    id: "fortune_dice",
    name: "Kości Fortuny",
    icon: "dice",
    desc: "Rzuć kośćmi: szansa na x3 złota z następnej skrzyni (lub nic)",
    category: "consumable",
    rarity: "uncommon",
    cost: { copper: 60 },
    stock: 2,
    effect: { type: "chest_gamble", successChance: 0.5, goldMult: 3.0 },
    color: "#d4a030",
  },
  {
    id: "siren_shell",
    name: "Muszla Syreny",
    icon: "shell",
    desc: "Wrogowie w następnym pokoju są spowolnieni o 40% przez 10s",
    category: "consumable",
    rarity: "rare",
    cost: { silver: 2, copper: 50 },
    stock: 1,
    effect: { type: "slow_enemies", duration: 10000, slowMult: 0.6 },
    color: "#40c8c8",
  },
  {
    id: "shadow_cloak",
    name: "Płaszcz Cienia",
    icon: "ghost",
    desc: "Karawana jest niewidzialna przez pierwszą falę — wrogowie nie atakują",
    category: "consumable",
    rarity: "epic",
    cost: { silver: 4 },
    stock: 1,
    effect: { type: "stealth_wave", waves: 1 },
    color: "#8844cc",
  },
  {
    id: "ancient_map",
    name: "Starożytna Mapa",
    icon: "scroll",
    desc: "Odkrywa lokalizację 3 skarbów na mapie następnego biomu",
    category: "consumable",
    rarity: "uncommon",
    cost: { silver: 1, copper: 50 },
    stock: 1,
    effect: { type: "reveal_treasures", count: 3 },
    color: "#c8a040",
  },
];

// ─── BIOME-THEMED ITEMS ─────────────────────────────────────────
// Rotating stock based on the last visited biome
// Each biome offers 2-3 unique themed items only available there

export const BIOME_SHOP_ITEMS = {
  jungle: [
    { id: "bs_jungle_antidote", name: "Antidotum Dżungli", icon: "herb", desc: "Odporność na truciznę na 5 pokoi", cost: { silver: 1, copper: 50 }, rarity: "uncommon", effect: { type: "resist", element: "poison", duration: 5 }, color: "#44ff44" },
    { id: "bs_jungle_vines", name: "Żywe Liany", icon: "vine", desc: "Następne 3 pułapki mają +40% zasięg", cost: { silver: 2 }, rarity: "rare", effect: { type: "trap_buff", rangeMult: 1.4, charges: 3 }, color: "#2a8a2a" },
    { id: "bs_jungle_totem", name: "Totem Ochrony", icon: "shield", desc: "+3 pancerza karawany na 4 pokoje", cost: { silver: 2, copper: 50 }, rarity: "rare", effect: { type: "temp_armor", armor: 3, duration: 4 }, color: "#8a5a20" },
  ],
  island: [
    { id: "bs_island_rum", name: "Rum Kapitański", icon: "pirateRaid", desc: "Najemnicy atakują o 25% szybciej na 3 pokoje", cost: { silver: 1, copper: 80 }, rarity: "uncommon", effect: { type: "merc_buff", atkSpeedMult: 1.25, duration: 3 }, color: "#c08040" },
    { id: "bs_island_anchor", name: "Złota Kotwica", icon: "anchor", desc: "Sprzedaj za 2 Ag w dowolnym momencie", cost: { silver: 1 }, rarity: "uncommon", effect: { type: "trade_value", value: { silver: 2 } }, color: "#ffd700" },
    { id: "bs_island_parrot", name: "Wyszkolona Papuga", icon: "parrot", desc: "Zbiera łup automatycznie w walce", cost: { silver: 3 }, rarity: "rare", effect: { type: "auto_loot", duration: -1 }, color: "#ff4040" },
  ],
  desert: [
    { id: "bs_desert_mirage", name: "Butelka Mirażu", icon: "hourglass", desc: "Wrogowie mają 20% szans na pudło przez 3 pokoje", cost: { silver: 2 }, rarity: "rare", effect: { type: "enemy_miss", chance: 0.2, duration: 3 }, color: "#e0c060" },
    { id: "bs_desert_scorpion", name: "Jad Skorpiona", icon: "skull", desc: "Strzały zatruwają na 3s (5 dmg/s)", cost: { silver: 2, copper: 50 }, rarity: "rare", effect: { type: "poison_shots", dmgPerSec: 5, poisonDuration: 3000, charges: 15 }, color: "#80c040" },
    { id: "bs_desert_sand", name: "Worek Piasku", icon: "rock", desc: "Rzuć aby oślepić wrogów w obszarze (miss +50%) na 5s", cost: { copper: 80 }, rarity: "uncommon", effect: { type: "blind_area", duration: 5000, missIncrease: 0.5, charges: 2 }, color: "#d4b870" },
  ],
  winter: [
    { id: "bs_winter_frost", name: "Esencja Mrozu", icon: "ice", desc: "+25% obrażeń od lodu na 4 pokoje", cost: { silver: 2 }, rarity: "rare", effect: { type: "element_buff", element: "ice", dmgMult: 1.25, duration: 4 }, color: "#4488ff" },
    { id: "bs_winter_fur", name: "Futro Niedźwiedzia", icon: "shield", desc: "+5 pancerza karawany permanentnie", cost: { silver: 4 }, rarity: "epic", effect: { type: "perm_armor", armor: 5 }, color: "#8a7060" },
    { id: "bs_winter_vodka", name: "Grzaniec Piracki", icon: "pirateRaid", desc: "Przywraca 15 HP karawany natychmiast", cost: { silver: 1, copper: 50 }, rarity: "uncommon", effect: { type: "heal", amount: 15 }, color: "#c04040" },
  ],
  city: [
    { id: "bs_city_intel", name: "Wywiad Miejski", icon: "spyglass", desc: "Następny boss ujawnia wzorce ataków", cost: { silver: 3 }, rarity: "rare", effect: { type: "boss_reveal", duration: 1 }, color: "#60a0c0" },
    { id: "bs_city_contract", name: "Kontrakt Łowcy", icon: "scroll", desc: "Następni 5 wrogowie dają x2 miedzi", cost: { silver: 1 }, rarity: "uncommon", effect: { type: "bounty", copperMult: 2.0, charges: 5 }, color: "#d4a030" },
    { id: "bs_city_repair", name: "Zestaw Naprawczy", icon: "pickaxe", desc: "Naprawia karawanę o 25 HP", cost: { silver: 3, copper: 50 }, rarity: "rare", effect: { type: "heal", amount: 25 }, color: "#40a080" },
  ],
  volcano: [
    { id: "bs_volcano_magma", name: "Fiolka Magmy", icon: "fire", desc: "+30% obrażeń od ognia na 4 pokoje", cost: { silver: 2, copper: 50 }, rarity: "rare", effect: { type: "element_buff", element: "fire", dmgMult: 1.30, duration: 4 }, color: "#ff6020" },
    { id: "bs_volcano_obsidian", name: "Obsydianowy Pancerz", icon: "shield", desc: "Blokuje pierwszy cios w każdym pokoju (3 pokoje)", cost: { silver: 3 }, rarity: "epic", effect: { type: "first_hit_block", duration: 3 }, color: "#2a2a3a" },
    { id: "bs_volcano_ember", name: "Żar Wulkanu", icon: "fire", desc: "Wrogowie płoną przy kontakcie z karawaną (8 dmg/s)", cost: { silver: 2 }, rarity: "rare", effect: { type: "contact_burn", dmgPerSec: 8, duration: 3 }, color: "#c04020" },
  ],
  summer: [
    { id: "bs_summer_honey", name: "Miód Prerii", icon: "herb", desc: "Regeneracja +2 HP/pokój przez 5 pokoi", cost: { silver: 1, copper: 50 }, rarity: "uncommon", effect: { type: "regen", hpPerRoom: 2, duration: 5 }, color: "#e0c040" },
    { id: "bs_summer_wind", name: "Butelka Wiatru", icon: "windmill", desc: "Pociski lecą 30% szybciej przez 3 pokoje", cost: { silver: 2 }, rarity: "rare", effect: { type: "projectile_speed", speedMult: 1.3, duration: 3 }, color: "#80c0ff" },
  ],
  autumn: [
    { id: "bs_autumn_harvest", name: "Rogi Obfitości", icon: "pumpkin", desc: "Podwójny łup z następnych 2 skrzyń", cost: { silver: 2 }, rarity: "rare", effect: { type: "chest_double", charges: 2 }, color: "#c08030" },
    { id: "bs_autumn_fog", name: "Jesienna Mgła", icon: "ghost", desc: "Wrogowie nie wykrywają pułapek (3 pokoje)", cost: { silver: 1, copper: 50 }, rarity: "uncommon", effect: { type: "trap_stealth", duration: 3 }, color: "#8a7060" },
  ],
  spring: [
    { id: "bs_spring_bloom", name: "Kwiat Życia", icon: "flower", desc: "+20 max HP karawany permanentnie", cost: { silver: 4 }, rarity: "epic", effect: { type: "perm_max_hp", amount: 20 }, color: "#ff80a0" },
    { id: "bs_spring_dew", name: "Rosa Poranna", icon: "water", desc: "Przywraca pełny proch", cost: { silver: 2 }, rarity: "rare", effect: { type: "full_mana" }, color: "#80d0ff" },
  ],
  mushroom: [
    { id: "bs_mush_spore", name: "Zarodniki Halucynacji", icon: "mushroom", desc: "Wrogowie atakują się nawzajem przez 8s (następny pokój)", cost: { silver: 3 }, rarity: "epic", effect: { type: "confusion", duration: 8000, nextRoom: true }, color: "#a040c0" },
    { id: "bs_mush_glow", name: "Świecący Grzyb", icon: "lantern", desc: "Odsłania mapę w ciemnych biomach (+widoczność)", cost: { copper: 80 }, rarity: "uncommon", effect: { type: "visibility_buff", duration: 5 }, color: "#40ff80" },
  ],
  swamp: [
    { id: "bs_swamp_leech", name: "Pijawki Lecznicze", icon: "water", desc: "Kradzież życia 10% z obrażeń na 4 pokoje", cost: { silver: 2, copper: 50 }, rarity: "rare", effect: { type: "lifesteal", value: 0.10, duration: 4 }, color: "#408040" },
    { id: "bs_swamp_mud", name: "Błotna Bariera", icon: "shield", desc: "Spowalnia wrogów o 30% w pierwszej fali", cost: { silver: 1 }, rarity: "uncommon", effect: { type: "slow_first_wave", slowMult: 0.7 }, color: "#5a4a30" },
  ],
  sunset_beach: [
    { id: "bs_sunset_pearl", name: "Perła Zachodu", icon: "gem", desc: "Sprzedaj za 5 Ag lub użyj: +15% do wszystkich obrażeń na 3 pokoje", cost: { silver: 3 }, rarity: "rare", effect: { type: "dual_use", sellValue: { silver: 5 }, useEffect: { dmgMult: 1.15, duration: 3 } }, color: "#ffb0c0" },
    { id: "bs_sunset_tide", name: "Esencja Przypływu", icon: "water", desc: "Fale wrogów przychodzą wolniej (+5s między falami, 3 pokoje)", cost: { silver: 2 }, rarity: "rare", effect: { type: "wave_delay", extraDelay: 5000, duration: 3 }, color: "#4080c0" },
  ],
  bamboo_falls: [
    { id: "bs_bamboo_tea", name: "Herbata Zen", icon: "herb", desc: "Cooldowny zaklęć -20% na 4 pokoje", cost: { silver: 2, copper: 50 }, rarity: "rare", effect: { type: "cooldown_buff", cdMult: 0.8, duration: 4 }, color: "#40a050" },
    { id: "bs_bamboo_staff", name: "Bambusowa Laska", icon: "wood", desc: "Szable zadają +5 obrażeń na 3 pokoje", cost: { silver: 1, copper: 50 }, rarity: "uncommon", effect: { type: "melee_buff", dmgBonus: 5, duration: 3 }, color: "#8ac050" },
  ],
  blue_lagoon: [
    { id: "bs_lagoon_coral", name: "Magiczny Koral", icon: "coral", desc: "+20% odporność na wszystkie żywioły na 3 pokoje", cost: { silver: 3 }, rarity: "rare", effect: { type: "all_resist", value: 0.2, duration: 3 }, color: "#ff6080" },
    { id: "bs_lagoon_pearl", name: "Perła Głębin", icon: "gem", desc: "Przywraca 10 HP karawany i +10 prochu", cost: { silver: 1, copper: 50 }, rarity: "uncommon", effect: { type: "restore", hp: 10, mana: 10 }, color: "#40c0e0" },
  ],
  olympus: [
    { id: "bs_olympus_nectar", name: "Nektar Bogów", icon: "star", desc: "+1 poziom permanentnie (natychmiast)", cost: { gold: 1 }, rarity: "legendary", effect: { type: "instant_level" }, color: "#ffd700" },
    { id: "bs_olympus_bolt", name: "Błyskawica Zeusa", icon: "lightning", desc: "Następne 5 ataków elektrycznych mają łańcuch (+2 cele)", cost: { silver: 3 }, rarity: "epic", effect: { type: "chain_buff", extraTargets: 2, charges: 5 }, color: "#ffee00" },
  ],
  underworld: [
    { id: "bs_under_soul", name: "Dusza Potępionego", icon: "skull", desc: "Wskrzes 1 pokonanego najemnika z pełnym HP", cost: { silver: 4 }, rarity: "epic", effect: { type: "revive_merc" }, color: "#6040a0" },
    { id: "bs_under_styx", name: "Woda Styksu", icon: "water", desc: "Nieśmiertelność karawany na 1 falę (następny pokój)", cost: { gold: 1 }, rarity: "legendary", effect: { type: "invulnerable_wave", waves: 1 }, color: "#4020a0" },
  ],
  meteor: [
    { id: "bs_meteor_shard", name: "Odłamek Kosmosu", icon: "crystal", desc: "+40% obrażeń od wszystkich żywiołów na 2 pokoje", cost: { silver: 3, copper: 50 }, rarity: "epic", effect: { type: "all_element_buff", dmgMult: 1.4, duration: 2 }, color: "#a040ff" },
    { id: "bs_meteor_dust", name: "Pył Kosmiczny", icon: "star", desc: "Losowa relika (uncommon lub lepsza)", cost: { silver: 5 }, rarity: "epic", effect: { type: "random_relic", minRarity: "uncommon" }, color: "#c080ff" },
  ],
};

// ─── BARGAINING SYSTEM ──────────────────────────────────────────
// Player can attempt to haggle once per shop visit
// Success depends on a dice roll + modifiers (gold wealth, relics)

export const BARGAIN_CONFIG = {
  maxAttempts: 1,       // per shop visit
  baseDifficulty: 50,   // need to roll above this (out of 100)
  discountOnSuccess: 0.25, // 25% off
  failPenalty: 0.10,    // 10% price increase on fail
  // Modifiers
  goldBonus: 5,         // +5% per gold coin owned
  maxGoldBonus: 20,     // cap at +20%
  relicBonus: {         // specific relics that help bargaining
    "merchants_charm": 15,
    "silver_tongue": 20,
  },
};

/**
 * Attempt to bargain for a discount
 * @param {object} money - Player money { copper, silver, gold }
 * @param {string[]} relicIds - Owned relic IDs
 * @returns {{ success: boolean, discount: number, roll: number, threshold: number }}
 */
export function attemptBargain(money, relicIds = []) {
  const cfg = BARGAIN_CONFIG;
  // Calculate modifiers
  let bonus = 0;
  bonus += Math.min((money.gold || 0) * cfg.goldBonus, cfg.maxGoldBonus);
  for (const [relicId, val] of Object.entries(cfg.relicBonus)) {
    if (relicIds.includes(relicId)) bonus += val;
  }
  const threshold = cfg.baseDifficulty - bonus;
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll > threshold;
  return {
    success,
    discount: success ? cfg.discountOnSuccess : -cfg.failPenalty,
    roll,
    threshold,
  };
}

/**
 * Apply discount or penalty to a cost
 * @param {object} cost - { copper, silver, gold }
 * @param {number} discount - Positive = discount, negative = penalty
 * @returns {object} Modified cost
 */
export function applyDiscount(cost, discount) {
  const mult = 1 - discount;
  const result = {};
  if (cost.copper) result.copper = Math.max(1, Math.round(cost.copper * mult));
  if (cost.silver) result.silver = Math.max(1, Math.round(cost.silver * mult));
  if (cost.gold) result.gold = Math.max(1, Math.round(cost.gold * mult));
  return result;
}

// ─── STOCK MANAGEMENT ───────────────────────────────────────────

/**
 * Generate shop stock for the current visit
 * @param {string} lastBiomeId - Last biome the player visited
 * @param {string[]} boughtSpecialIds - Already purchased special item IDs this run
 * @param {number} roomNum - Current room number
 * @returns {{ specials: object[], biomeItems: object[] }}
 */
export function generateShopStock(lastBiomeId, boughtSpecialIds = [], roomNum = 1) {
  // Pick 2-3 specials from pool (not already bought)
  const availableSpecials = BAZAAR_SPECIALS.filter(s => !boughtSpecialIds.includes(s.id));
  // Higher rooms = more legendary items available
  const pool = roomNum < 10
    ? availableSpecials.filter(s => s.rarity !== "legendary")
    : availableSpecials;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const specialCount = roomNum >= 15 ? 3 : 2;
  const specials = shuffled.slice(0, Math.min(specialCount, shuffled.length));

  // Get biome-themed items
  const biomeItems = BIOME_SHOP_ITEMS[lastBiomeId] || BIOME_SHOP_ITEMS["city"] || [];

  return { specials, biomeItems };
}

// Biome Environmental Modifiers — passive per-biome hazards that affect gameplay
// Each biome has a unique environmental effect that changes combat dynamics

export const MODIFIER_CHANCE = 0.60; // 60% chance to activate per room

export const BIOME_MODIFIERS = {
  jungle: {
    id: "monsoon_mud",
    name: "Monsunowe Błoto",
    desc: "Ulewne deszcze spowalniają wrogów o 20%, ale pociski łukowe tracą 15% zasięgu",
    icon: "rain",
    type: "neutral",
    effect: {
      type: "slow_and_drag",
      enemySpeedMult: 0.80,
      arcRangeMult: 0.85,
    },
  },
  island: {
    id: "tidal_surge",
    name: "Fala Przypływu",
    desc: "Co 20s fala zalewa dolną część mapy — zadaje 10 obrażeń wrogom na dole",
    icon: "wave",
    type: "hazard",
    effect: {
      type: "periodic_damage",
      interval: 20000,
      damage: 10,
      zone: "bottom",  // bottom 30% of map
      zoneSize: 30,
      element: "ice",
      fxType: "wave",
    },
  },
  desert: {
    id: "mirage",
    name: "Fatamorgana",
    desc: "20% wrogów to iluzje — znikają po trafieniu, nie dają łupu",
    icon: "eye",
    type: "neutral",
    effect: {
      type: "illusion_enemies",
      illusionChance: 0.20,
    },
  },
  winter: {
    id: "permafrost",
    name: "Wieczna Zmarzlina",
    desc: "Pociski gracza lecą 15% wolniej, ale wrogowie też są spowolnieni o 25%",
    icon: "snowflake",
    type: "neutral",
    effect: {
      type: "slow_all",
      playerProjSpeedMult: 0.85,
      enemySpeedMult: 0.75,
    },
  },
  city: {
    id: "black_market",
    name: "Czarny Rynek",
    desc: "Zniszczone przeszkody mają 30% szans na dodatkowy łup (miedziaki)",
    icon: "coin",
    type: "buff",
    effect: {
      type: "bonus_loot",
      bonusLootChance: 0.30,
      bonusLoot: { copper: 5 },
    },
  },
  volcano: {
    id: "eruption",
    name: "Erupcja Wulkanu",
    desc: "Co 18s kolumna lawy spada na losowe miejsce — 20 obrażeń ognia wrogom i graczowi",
    icon: "fire",
    type: "hazard",
    effect: {
      type: "periodic_damage",
      interval: 18000,
      damage: 20,
      zone: "random",
      zoneSize: 15,
      element: "fire",
      fxType: "lava_column",
      hitsPlayer: true,
      playerDamage: 8,
    },
  },
  summer: {
    id: "golden_harvest",
    name: "Złote Żniwa",
    desc: "Wrogowie upuszczają 25% więcej miedziakow",
    icon: "wheat",
    type: "buff",
    effect: {
      type: "loot_mult",
      copperMult: 1.25,
    },
  },
  autumn: {
    id: "hunters_wind",
    name: "Wiatr Łowcy",
    desc: "Pociski liniowe mają +20% prędkości, ale łukowe są mniej celne",
    icon: "wind",
    type: "neutral",
    effect: {
      type: "projectile_mod",
      linearSpeedMult: 1.20,
      arcAccuracyMult: 0.85,
    },
  },
  spring: {
    id: "regeneration",
    name: "Moc Natury",
    desc: "Karawana regeneruje 1 HP co 12s",
    icon: "heart",
    type: "buff",
    effect: {
      type: "periodic_heal",
      interval: 12000,
      healAmount: 1,
    },
  },
  mushroom: {
    id: "hallucination",
    name: "Halucynogenne Spory",
    desc: "Co 25s chmura sporów dezorientuje wrogów — atakują się nawzajem przez 4s",
    icon: "mushroom",
    type: "hazard",
    effect: {
      type: "confusion",
      interval: 25000,
      duration: 4000,
      fxType: "spore_cloud",
    },
  },
  swamp: {
    id: "toxic_bog",
    name: "Trujące Bagno",
    desc: "Strefy trucizny na ziemi — wrogowie w nich tracą 3 HP/s",
    icon: "skull",
    type: "hazard",
    effect: {
      type: "damage_zone",
      damagePerSec: 3,
      zoneCount: 3,
      zoneSize: 12,
      element: "poison",
      fxType: "poison_pool",
    },
  },
  sunset_beach: {
    id: "sunset_glow",
    name: "Blask Zachodu",
    desc: "Złote światło wzmacnia pociski ognia o 20% i daje +10% celności",
    icon: "sun",
    type: "buff",
    effect: {
      type: "damage_and_accuracy",
      damageMult: { fire: 1.20 },
      accuracyMult: 1.10,
    },
  },
  bamboo_falls: {
    id: "mist_veil",
    name: "Zasłona Mgły",
    desc: "Mgła z wodospadu ukrywa karawanę — wrogowie 30% wolniej namierzają cel",
    icon: "water",
    type: "buff",
    effect: {
      type: "enemy_targeting_slow",
      targetingMult: 0.70,
    },
  },
  blue_lagoon: {
    id: "healing_waters",
    name: "Uzdrawiające Wody",
    desc: "Wrogowie zabici blisko wody leczą karawanę o 2 HP",
    icon: "heart",
    type: "buff",
    effect: {
      type: "kill_heal",
      healPerKill: 2,
      zoneRequired: "bottom",
      zoneSize: 40,
    },
  },
  olympus: {
    id: "divine_trial",
    name: "Próba Bogów",
    desc: "Losowy boski efekt: +30% obrażeń ale -15% HP karawany LUB odwrotnie",
    icon: "lightning",
    type: "neutral",
    effect: {
      type: "random_buff_debuff",
      variants: [
        { damageMult: 1.30, hpMult: 0.85, desc: "Moc Aresa: +30% obrażeń, -15% HP" },
        { damageMult: 0.85, hpMult: 1.15, desc: "Błogosławieństwo Ateny: -15% obrażeń, +15% HP" },
      ],
    },
  },
  underworld: {
    id: "soul_harvest",
    name: "Żniwa Dusz",
    desc: "Zabici wrogowie mają 15% szans odrodzić się jako słabsze zombie po 8s",
    icon: "ghost",
    type: "hazard",
    effect: {
      type: "zombie_respawn",
      respawnChance: 0.15,
      respawnDelay: 8000,
      respawnHpMult: 0.40,
      respawnDmgMult: 0.50,
    },
  },
  meteor: {
    id: "cosmic_radiation",
    name: "Kosmiczne Promieniowanie",
    desc: "Energia meteorytu wzmacnia wszystkie ataki o 15%, ale wrogowie mają +20% HP",
    icon: "lightning",
    type: "neutral",
    effect: {
      type: "damage_and_hp",
      damageMult: { fire: 1.15, ice: 1.15, lightning: 1.15, shadow: 1.15 },
      enemyHpMult: 1.20,
    },
  },
};

/**
 * Roll whether a biome modifier activates for this room.
 * @param {string} biomeId
 * @returns {object|null} modifier definition or null
 */
export function rollModifier(biomeId) {
  const mod = BIOME_MODIFIERS[biomeId];
  if (!mod) return null;
  return Math.random() < MODIFIER_CHANCE ? mod : null;
}

/**
 * Apply modifier-based damage multiplier for a given element.
 * @param {number} baseDamage
 * @param {string|null} element
 * @param {object|null} modifier - active room modifier
 * @returns {number} modified damage (rounded)
 */
export function applyModifierDamage(baseDamage, element, modifier) {
  if (!modifier || !modifier.effect?.damageMult || !element) return baseDamage;
  const mult = modifier.effect.damageMult[element];
  if (!mult) return baseDamage;
  return Math.round(baseDamage * mult);
}

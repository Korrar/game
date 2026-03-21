// Biome Hazard Zones — physical hazard areas on the combat arena
// These are positional zones that affect units standing inside them.
// Complements biomeModifiers.js (passive room-wide effects) with spatial gameplay.

// ─── HAZARD ZONE DEFINITIONS ───────────────────────────────────────
// Each biome can have hazard zones that spawn on the arena during combat.
// effect.type determines what happens to units inside:
//   "damage"          — deals dps per second
//   "slow"            — reduces movement speed
//   "damage_and_slow" — both damage and slow
//   "dot"             — damage over time with element
//   "knockback"       — pushes units away from center
//   "pull"            — pulls units toward center
//   "stun"            — periodically stuns units inside
//   "buff_enemies"    — enemies inside get stat boost
//   "debuff_player"   — player projectiles weakened in zone
//   "teleport"        — units entering are teleported to random spot
//   "heal_enemies"    — enemies inside regenerate HP

export const BIOME_HAZARD_ZONES = {
  volcano: {
    id: "lava_pool",
    name: "Jeziorko Lawy",
    desc: "Rozżarzona lawa — 8 obrażeń ognia/s wszystkim w strefie",
    icon: "fire",
    zoneCount: 3,
    zoneRadius: 45,
    color: "#ff4400",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "damage", dps: 8, element: "fire" },
  },
  winter: {
    id: "ice_patch",
    name: "Lodowa Tafla",
    desc: "Śliski lód — spowolnienie o 50%, knockback x2",
    icon: "ice",
    zoneCount: 4,
    zoneRadius: 55,
    color: "#88ccff",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "slow", speedMult: 0.50, knockbackMult: 2.0 },
  },
  swamp: {
    id: "toxic_mire",
    name: "Toksyczne Bagno",
    desc: "Trujące bajoro — 4 obrażeń trucizny/s i spowolnienie o 40%",
    icon: "poison",
    zoneCount: 3,
    zoneRadius: 50,
    color: "#446622",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "damage_and_slow", dps: 4, element: "shadow", speedMult: 0.60 },
  },
  jungle: {
    id: "quicksand",
    name: "Ruchome Piaski",
    desc: "Wciągające podłoże — spowolnienie o 60% dla obu stron",
    icon: "hourglass",
    zoneCount: 2,
    zoneRadius: 40,
    color: "#a08840",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "slow", speedMult: 0.40 },
  },
  desert: {
    id: "sand_vortex",
    name: "Piaskowy Wir",
    desc: "Wir wciąga jednostki do centrum — 3 obrażeń/s",
    icon: "hourglass",
    zoneCount: 2,
    zoneRadius: 55,
    color: "#d4a840",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "pull", dps: 3, element: null, pullForce: 0.8 },
  },
  mushroom: {
    id: "spore_cloud",
    name: "Chmura Zarodników",
    desc: "Halucynogenne spory — ogłuszenie na 1s co 5s",
    icon: "mushroom",
    zoneCount: 2,
    zoneRadius: 50,
    color: "#aa44ff",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "stun", stunDuration: 1000, stunInterval: 5000 },
  },
  city: {
    id: "oil_slick",
    name: "Plama Oleju",
    desc: "Śliski olej — spowolnienie o 35%, pociski ognia zapłoną strefę",
    icon: "water",
    zoneCount: 3,
    zoneRadius: 40,
    color: "#2a2a2a",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "damage_and_slow", dps: 0, element: "fire", speedMult: 0.65, ignitable: true, igniteDps: 12, igniteDuration: 5000 },
  },
  olympus: {
    id: "divine_lightning",
    name: "Boska Błyskawica",
    desc: "Strefa naładowana elektrycznością — 6 obrażeń pioruna/s",
    icon: "lightning",
    zoneCount: 2,
    zoneRadius: 40,
    color: "#ffee00",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "damage", dps: 6, element: "lightning" },
  },
  underworld: {
    id: "styx_river",
    name: "Wody Styksu",
    desc: "Rzeka umarłych — 5 obrażeń cienia/s, wrogowie wewnątrz regenerują 2 HP/s",
    icon: "skull",
    zoneCount: 2,
    zoneRadius: 60,
    color: "#440066",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "dot", dps: 5, element: "shadow", enemyHealPerSec: 2 },
  },
  meteor: {
    id: "radiation_zone",
    name: "Strefa Radiacji",
    desc: "Kosmiczne promieniowanie — 3 obrażeń/s, wrogowie wewnątrz +20% obrażeń",
    icon: "lightning",
    zoneCount: 3,
    zoneRadius: 45,
    color: "#8040ff",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "damage", dps: 3, element: "lightning", enemyDamageBuff: 1.20 },
  },
  spring: {
    id: "healing_bloom",
    name: "Leczniczy Kwiat",
    desc: "Pole kwiatów — najemnicy wewnątrz regenerują 2 HP/s",
    icon: "flower",
    zoneCount: 2,
    zoneRadius: 40,
    color: "#66ff66",
    affectsEnemies: false,
    affectsPlayer: true,
    effect: { type: "dot", dps: -2, element: null },
  },
  summer: {
    id: "sunstroke_zone",
    name: "Strefa Upału",
    desc: "Ekstremalny żar — wrogowie wewnątrz tracą 15% prędkości ataku",
    icon: "fire",
    zoneCount: 2,
    zoneRadius: 50,
    color: "#ffcc00",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "slow", speedMult: 0.85, attackSpeedMult: 0.85 },
  },
  autumn: {
    id: "leaf_storm",
    name: "Wir Liści",
    desc: "Wirujące liście odpychają jednostki od centrum",
    icon: "leaf",
    zoneCount: 2,
    zoneRadius: 45,
    color: "#cc8830",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "knockback", knockbackForce: 1.5, element: null },
  },
  island: {
    id: "tidal_pool",
    name: "Pływowa Sadzawka",
    desc: "Morska woda — spowolnienie o 30%, pociski lodowe +25% obrażeń",
    icon: "water",
    zoneCount: 3,
    zoneRadius: 45,
    color: "#2288cc",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "damage_and_slow", dps: 0, element: "ice", speedMult: 0.70, iceBonus: 1.25 },
  },
  bamboo_falls: {
    id: "waterfall_mist",
    name: "Mgła Wodospadu",
    desc: "Gęsta mgła — pociski wewnątrz tracą 20% celności, wrogowie spowolnieni o 25%",
    icon: "water",
    zoneCount: 2,
    zoneRadius: 55,
    color: "#66bbaa",
    affectsEnemies: true,
    affectsPlayer: true,
    effect: { type: "damage_and_slow", dps: 0, element: null, speedMult: 0.75, accuracyMult: 0.80 },
  },
  blue_lagoon: {
    id: "jellyfish_field",
    name: "Pole Meduz",
    desc: "Meduzy paraliżują — stun 0.8s co 4s",
    icon: "lightning",
    zoneCount: 3,
    zoneRadius: 40,
    color: "#44ddff",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "stun", stunDuration: 800, stunInterval: 4000 },
  },
  sunset_beach: {
    id: "hot_sand",
    name: "Gorący Piasek",
    desc: "Rozgrzany piasek — 2 obrażeń/s i spowolnienie o 20%",
    icon: "fire",
    zoneCount: 3,
    zoneRadius: 45,
    color: "#ffaa44",
    affectsEnemies: true,
    affectsPlayer: false,
    effect: { type: "damage_and_slow", dps: 2, element: "fire", speedMult: 0.80 },
  },
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────

const CARAVAN_SAFE_ZONE = 0.90; // top 90% of map is spawnable

/**
 * Spawn hazard zones on the arena for a given biome.
 * @param {string} biomeId
 * @param {{ width: number, height: number }} arena
 * @returns {Array<{ x: number, y: number, radius: number, hazardId: string }>}
 */
export function spawnHazardZones(biomeId, arena) {
  const def = BIOME_HAZARD_ZONES[biomeId];
  if (!def) return [];

  const zones = [];
  const maxY = arena.height * CARAVAN_SAFE_ZONE;
  const margin = def.zoneRadius;

  for (let i = 0; i < def.zoneCount; i++) {
    zones.push({
      x: margin + Math.random() * (arena.width - margin * 2),
      y: margin + Math.random() * (maxY - margin * 2),
      radius: def.zoneRadius,
      hazardId: def.id,
    });
  }
  return zones;
}

/**
 * Check if a point (entity position) is inside any hazard zone.
 * @returns {object|null} First matching zone or null.
 */
export function isInHazardZone(x, y, zones) {
  for (const z of zones) {
    const dx = x - z.x;
    const dy = y - z.y;
    if (dx * dx + dy * dy <= z.radius * z.radius) {
      return z;
    }
  }
  return null;
}

/**
 * Calculate damage for a hazard zone effect.
 * @param {object} hazardDef - BIOME_HAZARD_ZONES entry
 * @param {number} deltaTime - seconds since last tick
 * @returns {{ damage: number, element: string|null }}
 */
export function getHazardDamage(hazardDef, deltaTime) {
  const { effect } = hazardDef;
  const hasDps = (effect.type === "damage" || effect.type === "damage_and_slow" || effect.type === "dot" || effect.type === "pull");
  if (!hasDps || !effect.dps) {
    return { damage: 0, element: effect.element || null };
  }
  return {
    damage: Math.round(effect.dps * deltaTime),
    element: effect.element || null,
  };
}

/**
 * Process hazard effects for all entities in zones.
 * @param {Array} zones - spawned zone instances
 * @param {Array} entities - [{ id, x, y, isEnemy }]
 * @param {object} hazardDef - BIOME_HAZARD_ZONES entry
 * @param {number} deltaTime - seconds since last tick
 * @returns {Array<{ entityId, damage, element, speedMult? }>}
 */
export function tickHazards(zones, entities, hazardDef, deltaTime) {
  const effects = [];
  const dmg = getHazardDamage(hazardDef, deltaTime);

  for (const entity of entities) {
    // Filter by affectsPlayer / affectsEnemies
    if (entity.isEnemy && !hazardDef.affectsEnemies) continue;
    if (!entity.isEnemy && !hazardDef.affectsPlayer) continue;

    const zone = isInHazardZone(entity.x, entity.y, zones);
    if (!zone) continue;

    const eff = { entityId: entity.id, damage: dmg.damage, element: dmg.element };

    // Attach speed multiplier for slow-type effects
    if (hazardDef.effect.speedMult != null) {
      eff.speedMult = hazardDef.effect.speedMult;
    }

    effects.push(eff);
  }

  return effects;
}

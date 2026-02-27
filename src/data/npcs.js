// NPC definitions per biome
// hp: hit points, resist: elemental resistance (null, "fire", "ice")

export const BIOME_NPCS = {
  jungle: [
    { emoji: "🧙", name: "Szaman Dżungli", hp: 40, resist: null, loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#8B7355", armorColor: "#2d5a1e", bodyType: "humanoid", ability: null },
    { emoji: "🦎", name: "Jaszczuroludź", hp: 25, resist: null, loot: { copper: 8 }, rarity: "common", bodyColor: "#4a6a30", armorColor: "#2a4020", bodyType: "humanoid", ability: null },
    { emoji: "🐒", name: "Wściekła Małpa", hp: 20, resist: null, loot: { copper: 5 }, rarity: "common", bodyColor: "#8B6914", armorColor: "#5a4020", bodyType: "quadruped", ability: { type: "charge", damage: 8, cooldown: 5000, element: null, range: 20 } },
  ],
  island: [
    { emoji: "🏴‍☠️", name: "Pirat", hp: 35, resist: "ice", loot: { copper: 15 }, rarity: "uncommon", bodyColor: "#8a6a50", armorColor: "#4a3030", bodyType: "humanoid", ability: null },
    { emoji: "🧜", name: "Mroczna Syrena", hp: 45, resist: "ice", loot: { copper: 20 }, rarity: "rare", bodyColor: "#4a8090", armorColor: "#2a5060", bodyType: "floating", ability: { type: "iceShot", damage: 8, cooldown: 4500, element: "ice", range: 25 } },
  ],
  desert: [
    { emoji: "🧞", name: "Zły Dżin", hp: 60, resist: "fire", loot: { silver: 1 }, rarity: "epic", bodyColor: "#6040a0", armorColor: "#402060", bodyType: "floating", ability: { type: "shadowBolt", damage: 12, cooldown: 4000, element: "shadow", range: 30 } },
    { emoji: "🦂", name: "Skorpion Olbrzym", hp: 30, resist: "fire", loot: { copper: 10 }, rarity: "common", bodyColor: "#6a5030", armorColor: "#4a3020", bodyType: "scorpion", ability: { type: "poisonSpit", damage: 8, cooldown: 4000, element: "shadow", range: 25 } },
    { emoji: "🔮", name: "Pustynna Czarownica", hp: 45, resist: "fire", loot: { copper: 18 }, rarity: "rare", bodyColor: "#806040", armorColor: "#503020", bodyType: "humanoid", ability: { type: "fireBreath", damage: 10, cooldown: 5000, element: "fire", range: 20 } },
  ],
  winter: [
    { emoji: "🐺", name: "Lodowy Wilk", hp: 35, resist: "ice", loot: { copper: 12 }, rarity: "common", bodyColor: "#8090a0", armorColor: "#506070", bodyType: "quadruped", ability: { type: "charge", damage: 15, cooldown: 6000, element: null, range: 30 } },
    { emoji: "🥶", name: "Mroźny Golem", hp: 50, resist: "ice", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#6080b0", armorColor: "#304060", bodyType: "humanoid", ability: null },
    { emoji: "🧙‍♀️", name: "Wiedźma Mrozu", hp: 55, resist: "ice", loot: { silver: 1 }, rarity: "rare", bodyColor: "#6a6a80", armorColor: "#404060", bodyType: "floating", ability: { type: "iceShot", damage: 10, cooldown: 4000, element: "ice", range: 25 } },
  ],
  city: [
    { emoji: "🐀", name: "Król Szczurów", hp: 25, resist: null, loot: { copper: 8 }, rarity: "common", bodyColor: "#6a5a40", armorColor: "#3a3020", bodyType: "quadruped", ability: null },
    { emoji: "🧛", name: "Wampir", hp: 55, resist: null, loot: { silver: 1, copper: 10 }, rarity: "epic", bodyColor: "#5a3040", armorColor: "#2a1820", bodyType: "floating", ability: { type: "shadowBolt", damage: 12, cooldown: 4500, element: "shadow", range: 28 } },
    { emoji: "🗡️", name: "Złodziej Cieni", hp: 30, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#4a4a4a", armorColor: "#2a2a2a", bodyType: "humanoid", ability: null },
  ],
  volcano: [
    { emoji: "👹", name: "Ognisty Demon", hp: 70, resist: "fire", loot: { silver: 1, copper: 20 }, rarity: "epic", bodyColor: "#8a3030", armorColor: "#4a2020", bodyType: "humanoid", ability: { type: "fireBreath", damage: 15, cooldown: 5000, element: "fire", range: 20 } },
    { emoji: "🐉", name: "Młody Smok", hp: 90, resist: "fire", loot: { silver: 2 }, rarity: "legendary", bodyColor: "#6a4020", armorColor: "#3a2010", bodyType: "serpent", ability: { type: "fireBreath", damage: 12, cooldown: 5000, element: "fire", range: 20 } },
  ],
  summer: [
    { emoji: "🐗", name: "Dzik Leśny", hp: 30, resist: null, loot: { copper: 10 }, rarity: "common", bodyColor: "#6a5030", armorColor: "#4a3820", bodyType: "quadruped", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 25 } },
    { emoji: "🐝", name: "Królowa Os", hp: 35, resist: null, loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#c0a020", armorColor: "#806010", bodyType: "floating", ability: { type: "poisonSpit", damage: 6, cooldown: 3500, element: "shadow", range: 20 } },
    { emoji: "🌾", name: "Strach na Wróble", hp: 45, resist: "fire", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#8a7a50", armorColor: "#5a5030", bodyType: "humanoid", ability: null },
  ],
  autumn: [
    { emoji: "🦊", name: "Mroczny Lis", hp: 28, resist: null, loot: { copper: 9 }, rarity: "common", bodyColor: "#a06020", armorColor: "#704010", bodyType: "quadruped", ability: { type: "charge", damage: 8, cooldown: 4500, element: null, range: 22 } },
    { emoji: "🧙‍♂️", name: "Druid Jesieni", hp: 50, resist: null, loot: { copper: 18 }, rarity: "rare", bodyColor: "#6a5a30", armorColor: "#3a3018", bodyType: "humanoid", ability: { type: "poisonSpit", damage: 10, cooldown: 4000, element: "shadow", range: 24 } },
    { emoji: "🎃", name: "Dyniogłowy", hp: 40, resist: "fire", loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#c06020", armorColor: "#804010", bodyType: "humanoid", ability: { type: "fireBreath", damage: 8, cooldown: 5000, element: "fire", range: 18 } },
  ],
  spring: [
    { emoji: "🐺", name: "Wilk Wiosenny", hp: 25, resist: null, loot: { copper: 8 }, rarity: "common", bodyColor: "#707060", armorColor: "#505040", bodyType: "quadruped", ability: { type: "charge", damage: 8, cooldown: 5000, element: null, range: 22 } },
    { emoji: "🧚", name: "Gniewna Driada", hp: 40, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#50a050", armorColor: "#307030", bodyType: "floating", ability: { type: "poisonSpit", damage: 7, cooldown: 3800, element: "shadow", range: 22 } },
    { emoji: "🐻", name: "Niedźwiedź Budzik", hp: 55, resist: null, loot: { copper: 20 }, rarity: "rare", bodyColor: "#6a4a2a", armorColor: "#4a3018", bodyType: "quadruped", ability: { type: "charge", damage: 15, cooldown: 6000, element: null, range: 30 } },
  ],
  mushroom: [
    { emoji: "🧚", name: "Mroczna Wróżka", hp: 35, resist: null, loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#8060a0", armorColor: "#504070", bodyType: "floating", ability: null },
    { emoji: "🕷️", name: "Pająk Gigant", hp: 40, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#3a3a3a", armorColor: "#1a1a1a", bodyType: "spider", ability: { type: "poisonSpit", damage: 7, cooldown: 4000, element: "shadow", range: 22 } },
  ],
  swamp: [
    { emoji: "🐊", name: "Krokodyl Bagien", hp: 30, resist: "ice", loot: { copper: 10 }, rarity: "common", bodyColor: "#506030", armorColor: "#304020", bodyType: "serpent", ability: { type: "charge", damage: 12, cooldown: 6000, element: null, range: 25 } },
    { emoji: "🫧", name: "Bagiennik", hp: 45, resist: "ice", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#506050", armorColor: "#304030", bodyType: "humanoid", ability: null },
    { emoji: "🐸", name: "Żabi Czarnoksiężnik", hp: 50, resist: "ice", loot: { copper: 18 }, rarity: "rare", bodyColor: "#408040", armorColor: "#205020", bodyType: "frog", ability: { type: "poisonSpit", damage: 9, cooldown: 4000, element: "shadow", range: 22 } },
  ],
  meteor: [
    { emoji: "☄️", name: "Ognisty Strażnik", hp: 80, resist: "fire", loot: { silver: 2 }, rarity: "epic", bodyColor: "#8a4020", armorColor: "#5a2010", bodyType: "floating", ability: { type: "fireBreath", damage: 14, cooldown: 4500, element: "fire", range: 22 } },
    { emoji: "🌑", name: "Cień Meteorytu", hp: 60, resist: null, loot: { silver: 1, copper: 20 }, rarity: "rare", bodyColor: "#2a2040", armorColor: "#6040a0", bodyType: "floating", ability: { type: "shadowBolt", damage: 10, cooldown: 4000, element: "shadow", range: 28 } },
    { emoji: "💫", name: "Gwiezdna Bestia", hp: 100, resist: null, loot: { silver: 3 }, rarity: "legendary", bodyColor: "#303060", armorColor: "#202048", bodyType: "serpent", ability: { type: "charge", damage: 20, cooldown: 5000, element: null, range: 35 } },
  ],
};

// Spells the player can cast – each has mana cost, cooldown (ms), damage, element
// learned: false = requires learning from a wizard POI
export const SPELLS = [
  { id: "fireball",  icon: "🔥", name: "Kula Ognia",    color: "#ff6020", colorLight: "#ffb060", desc: "Ognista kula eksploduje przy trafieniu", manaCost: 8,  cooldown: 3000, damage: 25, element: "fire", learned: true },
  { id: "lightning",  icon: "⚡", name: "Piorun",         color: "#f0e060", colorLight: "#fffff0", desc: "Błyskawica uderza z nieba",            manaCost: 12, cooldown: 5000, damage: 35, element: "lightning", learned: true },
  { id: "icelance",   icon: "🧊", name: "Lodowa Lanca",  color: "#40c0ff", colorLight: "#c0f0ff", desc: "Lodowy pocisk przeszywa cel",          manaCost: 6,  cooldown: 2500, damage: 18, element: "ice", learned: true },
  { id: "shadowbolt", icon: "💀", name: "Cień Śmierci",  color: "#a040e0", colorLight: "#d0a0ff", desc: "Mroczna energia pochłania duszę",      manaCost: 10, cooldown: 4000, damage: 30, element: "shadow", learned: true },
  { id: "holybeam",   icon: "✨", name: "Święty Promień", color: "#d4a030", colorLight: "#fff8d0", desc: "Złoty blask oczyszcza zło",            manaCost: 15, cooldown: 6000, damage: 40, element: "holy", learned: true },
  { id: "summon",     icon: "⚔️", name: "Przywołaj Rycerza", color: "#40e060", colorLight: "#a0ffa0", desc: "Przywołuje rycerza (koszt: monety)", manaCost: 0, cooldown: 15000, damage: 0, element: "summon", learned: true },
  // Hidden spells – unlocked via wizard POI
  { id: "meteor",    icon: "☄️", name: "Deszcz Meteorów", color: "#ff4020", colorLight: "#ff8060", desc: "Ogniste głazy spadają z nieba",         manaCost: 20, cooldown: 8000, damage: 50, element: "fire", learned: false, aoe: true },
  { id: "blizzard",  icon: "🌨️", name: "Zamieć",         color: "#80d0ff", colorLight: "#d0f0ff", desc: "Lodowa burza zamraża okolicę",          manaCost: 18, cooldown: 7000, damage: 35, element: "ice", learned: false, aoe: true },
  { id: "drain",     icon: "🩸", name: "Wyssanie Życia",  color: "#c02060", colorLight: "#ff80a0", desc: "Kradnie życie i leczy rzucającego",     manaCost: 14, cooldown: 5000, damage: 28, element: "shadow", learned: false },
  { id: "chainlightning", icon: "⛈️", name: "Łańcuch Błyskawic", color: "#e0e040", colorLight: "#ffff80", desc: "Piorun przeskakuje między wrogami", manaCost: 22, cooldown: 6000, damage: 30, element: "lightning", learned: false, aoe: true },
  { id: "earthquake", icon: "🌍", name: "Trzęsienie Ziemi", color: "#8a6030", colorLight: "#c0a060", desc: "Ziemia drży, ogłuszając wrogów",       manaCost: 16, cooldown: 7000, damage: 45, element: "holy", learned: false, aoe: true },
];

// Resistance labels for messages
export const RESIST_NAMES = {
  fire: "ogień",
  ice: "lód",
};

// Pick a random NPC for a given biome id
export function pickNpc(biomeId) {
  const pool = BIOME_NPCS[biomeId];
  if (!pool || pool.length === 0) return null;
  const npc = pool[Math.floor(Math.random() * pool.length)];
  return { ...npc, biomeId };
}

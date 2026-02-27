import { BIOME_NPCS } from "./npcs";
import { RARITY_L, RARITY_C } from "./treasures";

// Flat list of all unique NPCs with stable composite keys
export const ALL_NPCS = [];
const seen = new Set();
for (const [biomeId, npcs] of Object.entries(BIOME_NPCS)) {
  for (const npc of npcs) {
    const key = `${biomeId}::${npc.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ALL_NPCS.push({
      id: key,
      biomeId,
      emoji: npc.emoji,
      name: npc.name,
      hp: npc.hp,
      resist: npc.resist,
      loot: npc.loot,
      rarity: npc.rarity || "common",
    });
  }
}

// Knowledge bonus per card rarity
export const CARD_KNOWLEDGE = {
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 10,
  legendary: 25,
};

// Base chance that a card drops on NPC kill
export const CARD_DROP_CHANCE = 0.20;

// Roll for card drop using NPC's fixed rarity.
// Returns {npcId, rarity, knowledge, rarityLabel, rarityColor} or null.
export function rollCardDrop(biomeId, npcName, npcRarity) {
  if (!biomeId || !npcName) return null;
  if (Math.random() > CARD_DROP_CHANCE) return null;

  const rarity = npcRarity || "common";
  const npcId = `${biomeId}::${npcName}`;
  return {
    npcId,
    rarity,
    knowledge: CARD_KNOWLEDGE[rarity],
    rarityLabel: RARITY_L[rarity],
    rarityColor: RARITY_C[rarity],
  };
}

// Polish biome names for bestiary headers
export const BIOME_NAMES = {
  jungle: "Dżungla",
  island: "Wyspa",
  desert: "Pustynia",
  winter: "Kraina Lodu",
  city: "Miasto",
  volcano: "Ziemia Ognia",
  summer: "Letnia Polana",
  autumn: "Jesienny Las",
  spring: "Wiosenna Łąka",
  mushroom: "Grzybowy Gaj",
  swamp: "Mroczne Bagna",
  meteor: "Meteoryt",
};

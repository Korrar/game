// System Reputacji i Frakcji
// 4 frakcje pirackie z unikalnymi bonusami, sklepami i przeciwnikami

export const FACTIONS = [
  {
    id: "merchants_guild",
    icon: "shop",
    name: "Gildia Handlarzy",
    desc: "Bogaci kupcy kontrolujący szlaki handlowe",
    color: "#d4a030",
    bgColor: "rgba(212,160,48,0.15)",
    bonuses: [
      { minRep: 10,  desc: "Sklep tańszy o 10%",         effect: { shopDiscount: 0.10 } },
      { minRep: 30,  desc: "Sklep tańszy o 20%, +1 przedmiot w ofercie", effect: { shopDiscount: 0.20, extraShopItem: 1 } },
      { minRep: 60,  desc: "Sklep tańszy o 30%, ekskluzywne przedmioty", effect: { shopDiscount: 0.30, exclusiveItems: true } },
      { minRep: 100, desc: "Darmowy przedmiot co 5 pokoi", effect: { shopDiscount: 0.30, exclusiveItems: true, freeItemInterval: 5 } },
    ],
    exclusiveItems: [
      { icon: "gem", name: "Diament Handlowy", desc: "Wart fortunę — natychmiastowe 5 srebrnych", cost: { silver: 2 }, reward: { silver: 5 }, type: "trade" },
      { icon: "scroll", name: "Handlowy Immunitet", desc: "Kupcy nie atakują przez 5 pokoi", cost: { silver: 3 }, reward: { factionProtection: 5 }, type: "protection" },
    ],
    hostileNpcs: [
      { icon: "recruit", name: "Najemnik Gildii", hp: 50, resist: null, loot: { copper: 25 }, rarity: "uncommon", bodyColor: "#8a7a40", armorColor: "#6a5a20", bodyType: "humanoid", ability: null },
    ],
  },
  {
    id: "treasure_hunters",
    icon: "compass",
    name: "Łowcy Skarbów",
    desc: "Poszukiwacze przygód szukający starożytnych artefaktów",
    color: "#40a8b8",
    bgColor: "rgba(64,168,184,0.15)",
    bonuses: [
      { minRep: 10,  desc: "+15% szans na skrzynię",     effect: { chestChanceBonus: 0.15 } },
      { minRep: 30,  desc: "+25% szans na skrzynię, lepsza rzadkość", effect: { chestChanceBonus: 0.25, rarityBoost: 1 } },
      { minRep: 60,  desc: "+35% szans, szansa na epicki skarb", effect: { chestChanceBonus: 0.35, rarityBoost: 2 } },
      { minRep: 100, desc: "Gwarantowana skrzynia co 3 pokoje", effect: { chestChanceBonus: 0.35, rarityBoost: 2, guaranteedChestInterval: 3 } },
    ],
    exclusiveItems: [
      { icon: "compass", name: "Kompas Skarbów", desc: "Wskazuje ukryte skarby — +50% wartości loot", cost: { silver: 4 }, reward: { lootMult: 1.50 }, type: "passive" },
      { icon: "scroll", name: "Mapa Starożytnych", desc: "Ujawnia ukryty pokój ze skarbem", cost: { silver: 5 }, reward: { hiddenRoom: true }, type: "map" },
    ],
    hostileNpcs: [
      { icon: "recruit", name: "Rywalski Łowca", hp: 45, resist: null, loot: { copper: 20, treasure: true }, rarity: "rare", bodyColor: "#4a8a8a", armorColor: "#2a6a6a", bodyType: "humanoid", ability: { type: "charge", damage: 12, cooldown: 4500, element: null, range: 25 } },
    ],
  },
  {
    id: "shadow_council",
    icon: "skull",
    name: "Rada Cieni",
    desc: "Tajemnicza organizacja nekromantów i mrocznych magów",
    color: "#a050e0",
    bgColor: "rgba(160,80,224,0.15)",
    bonuses: [
      { minRep: 10,  desc: "+10% obrażeń cienia",        effect: { shadowDmgMult: 1.10 } },
      { minRep: 30,  desc: "+20% obrażeń cienia, mroczna regeneracja", effect: { shadowDmgMult: 1.20, darkRegen: 1 } },
      { minRep: 60,  desc: "+30% obrażeń, wskrzeszanie wrogów jako sojuszników", effect: { shadowDmgMult: 1.30, necroChance: 0.15 } },
      { minRep: 100, desc: "Cienie chronią konwój — 20% szans na unik obrażeń", effect: { shadowDmgMult: 1.30, necroChance: 0.15, shadowDodge: 0.20 } },
    ],
    exclusiveItems: [
      { icon: "skull", name: "Nekromancki Gryf", desc: "Zabici wrogowie mogą walczyć za ciebie", cost: { silver: 4 }, reward: { necroChance: 0.25 }, type: "passive" },
      { icon: "vortex", name: "Mroczny Portal", desc: "Teleportuje konwój — pomiń 2 pokoje", cost: { silver: 6 }, reward: { skipRooms: 2 }, type: "teleport" },
    ],
    hostileNpcs: [
      { icon: "ghost", name: "Widmowy Strażnik", hp: 60, resist: "shadow", loot: { copper: 30 }, rarity: "rare", bodyColor: "#6040a0", armorColor: "#402060", bodyType: "floating", ability: { type: "shadowBolt", damage: 14, cooldown: 3500, element: "shadow", range: 30 } },
    ],
  },
  {
    id: "royal_navy",
    icon: "anchor",
    name: "Królewska Marynarka",
    desc: "Regularne siły zbrojne z dobrym uzbrojeniem",
    color: "#4060c0",
    bgColor: "rgba(64,96,192,0.15)",
    bonuses: [
      { minRep: 10,  desc: "Konwój +1 pancerza",          effect: { caravanArmorBonus: 1 } },
      { minRep: 30,  desc: "+2 pancerza, +20 HP konwoju",  effect: { caravanArmorBonus: 2, caravanHpBonus: 20 } },
      { minRep: 60,  desc: "+3 pancerza, najemnicy +15% HP", effect: { caravanArmorBonus: 3, caravanHpBonus: 20, mercHpMult: 1.15 } },
      { minRep: 100, desc: "Eskorta wojskowa — 2 darmowych najemników", effect: { caravanArmorBonus: 3, caravanHpBonus: 30, mercHpMult: 1.15, freeEscort: 2 } },
    ],
    exclusiveItems: [
      { icon: "shield", name: "Królewski Pancerz", desc: "Konwój +5 pancerza na 5 pokoi", cost: { silver: 3 }, reward: { tempArmor: 5, duration: 5 }, type: "buff" },
      { icon: "cannon", name: "Armata Królewska", desc: "+30% obrażeń armat na 10 pokoi", cost: { silver: 5 }, reward: { cannonDmgMult: 1.30, duration: 10 }, type: "buff" },
    ],
    hostileNpcs: [
      { icon: "recruit", name: "Królewski Strażnik", hp: 55, resist: null, loot: { copper: 22, silver: 1 }, rarity: "uncommon", bodyColor: "#4050a0", armorColor: "#202860", bodyType: "humanoid", ability: null },
    ],
  },
];

// Akcje wpływające na reputację
export const REP_ACTIONS = {
  kill_faction_enemy:   -5,   // zabicie NPC wrogiej frakcji danej frakcji = +rep dla frakcji
  help_faction_event:   +10,  // pomoc w wydarzeniu frakcyjnym
  betray_faction:       -20,  // zdrada frakcji
  trade_with_faction:   +3,   // handel z kupcem frakcyjnym
  complete_faction_quest: +15, // ukończenie questa frakcyjnego
  donate_to_faction:    +5,   // dotacja (1 srebrny = +5 rep)
};

// Questy frakcyjne — pojawiają się losowo gdy rep >= 20
export const FACTION_QUESTS = [
  {
    factionId: "merchants_guild",
    id: "deliver_goods",
    name: "Dostawa Towaru",
    desc: "Dostarcz ładunek przez 3 pokoje bez utraty HP konwoju",
    icon: "treasure",
    requirement: { surviveRooms: 3, noCaravanDamage: true },
    reward: { rep: 20, silver: 3 },
  },
  {
    factionId: "treasure_hunters",
    id: "find_artifact",
    name: "Poszukiwanie Artefaktu",
    desc: "Znajdź rzadki lub lepszy skarb w ciągu 5 pokoi",
    icon: "gem",
    requirement: { findTreasure: "rare", withinRooms: 5 },
    reward: { rep: 20, treasure: "epic" },
  },
  {
    factionId: "shadow_council",
    id: "dark_ritual",
    name: "Mroczny Rytuał",
    desc: "Zabij 15 wrogów w ciągu 3 pokoi",
    icon: "skull",
    requirement: { killCount: 15, withinRooms: 3 },
    reward: { rep: 20, mana: 50, knowledge: 15 },
  },
  {
    factionId: "royal_navy",
    id: "patrol_duty",
    name: "Patrol Morski",
    desc: "Ukończ 5 pokoi bez utraty najemnika",
    icon: "shield",
    requirement: { surviveRooms: 5, noMercDeath: true },
    reward: { rep: 25, caravanHeal: 30, silver: 2 },
  },
];

export function getFactionBonus(factionId, reputation) {
  const faction = FACTIONS.find(f => f.id === factionId);
  if (!faction) return null;
  let bestBonus = null;
  for (const bonus of faction.bonuses) {
    if (reputation >= bonus.minRep) bestBonus = bonus;
  }
  return bestBonus;
}

export function getFactionHostility(factionId, reputation) {
  if (reputation < -20) return "hostile";   // frakcja atakuje
  if (reputation < 0) return "unfriendly";  // frakcja odmawia handlu
  if (reputation < 10) return "neutral";    // brak bonusów
  return "friendly";                        // bonusy aktywne
}

export function rollFactionQuest(factionId, reputation) {
  if (reputation < 20) return null;
  if (Math.random() > 0.15) return null; // 15% szans per pokój
  const quests = FACTION_QUESTS.filter(q => q.factionId === factionId);
  if (quests.length === 0) return null;
  return quests[Math.floor(Math.random() * quests.length)];
}

// Losowe wydarzenie frakcyjne na mapie
export function rollFactionEvent() {
  if (Math.random() > 0.10) return null; // 10% per pokój
  const faction = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
  return {
    factionId: faction.id,
    factionName: faction.name,
    factionIcon: faction.icon,
    factionColor: faction.color,
    type: Math.random() < 0.6 ? "trade" : "quest",
  };
}

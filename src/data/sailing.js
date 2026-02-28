// System Morski — żegluga między biomami
// Mini-gra żeglarska z wydarzeniami losowymi na morzu

export const SHIP_UPGRADES = [
  {
    id: "hull_1",
    category: "hull",
    level: 1,
    icon: "shield",
    name: "Wzmocniony Kadłub",
    desc: "Statek wytrzymuje 1 dodatkowe trafienie na morzu",
    cost: { silver: 3 },
    effect: { extraHits: 1 },
  },
  {
    id: "hull_2",
    category: "hull",
    level: 2,
    icon: "shield",
    name: "Dębowy Kadłub",
    desc: "Statek wytrzymuje 2 dodatkowe trafienia, -20% obrażeń",
    cost: { silver: 8 },
    effect: { extraHits: 2, damageTakenMult: 0.80 },
    requires: "hull_1",
  },
  {
    id: "sails_1",
    category: "sails",
    level: 1,
    icon: "feather",
    name: "Płócienne Żagle",
    desc: "+20% szybkość podróży morskiej",
    cost: { silver: 2 },
    effect: { speedMult: 1.20 },
  },
  {
    id: "sails_2",
    category: "sails",
    level: 2,
    icon: "feather",
    name: "Jedwabne Żagle",
    desc: "+40% szybkość, szansa na uniknięcie burz",
    cost: { silver: 6 },
    effect: { speedMult: 1.40, stormDodgeChance: 0.30 },
    requires: "sails_1",
  },
  {
    id: "cannons_1",
    category: "cannons",
    level: 1,
    icon: "cannon",
    name: "Lekkie Działa",
    desc: "Statek może odpierać piratów morskich",
    cost: { silver: 4 },
    effect: { canFight: true, shipDamage: 15 },
  },
  {
    id: "cannons_2",
    category: "cannons",
    level: 2,
    icon: "cannon",
    name: "Ciężkie Działa",
    desc: "Podwójne obrażenia, szansa na zatopienie wrogiego statku",
    cost: { silver: 10 },
    effect: { canFight: true, shipDamage: 30, sinkChance: 0.25 },
    requires: "cannons_1",
  },
  {
    id: "crow_nest",
    category: "special",
    level: 1,
    icon: "spyglass",
    name: "Bocianowe Gniazdo",
    desc: "Podgląd wydarzeń morskich z wyprzedzeniem",
    cost: { silver: 3 },
    effect: { scoutEvents: true },
  },
  {
    id: "cargo_hold",
    category: "special",
    level: 1,
    icon: "treasure",
    name: "Większa Ładownia",
    desc: "+2 miejsca w ekwipunku",
    cost: { silver: 5 },
    effect: { extraSlots: 2 },
  },
];

// Wydarzenia morskie — losują się podczas podróży między biomami
export const SEA_EVENTS = [
  {
    id: "calm_sea",
    name: "Spokojne Morze",
    icon: "water",
    weight: 25,
    themeColor: "#4080c0",
    desc: "Spokojna podróż. Załoga odpoczywa.",
    effect: { type: "heal", value: 15 },
    resultText: "Konwój regeneruje +15 HP dzięki spokojnemu rejsowi.",
  },
  {
    id: "storm",
    name: "Sztorm!",
    icon: "lightning",
    weight: 20,
    themeColor: "#404060",
    desc: "Potężna burza szarpie statkiem! Unikaj fal!",
    effect: { type: "damage", value: 25 },
    resultText: "Sztorm uszkadza konwój — -25 HP.",
    dodgeable: true, // gracz może klikać żeby unikać
    dodgeReduction: 0.6, // udany unik = 60% mniej obrażeń
  },
  {
    id: "pirate_ship",
    name: "Piracki Korsarz!",
    icon: "pirate",
    weight: 15,
    themeColor: "#cc3030",
    desc: "Wrogi statek atakuje! Odpieraj abordaż!",
    effect: { type: "combat", enemies: 3 },
    requiresCannons: true,
    rewardOnWin: { copper: 60, silver: 1 },
    penaltyOnLoss: { copper: 40 },
    resultText: "Odparłeś piratów!",
  },
  {
    id: "floating_cargo",
    name: "Dryfujący Ładunek",
    icon: "treasure",
    weight: 18,
    themeColor: "#d4a030",
    desc: "Ładunek z zatopionego statku dryfuje na wodzie.",
    effect: { type: "loot" },
    resultText: "Znaleziono skarby wśród wraku!",
  },
  {
    id: "reef",
    name: "Rafa Koralowa!",
    icon: "rock",
    weight: 12,
    themeColor: "#cc8030",
    desc: "Rafa zagraża kadłubowi! Omijaj skały!",
    effect: { type: "damage", value: 15 },
    dodgeable: true,
    dodgeReduction: 0.8,
    resultText: "Statek ociera się o rafę — -15 HP.",
  },
  {
    id: "mysterious_island",
    name: "Tajemnicza Wyspa",
    icon: "compass",
    weight: 10,
    themeColor: "#40a050",
    desc: "Nieznana wyspa na horyzoncie! Zbadać czy ominąć?",
    effect: { type: "choice" },
    choices: [
      { label: "Zbadaj wyspę", desc: "50% szans na skarb, 50% na pułapkę", reward: { gamble: true }, icon: "spyglass" },
      { label: "Omiń wyspę", desc: "Bezpieczna podróż, brak nagrody", reward: null, icon: "compass" },
    ],
    resultText: "Odkryto tajemniczą wyspę!",
  },
  {
    id: "mermaid",
    name: "Syreni Śpiew",
    icon: "water",
    weight: 8,
    themeColor: "#60a0c0",
    desc: "Syreni śpiew niesie się po falach — kusi lub ostrzega.",
    effect: { type: "buff", manaRestore: 40, initiativeBoost: 30 },
    resultText: "Syreni śpiew dodaje mocy — +40 prochu, +30 inicjatywy.",
  },
  {
    id: "sea_monster",
    name: "Morski Potwór!",
    icon: "kraken",
    weight: 5,
    themeColor: "#2a4060",
    desc: "Macki wyłaniają się z głębin! Uciekaj lub walcz!",
    effect: { type: "boss_event" },
    choices: [
      { label: "Walcz z potworem!", desc: "Trudna walka — nagroda: legendarny przedmiot", reward: { legendaryTreasure: true }, risk: { caravanDmg: 40 }, icon: "swords" },
      { label: "Pełna naprzód!", desc: "Uciekasz z drobnym uszkodzeniem", reward: null, penalty: { caravanDmg: 10 }, icon: "feather" },
    ],
    resultText: "Morski potwór atakuje!",
  },
];

// Wyspy do eksploracji — losowane między biomami
export const DISCOVERABLE_ISLANDS = [
  { id: "gold_beach",  icon: "gold",    name: "Złota Plaża",       desc: "Piasek skrzy się złotem", loot: { gold: 1, silver: 3 }, chance: 0.08 },
  { id: "herb_island",  icon: "herb",    name: "Wyspa Ziół",        desc: "Rzadkie rośliny lecznicze", loot: { caravanHeal: 40, mana: 30 }, chance: 0.12 },
  { id: "weapon_cache", icon: "swords",  name: "Ukryty Arsenał",    desc: "Skrytka z bronią i amunicją", loot: { dynamite: 5, harpoon: 5, cannonball: 3 }, chance: 0.10 },
  { id: "ghost_wreck",  icon: "ghost",   name: "Widmowy Wrak",      desc: "Zatopiony statek pełen tajemnic", loot: { treasure: true, knowledge: 20 }, chance: 0.06 },
  { id: "tribal_camp",  icon: "recruit", name: "Obóz Tubylców",     desc: "Przyjaźni tubylcy oferują pomoc", loot: { tempMerc: true, copper: 40 }, chance: 0.10 },
];

export function rollSeaEvent() {
  const totalWeight = SEA_EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const ev of SEA_EVENTS) {
    roll -= ev.weight;
    if (roll <= 0) return { ...ev };
  }
  return { ...SEA_EVENTS[0] };
}

export function rollIslandDiscovery() {
  for (const island of DISCOVERABLE_ISLANDS) {
    if (Math.random() < island.chance) {
      return { ...island };
    }
  }
  return null;
}

// Ile wydarzeń morskich na jedną podróż (zależy od odległości biomu)
export function getSeaEventCount(fromBiomeIdx, toBiomeIdx) {
  const distance = Math.abs(toBiomeIdx - fromBiomeIdx);
  return Math.max(1, Math.min(3, distance));
}

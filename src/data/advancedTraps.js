// Zaawansowane Pułapki i Fortyfikacje
// Rozszerzenie istniejącego systemu pułapek o drzewko technologii i elementalne pułapki

export const FORTIFICATION_TREE = [
  // Tier 1 — Podstawowe fortyfikacje
  {
    id: "wooden_wall",
    tier: 1,
    icon: "wood",
    name: "Drewniana Ściana",
    desc: "Prosta bariera — wrogowie muszą ją zniszczyć (80 HP)",
    cost: { copper: 20 },
    ammoCost: null,
    stats: { hp: 80, blockRadius: 6 },
    type: "wall",
    maxCount: 4,
  },
  {
    id: "alarm_bell",
    tier: 1,
    icon: "banjo",
    name: "Dzwon Alarmowy",
    desc: "Ostrzega przed wrogami — +3s na przygotowanie, ujawnia elitarnych wrogów",
    cost: { copper: 25 },
    ammoCost: null,
    stats: { warningTime: 3000, revealElites: true },
    type: "utility",
    maxCount: 1,
  },

  // Tier 2 — Zaawansowane fortyfikacje
  {
    id: "stone_wall",
    tier: 2,
    icon: "rock",
    name: "Kamienna Ściana",
    desc: "Mocna bariera (150 HP), spowalnia wrogów w pobliżu",
    cost: { silver: 1 },
    ammoCost: null,
    stats: { hp: 150, blockRadius: 7, slowAura: 0.70 },
    type: "wall",
    maxCount: 3,
    requires: "wooden_wall",
  },
  {
    id: "poison_mine",
    tier: 2,
    icon: "poison",
    name: "Mina Trująca",
    desc: "Eksploduje trucizną — 15 obrażeń/s przez 4s w obszarze",
    cost: { copper: 30 },
    ammoCost: { type: "dynamite", amount: 1 },
    stats: { dps: 15, duration: 4000, splashRadius: 7, element: "shadow", triggerRadius: 4, singleUse: true },
    type: "ground_trap",
    maxCount: 3,
    requires: "spike_pit",
  },
  {
    id: "ice_totem",
    tier: 2,
    icon: "ice",
    name: "Lodowy Totem",
    desc: "Spowalnia wrogów w zasięgu o 40% i zadaje 3 obrażenia/s lodowe",
    cost: { silver: 1 },
    ammoCost: null,
    stats: { slowMult: 0.60, dps: 3, radius: 10, element: "ice", duration: 0 },
    type: "totem",
    maxCount: 2,
  },
  {
    id: "fire_totem",
    tier: 2,
    icon: "fire",
    name: "Ognisty Totem",
    desc: "Podpala wrogów w zasięgu — 8 obrażeń/s ogniowych",
    cost: { silver: 1 },
    ammoCost: null,
    stats: { dps: 8, radius: 8, element: "fire", duration: 0 },
    type: "totem",
    maxCount: 2,
  },

  // Tier 3 — Fortyfikacje mistrzowskie
  {
    id: "iron_fortress",
    tier: 3,
    icon: "shield",
    name: "Żelazna Twierdza",
    desc: "Niezniszczalna bariera na 15 sekund — blokuje wszystko",
    cost: { silver: 3 },
    ammoCost: { type: "cannonball", amount: 2 },
    stats: { invulnerable: true, duration: 15000, blockRadius: 8 },
    type: "wall",
    maxCount: 1,
    requires: "stone_wall",
  },
  {
    id: "lightning_spire",
    tier: 3,
    icon: "lightning",
    name: "Wieża Piorunowa",
    desc: "Automatycznie razi wrogów błyskawicą — 20 obrażeń co 2s",
    cost: { silver: 2 },
    ammoCost: null,
    stats: { autoDamage: 20, attackCd: 2000, range: 15, element: "lightning" },
    type: "turret",
    maxCount: 2,
    requires: "fire_totem",
  },
  {
    id: "shadow_trap",
    tier: 3,
    icon: "skull",
    name: "Pułapka Cienia",
    desc: "Teleportuje wrogów z powrotem na początek ścieżki",
    cost: { silver: 2 },
    ammoCost: null,
    stats: { teleportBack: true, triggerRadius: 5, cooldown: 8000, singleUse: false },
    type: "ground_trap",
    maxCount: 1,
    requires: "poison_mine",
  },

  // Tier 2 — Morskie fortyfikacje
  {
    id: "net_trap",
    tier: 2,
    icon: "anchor",
    name: "Sieć Rybacka",
    desc: "Łapie wrogów w sieć — unieruchamia na 3s, obrażenia +20%",
    cost: { copper: 35 },
    ammoCost: null,
    stats: { rootDuration: 3000, damageAmp: 0.20, triggerRadius: 6, singleUse: true },
    type: "ground_trap",
    maxCount: 3,
    requires: "spike_pit",
  },
  {
    id: "coral_barrier",
    tier: 2,
    icon: "rock",
    name: "Bariera Koralowa",
    desc: "Bariera z rafy (120 HP) — wrogowie w pobliżu dostają 4 obrażenia/s (trucizna)",
    cost: { silver: 1 },
    ammoCost: null,
    stats: { hp: 120, blockRadius: 6, dps: 4, element: "shadow", radius: 5 },
    type: "wall",
    maxCount: 2,
    requires: "wooden_wall",
  },
  {
    id: "water_geyser",
    tier: 2,
    icon: "water",
    name: "Gejzer Wodny",
    desc: "Wyrzuca wrogów w powietrze — 20 obrażeń + odrzut",
    cost: { copper: 40 },
    ammoCost: null,
    stats: { damage: 20, knockback: 15, triggerRadius: 5, cooldown: 6000, singleUse: false, element: "ice" },
    type: "ground_trap",
    maxCount: 2,
    requires: "spike_pit",
  },

  // Tier 3 — Morskie fortyfikacje zaawansowane
  {
    id: "kraken_totem",
    tier: 3,
    icon: "kraken",
    name: "Totem Krakena",
    desc: "Macki atakują wrogów w zasięgu — 12 obrażeń co 2s, spowalnia o 30%",
    cost: { silver: 3 },
    ammoCost: null,
    stats: { autoDamage: 12, attackCd: 2000, range: 12, slowMult: 0.70, element: "ice" },
    type: "turret",
    maxCount: 1,
    requires: "ice_totem",
  },
  {
    id: "cannon_emplacement",
    tier: 3,
    icon: "cannon",
    name: "Stanowisko Armatnie",
    desc: "Automatyczna armata — 30 obrażeń co 3s w dużym zasięgu, obrażenia obszarowe",
    cost: { silver: 3 },
    ammoCost: { type: "cannonball", amount: 1 },
    stats: { autoDamage: 30, attackCd: 3000, range: 20, splashRadius: 6, element: "fire" },
    type: "turret",
    maxCount: 1,
    requires: "fire_totem",
  },
];

// Elementalne kombo pułapek — bonus gdy pułapka elementalna + czar tego samego żywiołu
export const TRAP_COMBOS = [
  { trapElement: "ice",   spellElement: "fire",      name: "Parowa Eksplozja", bonusDmg: 20, bonusEffect: "stun", stunDuration: 1500, desc: "Lodowy totem + ogień = stun 1.5s + 20 bonusowych obrażeń" },
  { trapElement: "fire",  spellElement: "ice",       name: "Termiczny Szok",   bonusDmg: 15, bonusEffect: "shatter", armorReduction: 0.50, desc: "Ognisty totem + lód = -50% pancerza wroga" },
  { trapElement: "fire",  spellElement: "lightning",  name: "Przeładowanie",    bonusDmg: 25, bonusEffect: "chain", chainRange: 12, desc: "Ognisty totem + piorun = łańcuchowe obrażenia w obszarze" },
  { trapElement: "shadow", spellElement: "fire",      name: "Mroczny Płomień",  bonusDmg: 30, bonusEffect: "fear", fearDuration: 2000, desc: "Trucizna + ogień = strach — wrogowie uciekają na 2s" },
  { trapElement: "ice",   spellElement: "lightning",  name: "Zamrożony Piorun", bonusDmg: 35, bonusEffect: "execute", executeThreshold: 0.20, desc: "Lodowy totem + piorun = natychmiastowe zabicie wrogów <20% HP" },
  { trapElement: "ice",   spellElement: "ice",        name: "Absolutne Zero",   bonusDmg: 25, bonusEffect: "freeze", freezeDuration: 3000, desc: "Gejzer + lód = zamrożenie na 3s" },
  { trapElement: "shadow", spellElement: "ice",       name: "Toksyczny Lód",    bonusDmg: 20, bonusEffect: "fragile", armorReduction: 0.70, desc: "Koralowa trucizna + lód = -70% pancerza wroga" },
];

// System budowy fortyfikacji przed falą wrogów
export const FORTIFICATION_PHASE = {
  duration: 10000,   // 10 sekund na budowę (bazowo)
  maxFortifications: 6,  // limit jednocześnie aktywnych fortyfikacji
  bonusTimePerRoom: 500, // +0.5s na pokój (do max 15s)
  maxDuration: 15000,
};

export function getAvailableFortifications(unlockedIds) {
  return FORTIFICATION_TREE.filter(f => {
    if (!f.requires) return true;
    return unlockedIds.includes(f.requires);
  });
}

export function checkTrapCombo(trapElement, spellElement) {
  return TRAP_COMBOS.find(tc => tc.trapElement === trapElement && tc.spellElement === spellElement) || null;
}

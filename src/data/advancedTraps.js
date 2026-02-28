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
    id: "spike_pit",
    tier: 1,
    icon: "spike",
    name: "Wilcza Jama",
    desc: "Ukryta jama z kolcami — 25 obrażeń, spowalnia o 50%",
    cost: { copper: 15 },
    ammoCost: null,
    stats: { damage: 25, slowMult: 0.50, triggerRadius: 5, singleUse: true },
    type: "ground_trap",
    maxCount: 5,
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
];

// Elementalne kombo pułapek — bonus gdy pułapka elementalna + czar tego samego żywiołu
export const TRAP_COMBOS = [
  { trapElement: "ice",   spellElement: "fire",      name: "Parowa Eksplozja", bonusDmg: 20, bonusEffect: "stun", stunDuration: 1500, desc: "Lodowy totem + ogień = stun 1.5s + 20 bonusowych obrażeń" },
  { trapElement: "fire",  spellElement: "ice",       name: "Termiczny Szok",   bonusDmg: 15, bonusEffect: "shatter", armorReduction: 0.50, desc: "Ognisty totem + lód = -50% pancerza wroga" },
  { trapElement: "fire",  spellElement: "lightning",  name: "Przeładowanie",    bonusDmg: 25, bonusEffect: "chain", chainRange: 12, desc: "Ognisty totem + piorun = łańcuchowe obrażenia w obszarze" },
  { trapElement: "shadow", spellElement: "fire",      name: "Mroczny Płomień",  bonusDmg: 30, bonusEffect: "fear", fearDuration: 2000, desc: "Trucizna + ogień = strach — wrogowie uciekają na 2s" },
  { trapElement: "ice",   spellElement: "lightning",  name: "Zamrożony Piorun", bonusDmg: 35, bonusEffect: "execute", executeThreshold: 0.20, desc: "Lodowy totem + piorun = natychmiastowe zabicie wrogów <20% HP" },
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

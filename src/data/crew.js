// System Załogi (Crew Management)
// Rekrutowalny członkowie załogi z unikalnymi bonusami pasywnymi
// Każdy ma drzewko umiejętności (3 poziomy), lojalność i relacje z innymi

export const CREW_ROLES = [
  {
    id: "navigator",
    icon: "compass",
    name: "Nawigator",
    desc: "Doświadczony żeglarz — zwiększa szanse na uniknięcie pułapek morskich",
    cost: { silver: 5 },
    rarity: "uncommon",
    bodyColor: "#4a6a8a",
    armorColor: "#2a4a6a",
    passive: { id: "fast_travel", desc: "+20% inicjatywy między pokojami", initiativeMult: 1.20 },
    skills: [
      { level: 1, name: "Szybki Kurs", desc: "+10% inicjatywy", effect: { initiativeMult: 1.10 } },
      { level: 2, name: "Czytanie Gwiazd", desc: "Podgląd następnego pokoju (jak luneta)", effect: { scoutRoom: true } },
      { level: 3, name: "Wiatr w Żagle", desc: "+30% inicjatywy, szansa na pominięcie pokoju", effect: { initiativeMult: 1.30, skipRoomChance: 0.10 } },
    ],
  },
  {
    id: "cook",
    icon: "rum",
    name: "Kucharz Okrętowy",
    desc: "Gotuje posiłki regenerujące HP statku między walkami",
    cost: { silver: 4 },
    rarity: "uncommon",
    bodyColor: "#8a6a40",
    armorColor: "#6a4a20",
    passive: { id: "meal_prep", desc: "+5 HP statku po każdym pokoju", healPerRoom: 5 },
    skills: [
      { level: 1, name: "Sycący Posiłek", desc: "+8 HP statku po pokoju", effect: { healPerRoom: 8 } },
      { level: 2, name: "Rum na Zdrowie", desc: "+15 HP statku, +10 prochu po bossie", effect: { healPerRoom: 15, manaAfterBoss: 10 } },
      { level: 3, name: "Uczta Kapitańska", desc: "+20 HP statku, +20% HP najemników", effect: { healPerRoom: 20, mercHpMult: 1.20 } },
    ],
  },
  {
    id: "gunsmith",
    icon: "gunner",
    name: "Rusznikarz",
    desc: "Naprawia i ulepsza broń — zmniejsza koszt amunicji",
    cost: { silver: 6 },
    rarity: "rare",
    bodyColor: "#6a5a4a",
    armorColor: "#4a3a2a",
    passive: { id: "ammo_save", desc: "15% szans na niezużycie amunicji", ammoSaveChance: 0.15 },
    skills: [
      { level: 1, name: "Oszczędne Ładowanie", desc: "20% szans na niezużycie amunicji", effect: { ammoSaveChance: 0.20 } },
      { level: 2, name: "Ulepszone Lufy", desc: "+10% obrażeń broni palnej", effect: { ammoSaveChance: 0.20, dmgMult: 1.10 } },
      { level: 3, name: "Mistrzowska Broń", desc: "+20% obrażeń, 30% oszczędność amunicji", effect: { ammoSaveChance: 0.30, dmgMult: 1.20 } },
    ],
  },
  {
    id: "surgeon",
    icon: "bandage",
    name: "Chirurg Polowy",
    desc: "Leczy najemników po walce i regeneruje ich HP",
    cost: { silver: 5 },
    rarity: "rare",
    bodyColor: "#5a7a5a",
    armorColor: "#3a5a3a",
    passive: { id: "field_heal", desc: "Najemnicy regenerują 2 HP/s w walce", mercRegenPerSec: 2 },
    skills: [
      { level: 1, name: "Bandażowanie", desc: "Najemnicy regenerują 3 HP/s", effect: { mercRegenPerSec: 3 } },
      { level: 2, name: "Medycyna Polowa", desc: "+4 HP/s, raz na walkę wskrzesza najemnika", effect: { mercRegenPerSec: 4, reviveOnce: true } },
      { level: 3, name: "Cudowny Doktor", desc: "+5 HP/s, najemnicy zyskują +20 max HP", effect: { mercRegenPerSec: 5, mercMaxHpBonus: 20 } },
    ],
  },
  {
    id: "quartermaster",
    icon: "treasure",
    name: "Kwatermistrz",
    desc: "Zarządza łupami — zwiększa wartość znalezionych skarbów",
    cost: { silver: 4 },
    rarity: "uncommon",
    bodyColor: "#8a7a50",
    armorColor: "#6a5a30",
    passive: { id: "loot_bonus", desc: "+20% wartości łupu ze skarbów", lootMult: 1.20 },
    skills: [
      { level: 1, name: "Bystre Oko", desc: "+30% wartości łupu", effect: { lootMult: 1.30 } },
      { level: 2, name: "Kontrabanda", desc: "+40% łupu, sklep tańszy o 15%", effect: { lootMult: 1.40, shopDiscount: 0.15 } },
      { level: 3, name: "Piracki Skarb", desc: "+60% łupu, 10% szans na podwójny skarb", effect: { lootMult: 1.60, doubleTreasureChance: 0.10 } },
    ],
  },
  {
    id: "shanty_singer",
    icon: "banjo",
    name: "Pieśniarz Morski",
    desc: "Podnosi morale — buffy dla całej załogi",
    cost: { silver: 7 },
    rarity: "epic",
    bodyColor: "#6a4a6a",
    armorColor: "#4a2a4a",
    passive: { id: "morale_boost", desc: "+5% obrażeń wszystkich najemników", mercDmgMult: 1.05 },
    skills: [
      { level: 1, name: "Szanta Bojowa", desc: "+10% obrażeń najemników", effect: { mercDmgMult: 1.10 } },
      { level: 2, name: "Pieśń Odwagi", desc: "+15% obrażeń, +10% szybkość ataku", effect: { mercDmgMult: 1.15, mercAttackSpeedMult: 0.90 } },
      { level: 3, name: "Legenda Morza", desc: "+20% obrażeń, +10% krytyk, lojalność max", effect: { mercDmgMult: 1.20, mercCritBonus: 0.10, loyaltyLock: true } },
    ],
  },
];

// Lojalność — wpływa na efektywność bonusów członka załogi
export const LOYALTY_LEVELS = [
  { min: 0,   label: "Zbuntowany",   color: "#cc3030", effectMult: 0.50 },
  { min: 20,  label: "Niezadowolony", color: "#cc8030", effectMult: 0.75 },
  { min: 40,  label: "Neutralny",    color: "#888",    effectMult: 1.00 },
  { min: 60,  label: "Lojalny",      color: "#40a040", effectMult: 1.15 },
  { min: 80,  label: "Oddany",       color: "#40c0ff", effectMult: 1.30 },
  { min: 100, label: "Fanatyczny",   color: "#d4a030", effectMult: 1.50 },
];

// Relacje między członkami załogi (synergie i konflikty)
export const CREW_RELATIONS = [
  { pair: ["cook", "surgeon"],        type: "synergy",  name: "Zdrowa Załoga",     desc: "Regeneracja statku x1.5", effect: { caravanHealMult: 1.5 } },
  { pair: ["navigator", "quartermaster"], type: "synergy", name: "Złoty Szlak",   desc: "+25% łupu z ukrytych pokoi", effect: { hiddenLootMult: 1.25 } },
  { pair: ["gunsmith", "shanty_singer"], type: "synergy", name: "Zbrojne Pieśni",  desc: "+10% obrażeń broni + szybkość ataku", effect: { weaponDmgMult: 1.10, attackSpeedMult: 0.90 } },
  { pair: ["cook", "quartermaster"],  type: "conflict", name: "Spór o Zapasy",   desc: "Kucharz -10% efektywności", effect: { penaltyRole: "cook", effectPenalty: 0.90 } },
  { pair: ["surgeon", "shanty_singer"], type: "conflict", name: "Cisza w Lazarecie", desc: "Pieśniarz -10% efektywności", effect: { penaltyRole: "shanty_singer", effectPenalty: 0.90 } },
];

// Zdarzenia buntu — gdy lojalność spadnie poniżej 20
export const MUTINY_EVENTS = [
  { text: "Członek załogi grozi dezercją!", effect: "warning", desc: "Lojalność spada szybciej" },
  { text: "Bunt na pokładzie! Członek załogi odchodzi.", effect: "desertion", desc: "Tracisz członka załogi" },
  { text: "Sabotaż! Część zapasów zniszczona.", effect: "sabotage", desc: "Tracisz 30% amunicji" },
];

export function getLoyaltyLevel(loyalty) {
  let result = LOYALTY_LEVELS[0];
  for (const lvl of LOYALTY_LEVELS) {
    if (loyalty >= lvl.min) result = lvl;
  }
  return result;
}

// Losowy członek załogi do znalezienia w wydarzeniach
export function rollCrewRecruit() {
  const available = [...CREW_ROLES].sort(() => Math.random() - 0.5);
  return available[0];
}

// Klątwy Morza — negatywne relicty z ukrytymi korzyściami
// Pojawiają się obok zwykłych reliktów, tworzą synergię z istniejącym systemem
// Każda klątwa ma jawną karę i ukrytą nagrodę za akumulację/synergie

export const CURSES = [
  {
    id: "hunger_of_depths",
    icon: "skull",
    name: "Głód Głębin",
    desc: "Tracisz 3 miedzi po każdym pokoju",
    hiddenDesc: "Za każde 50 Cu straconych: permanentnie +5% obrażeń",
    rarity: "cursed",
    penalty: { copperPerRoom: 3 },
    hiddenBonus: { type: "scaling_damage", threshold: 50, dmgPerStack: 0.05 },
    color: "#2060a0",
    glowColor: "rgba(32,96,160,0.4)",
  },
  {
    id: "fog_of_amnesia",
    icon: "fog",
    name: "Mgła Amnezji",
    desc: "Bestiariusz nie zbiera kart",
    hiddenDesc: "Nieznani wrogowie otrzymują +20% obrażeń",
    rarity: "cursed",
    penalty: { disableBestiary: true },
    hiddenBonus: { type: "unknown_enemy_dmg", value: 0.20 },
    color: "#6a6a8a",
    glowColor: "rgba(106,106,138,0.4)",
  },
  {
    id: "rusty_anchor",
    icon: "anchor",
    name: "Zardzewiała Kotwica",
    desc: "Prędkość pocisków -30%",
    hiddenDesc: "Splash radius pocisków x2",
    rarity: "cursed",
    penalty: { projectileSpeedMult: 0.7 },
    hiddenBonus: { type: "splash_mult", value: 2.0 },
    color: "#8a5a2a",
    glowColor: "rgba(138,90,42,0.4)",
  },
  {
    id: "kraken_mark",
    icon: "vortex",
    name: "Piętno Krakena",
    desc: "Co 3 pokoje losowy najemnik traci 50% HP",
    hiddenDesc: "Najemnicy poniżej 50% HP zyskują aurę strachu (wrogowie uciekają)",
    rarity: "cursed",
    penalty: { mercDrainInterval: 3, mercDrainPct: 0.5 },
    hiddenBonus: { type: "fear_aura", hpThreshold: 0.5, fearRadius: 15, fearDuration: 2000 },
    color: "#204060",
    glowColor: "rgba(32,64,96,0.4)",
  },
  {
    id: "greedy_ghost",
    icon: "ghost",
    name: "Chciwy Duch",
    desc: "Sklep droższy o 30%",
    hiddenDesc: "Zabici wrogowie mają +50% szans na drop przedmiotu",
    rarity: "cursed",
    penalty: { shopPriceMult: 1.3 },
    hiddenBonus: { type: "drop_chance_mult", value: 1.5 },
    color: "#40a060",
    glowColor: "rgba(64,160,96,0.4)",
  },
  {
    id: "bleeding_compass",
    icon: "compass",
    name: "Krwawiący Kompas",
    desc: "-20% inicjatywy ze wszystkich źródeł",
    hiddenDesc: "Ukryte pokoje pojawiają się 3x częściej",
    rarity: "cursed",
    penalty: { initiativeMult: 0.8 },
    hiddenBonus: { type: "secret_room_mult", value: 3.0 },
    color: "#a03040",
    glowColor: "rgba(160,48,64,0.4)",
  },
  {
    id: "sea_madness",
    icon: "storm",
    name: "Szaleństwo Morskie",
    desc: "Celność spada o 15% (większe hitboxy pocisków nie łapią)",
    hiddenDesc: "Każde pudło zwiększa obrażenia następnego trafienia o 10% (max 100%)",
    rarity: "cursed",
    penalty: { accuracyMult: 0.85 },
    hiddenBonus: { type: "miss_stacking_damage", perMiss: 0.10, maxStacks: 10 },
    color: "#6040a0",
    glowColor: "rgba(96,64,160,0.4)",
  },
  {
    id: "eternal_storm",
    icon: "lightning",
    name: "Wieczna Burza",
    desc: "Pogoda zawsze jest niekorzystna (storm/gale)",
    hiddenDesc: "Obrażenia piorunów +80%, odporność na pioruny",
    rarity: "cursed",
    penalty: { forceWeather: true },
    hiddenBonus: { type: "lightning_mastery", dmgMult: 1.8, resist: "lightning" },
    color: "#ffee00",
    glowColor: "rgba(255,238,0,0.4)",
  },
];

export const CURSE_RARITY_COLOR = "#6030a0";

// Synergies between curses and existing relics
export const CURSE_SYNERGIES = [
  {
    id: "glebinowy_szal",
    items: ["hunger_of_depths", "chaos_blade"],
    name: "Głębinowy Szał",
    desc: "Głód Głębin skaluje się 2x szybciej (co 25 Cu zamiast 50)",
    color: "#2060c0",
    icon: "vortex",
    effect: { modifyCurse: "hunger_of_depths", newThreshold: 25 },
  },
  {
    id: "zardzewiale_szalenstwo",
    items: ["rusty_anchor", "chaos_blade"],
    name: "Zardzewiałe Szaleństwo",
    desc: "+40% obrażeń z ogromnym splashem — chaos absolutny",
    color: "#a06030",
    icon: "fire",
    effect: { bonusDmg: 0.40, bonusSplash: 2.0 },
  },
  {
    id: "duch_handlarza",
    items: ["greedy_ghost", "golden_reaper"],
    name: "Duch Handlarza",
    desc: "Sklep droższy, ale łup x3 zamiast x2",
    color: "#40c060",
    icon: "coin",
    effect: { lootMult: 3.0, overrideGoldenReaper: true },
  },
  {
    id: "krwawa_mgla",
    items: ["fog_of_amnesia", "blood_weapon"],
    name: "Krwawa Mgła",
    desc: "Lifesteal działa na wszystkich sojuszników naraz (nie losowo)",
    color: "#a04060",
    icon: "pirateRaid",
    effect: { lifestealAllAllies: true },
  },
  {
    id: "sztormowy_pakt",
    items: ["eternal_storm", "storm_echo"],
    name: "Sztormowy Pakt",
    desc: "Rykoszety podczas burzy mają 100% szans i +30% obrażeń",
    color: "#ffcc00",
    icon: "lightning",
    effect: { guaranteedRicochet: true, ricochetDmgBonus: 0.30 },
  },
  {
    id: "szalenstwo_krakena",
    items: ["kraken_mark", "berserker"],
    name: "Szaleństwo Krakena",
    desc: "Najemnicy poniżej 50% HP zadają x3 obrażeń (zamiast x2 przy 30%)",
    color: "#304080",
    icon: "skull",
    effect: { berserkerThreshold: 0.5, berserkerMult: 3.0 },
  },
];

// Chance to be offered a curse (alongside normal relics)
export const CURSE_OFFER_CHANCE = 0.35; // 35% chance when relics are offered

// Roll a curse to offer alongside normal relics
export function rollCurseOffer(ownedCurses) {
  if (Math.random() > CURSE_OFFER_CHANCE) return null;
  const available = CURSES.filter(c => !ownedCurses.includes(c.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// Check for active curse-relic synergies
export function getActiveCurseSynergies(ownedCurses, ownedRelics) {
  const allOwned = [...ownedCurses, ...ownedRelics];
  return CURSE_SYNERGIES.filter(syn =>
    syn.items.every(itemId => allOwned.includes(itemId))
  );
}

// Calculate accumulated bonus from Hunger of Depths
export function getHungerStacks(totalCopperLost, synergies) {
  const threshold = synergies.some(s => s.id === "glebinowy_szal") ? 25 : 50;
  return Math.floor(totalCopperLost / threshold);
}

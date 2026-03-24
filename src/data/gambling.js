// System Hazardu — Kasyno / Taverna z mini-grami za walutę
// Pojawia się jako rzadki event lub POI w biome "city"
// Mini-gry: Kości Pirata, Koło Fortuny, Poker Korsarzy

// ─── GAMBLING VENUE ───────────────────────────────────────────────

export const GAMBLING_VENUE = {
  name: "Taverna Pod Złamanym Masztem",
  icon: "pirateRaid",
  desc: "Dym, rum i dźwięk kości — hazard kwitnie w każdym porcie.",
  themeColor: "#8a4020",
  themeBorder: "#4a2010",
  themeGlow: "rgba(138,64,32,0.4)",
};

// ─── DICE GAME: KOŚCI PIRATA ──────────────────────────────────────
// Player and dealer each roll 2d6, closest to 12 wins. Ties = reroll.
// Betting tiers with different payouts.

export const DICE_GAME = {
  id: "pirate_dice",
  name: "Kości Pirata",
  icon: "dice",
  desc: "Rzuć 2 kości — kto bliżej 12, ten wygrywa. Remis = dogrywka.",
  rules: "Obaj gracze rzucają 2 kości (2-12). Bliżej 12 wygrywa. Remis = ponowny rzut.",
  bets: [
    { id: "low",    name: "Ostrożny",  cost: { copper: 15 }, winReward: { copper: 25 },  loseText: "Przegrywasz 15 Cu" },
    { id: "medium", name: "Odważny",   cost: { copper: 40 }, winReward: { copper: 70 },  loseText: "Przegrywasz 40 Cu" },
    { id: "high",   name: "Szaleniec", cost: { silver: 1 },  winReward: { silver: 1, copper: 60 }, loseText: "Przegrywasz 1 Ag" },
    { id: "all_in", name: "Va Banque", cost: { silver: 2 },  winReward: { silver: 3, copper: 50 }, loseText: "Przegrywasz 2 Ag" },
  ],
  maxRounds: 3, // Best of 3 rounds
};

/**
 * Roll dice for the pirate dice game
 * @returns {{ playerRoll: number, dealerRoll: number, playerDice: number[], dealerDice: number[] }}
 */
export function rollDice() {
  const d1p = 1 + Math.floor(Math.random() * 6);
  const d2p = 1 + Math.floor(Math.random() * 6);
  const d1d = 1 + Math.floor(Math.random() * 6);
  const d2d = 1 + Math.floor(Math.random() * 6);
  return {
    playerDice: [d1p, d2p],
    dealerDice: [d1d, d2d],
    playerRoll: d1p + d2p,
    dealerRoll: d1d + d2d,
  };
}

/**
 * Determine winner: closest to 12 wins
 * @param {number} playerRoll
 * @param {number} dealerRoll
 * @returns {"player"|"dealer"|"tie"}
 */
export function diceFightResult(playerRoll, dealerRoll) {
  const pDist = Math.abs(12 - playerRoll);
  const dDist = Math.abs(12 - dealerRoll);
  if (pDist < dDist) return "player";
  if (dDist < pDist) return "dealer";
  return "tie";
}

// ─── FORTUNE WHEEL: KOŁO FORTUNY ─────────────────────────────────
// Spin a wheel with weighted segments. Cost to spin, various rewards.

export const FORTUNE_WHEEL = {
  id: "fortune_wheel",
  name: "Koło Fortuny",
  icon: "vortex",
  desc: "Zakręć kołem fortuny — nagrody od miedziaka po złoto!",
  rules: "Zapłać za obrót i zaczekaj — los zdecyduje o nagrodzie.",
  spinCost: { copper: 25 },
  maxSpins: 3, // per visit
  segments: [
    { id: "jackpot",   name: "JACKPOT!",         icon: "gold",      weight: 3,  reward: { gold: 1, silver: 2 },          color: "#d4a030" },
    { id: "big_win",   name: "Duża wygrana!",     icon: "treasure",  weight: 7,  reward: { silver: 2 },                   color: "#50a850" },
    { id: "win",       name: "Wygrana!",          icon: "coin",      weight: 15, reward: { copper: 50 },                  color: "#40a8b8" },
    { id: "small_win", name: "Mały zysk",         icon: "coin",      weight: 20, reward: { copper: 30 },                  color: "#6a8a6a" },
    { id: "ammo",      name: "Amunicja!",         icon: "dynamite",  weight: 12, reward: { ammo: { dynamite: 3, harpoon: 2 } }, color: "#a06030" },
    { id: "mana",      name: "Proch!",            icon: "gunpowder", weight: 10, reward: { mana: 30 },                    color: "#4060a0" },
    { id: "heal",      name: "Leczenie!",         icon: "bandage",   weight: 8,  reward: { heal: 10 },                    color: "#40a060" },
    { id: "nothing",   name: "Pusto...",          icon: "skull",     weight: 18, reward: {},                               color: "#4a4a4a" },
    { id: "curse",     name: "Klątwa!",           icon: "skull",     weight: 5,  reward: { caravanDmg: 5, manaLoss: 10 }, color: "#8030a0" },
    { id: "buff",      name: "Błogosławieństwo!", icon: "star",      weight: 7,  reward: { dmgBuff: 0.10, duration: 3 },  color: "#e0c040" },
  ],
};

/**
 * Spin the fortune wheel — returns a segment
 * @returns {object} The segment hit
 */
export function spinWheel() {
  const segments = FORTUNE_WHEEL.segments;
  const totalW = segments.reduce((s, seg) => s + seg.weight, 0);
  let roll = Math.random() * totalW;
  for (const seg of segments) {
    roll -= seg.weight;
    if (roll <= 0) return seg;
  }
  return segments[segments.length - 1];
}

// ─── CARD GAME: POKER KORSARZY ───────────────────────────────────
// Simplified poker: draw 3 cards, try to make pairs/triples.
// Cards are pirate-themed (swords, skulls, anchors, rum, coins).

export const CARD_GAME = {
  id: "pirate_poker",
  name: "Poker Korsarzy",
  icon: "scroll",
  desc: "Wylosuj 3 karty — pary i trójki wygrywają!",
  rules: "Dostajesz 3 karty. Para = x2 stawki. Trójka = x5 stawki. Nic = przegrana.",
  cardTypes: [
    { id: "swords",  name: "Miecze",  icon: "swords" },
    { id: "skulls",  name: "Czaszki", icon: "skull" },
    { id: "anchors", name: "Kotwice", icon: "anchor" },
    { id: "rum",     name: "Rum",     icon: "pirateRaid" },
    { id: "coins",   name: "Monety",  icon: "coin" },
    { id: "gems",    name: "Klejnoty", icon: "gem" },
  ],
  bets: [
    { id: "low",    name: "Mały zakład",  cost: { copper: 20 } },
    { id: "medium", name: "Średni zakład", cost: { copper: 50 } },
    { id: "high",   name: "Duży zakład",  cost: { silver: 1 } },
  ],
  payouts: {
    nothing: 0,     // lose bet
    pair: 2,        // 2x bet
    triple: 5,      // 5x bet
    special: 10,    // 10x bet (3 coins = jackpot)
  },
};

/**
 * Draw 3 cards and evaluate the hand
 * @returns {{ cards: object[], result: string, multiplier: number }}
 */
export function drawCards() {
  const types = CARD_GAME.cardTypes;
  const cards = [
    types[Math.floor(Math.random() * types.length)],
    types[Math.floor(Math.random() * types.length)],
    types[Math.floor(Math.random() * types.length)],
  ];

  // Count matches
  const counts = {};
  for (const c of cards) {
    counts[c.id] = (counts[c.id] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));

  // Special: 3 coins = jackpot
  if (counts.coins === 3) {
    return { cards, result: "special", multiplier: CARD_GAME.payouts.special, resultText: "JACKPOT! Trzy Monety!" };
  }
  if (maxCount === 3) {
    return { cards, result: "triple", multiplier: CARD_GAME.payouts.triple, resultText: "Trójka! Świetny wynik!" };
  }
  if (maxCount === 2) {
    return { cards, result: "pair", multiplier: CARD_GAME.payouts.pair, resultText: "Para! Niezły traf." };
  }
  return { cards, result: "nothing", multiplier: 0, resultText: "Nic... może następnym razem." };
}

// ─── GAMBLING EVENT INTEGRATION ───────────────────────────────────

/**
 * Roll which games are available at the tavern
 * @returns {string[]} Array of game IDs available
 */
export function rollAvailableGames() {
  const games = ["pirate_dice", "fortune_wheel", "pirate_poker"];
  // Always at least 2 games, sometimes all 3
  if (Math.random() < 0.4) return games;
  const shuffled = [...games].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

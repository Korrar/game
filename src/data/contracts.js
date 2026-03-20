// Piracki Kontrakt — system zakładów przed walką
// Gracz stawia miedź/srebro na spełnienie warunku, wygrana = mnożnik nagrody
// Kontrakty stackują się multiplikatywnie

export const CONTRACT_TYPES = [
  {
    id: "saber_only",
    name: "Tylko Szabla",
    icon: "swords",
    desc: "Zabij wszystkich wrogów używając wyłącznie szabli",
    condition: "no_ranged",        // nie wolno użyć żadnego pocisku
    multiplier: 5,
    difficulty: "hard",
    color: "#cc3030",
  },
  {
    id: "no_merc_death",
    name: "Nietykalny Oddział",
    icon: "shield",
    desc: "Żaden najemnik nie może zginąć",
    condition: "no_merc_death",
    multiplier: 3,
    difficulty: "medium",
    color: "#40a040",
  },
  {
    id: "no_traps",
    name: "Goły Pokład",
    icon: "rock",
    desc: "Nie używaj pułapek ani fortyfikacji",
    condition: "no_traps",
    multiplier: 2,
    difficulty: "easy",
    color: "#e0b040",
  },
  {
    id: "speed_clear",
    name: "Błyskawica",
    icon: "hourglass",
    desc: "Zakończ walkę w mniej niż 8 sekund",
    condition: "timer",
    timer: 8000,
    multiplier: 4,
    difficulty: "hard",
    color: "#ffee00",
  },
  {
    id: "headshot_master",
    name: "Między Oczy",
    icon: "lightning",
    desc: "Traf minimum 5 headshotów",
    condition: "headshot_count",
    target: 5,
    multiplier: 3,
    difficulty: "medium",
    color: "#e05040",
  },
  {
    id: "no_damage_taken",
    name: "Nieuchwytny",
    icon: "anchor",
    desc: "Statek nie otrzyma żadnych obrażeń",
    condition: "no_caravan_dmg",
    multiplier: 4,
    difficulty: "hard",
    color: "#4488ff",
  },
  {
    id: "single_element",
    name: "Czysty Żywioł",
    icon: "fire",
    desc: "Używaj tylko jednego żywiołu (bez combo)",
    condition: "single_element",
    multiplier: 2.5,
    difficulty: "medium",
    color: "#ff6020",
  },
  {
    id: "combo_chain",
    name: "Łańcuch Żywiołów",
    icon: "vortex",
    desc: "Wykonaj 4 komba elementalne w jednej walce",
    condition: "combo_count",
    target: 4,
    multiplier: 3.5,
    difficulty: "hard",
    color: "#a050e0",
  },
];

// Bet tiers — player selects one before accepting a contract
export const BET_TIERS = [
  { id: "low",    label: "Mały zakład",    cost: { copper: 20 },  color: "#cd7f32" },
  { id: "medium", label: "Średni zakład",   cost: { copper: 50 },  color: "#c0c0c8" },
  { id: "high",   label: "Wysoki zakład",   cost: { silver: 1 },   color: "#ffd700" },
  { id: "all_in", label: "Va banque!",      cost: { silver: 3 },   color: "#e04040" },
];

// Max contracts stacked at once
export const MAX_ACTIVE_CONTRACTS = 3;

// Faction-exclusive contracts (available when rep >= 30 with given faction)
export const FACTION_CONTRACTS = [
  {
    factionId: "treasure_hunters",
    id: "treasure_rush",
    name: "Gorączka Złota",
    icon: "treasure",
    desc: "Otwórz skrzynię przed zabiciem ostatniego wroga",
    condition: "chest_before_clear",
    multiplier: 6,
    difficulty: "extreme",
    color: "#d4a030",
    minRep: 30,
  },
  {
    factionId: "shadow_council",
    id: "dark_harvest",
    name: "Mroczne Żniwa",
    icon: "skull",
    desc: "Zabij 3 wrogów w ciągu 2 sekund",
    condition: "multi_kill",
    target: 3,
    timer: 2000,
    multiplier: 5,
    difficulty: "extreme",
    color: "#8844cc",
    minRep: 30,
  },
];

// Roll 2-3 contracts from the pool, optionally including faction contracts
export function rollContracts(roomNum, factionReps) {
  const pool = [...CONTRACT_TYPES];

  // Add faction contracts if reputation is high enough
  if (factionReps) {
    for (const fc of FACTION_CONTRACTS) {
      const rep = factionReps[fc.factionId] || 0;
      if (rep >= fc.minRep) pool.push(fc);
    }
  }

  // Harder contracts appear more often in later rooms
  const weighted = pool.map(c => ({
    ...c,
    _weight: c.difficulty === "easy" ? 3 : c.difficulty === "medium" ? 2 : c.difficulty === "hard" ? (roomNum > 10 ? 2 : 1) : (roomNum > 20 ? 1.5 : 0.5),
  }));

  const count = 2 + (Math.random() < 0.3 ? 1 : 0); // 2-3 contracts offered
  const selected = [];
  const remaining = [...weighted];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalW = remaining.reduce((s, c) => s + c._weight, 0);
    let roll = Math.random() * totalW;
    let picked = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      roll -= remaining[j]._weight;
      if (roll <= 0) { picked = j; break; }
    }
    selected.push(remaining[picked]);
    remaining.splice(picked, 1);
  }
  return selected;
}

// Calculate total payout for completed contracts
export function calculateContractPayout(activeContracts) {
  if (!activeContracts || activeContracts.length === 0) return null;

  let totalMultiplier = 1;
  for (const c of activeContracts) {
    totalMultiplier *= c.multiplier;
  }

  // Sum all bet costs
  const totalCost = { copper: 0, silver: 0, gold: 0 };
  for (const c of activeContracts) {
    const bet = c.bet;
    if (bet.copper) totalCost.copper += bet.copper;
    if (bet.silver) totalCost.silver += bet.silver;
    if (bet.gold) totalCost.gold += bet.gold;
  }

  // Payout = cost * total multiplier
  return {
    copper: Math.round((totalCost.copper || 0) * totalMultiplier),
    silver: Math.round((totalCost.silver || 0) * totalMultiplier),
    gold: Math.round((totalCost.gold || 0) * totalMultiplier),
    multiplier: totalMultiplier,
    contractCount: activeContracts.length,
  };
}

// Check if a specific contract condition is still valid
export function checkContractCondition(contract, state) {
  switch (contract.condition) {
    case "no_ranged":
      return !state.usedRanged;
    case "no_merc_death":
      return !state.mercDied;
    case "no_traps":
      return !state.usedTraps;
    case "timer":
      return (state.combatDuration || Infinity) < contract.timer;
    case "headshot_count":
      return (state.headshots || 0) >= contract.target;
    case "no_caravan_dmg":
      return !state.caravanTookDamage;
    case "single_element":
      return (state.elementsUsed || new Set()).size <= 1;
    case "combo_count":
      return (state.comboCount || 0) >= contract.target;
    case "chest_before_clear":
      return state.chestOpenedBeforeClear;
    case "multi_kill":
      return state.multiKillAchieved;
    default:
      return false;
  }
}

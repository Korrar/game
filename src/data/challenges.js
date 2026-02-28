// Room challenges — optional per-room objectives with rewards

export const CHALLENGE_TYPES = [
  {
    id: "speed_kill",
    name: "Szybki Strzał",
    desc: "Zabij wszystkich w 12s",
    icon: "hourglass",
    type: "timer",       // must complete kills before timer expires
    timer: 12000,
    reward: { copper: 50 },
    rewardLabel: "+50 Cu",
    minEnemies: 1,
  },
  {
    id: "no_mana",
    name: "Oszczędność",
    desc: "Nie używaj prochu (many)",
    icon: "gunpowder",
    type: "restriction",  // must not use mana during room
    reward: { dynamite: 2, harpoon: 2 },
    rewardLabel: "+2 dyn, +2 harp",
    minEnemies: 1,
  },
  {
    id: "headshot_streak",
    name: "Oko Snajpera",
    desc: "Traf 3 headshoty",
    icon: "lightning",
    type: "counter",
    target: 3,
    reward: { copper: 80 },
    rewardLabel: "+80 Cu",
    minEnemies: 2,
  },
  {
    id: "no_caravan_dmg",
    name: "Żelazna Obrona",
    desc: "Zero obrażeń karawany",
    icon: "shield",
    type: "restriction",
    reward: { silver: 1 },
    rewardLabel: "+1 Ag",
    defenseOnly: true,
  },
  {
    id: "combo_master",
    name: "Kombinator",
    desc: "Wykonaj 2 komba elementalne",
    icon: "vortex",
    type: "counter",
    target: 2,
    reward: { copper: 60 },
    rewardLabel: "+60 Cu",
    minEnemies: 2,
  },
  {
    id: "full_accuracy",
    name: "Perfekcyjny Strzał",
    desc: "Traf 5 razy bez pudła",
    icon: "swords",
    type: "counter",
    target: 5,
    reward: { cannonball: 2 },
    rewardLabel: "+2 kule",
    minEnemies: 2,
  },
];

export function rollChallenge(room, isDefense) {
  if (Math.random() > 0.40) return null; // 40% chance
  const eligible = CHALLENGE_TYPES.filter(c => {
    if (c.defenseOnly && !isDefense) return false;
    if (!c.defenseOnly && isDefense) return false;
    return true;
  });
  if (eligible.length === 0) return null;
  const ch = eligible[Math.floor(Math.random() * eligible.length)];
  return {
    ...ch,
    progress: 0,
    completed: false,
    failed: false,
    startTime: Date.now(),
  };
}

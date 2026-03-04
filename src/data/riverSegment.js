// River Ship Segment — mini-gra morska co 7 pokoi
// Gracz steruje statkiem płynącym w górę ekranu, unikając przeszkód i strzelając

export const RIVER_OBSTACLES = [
  { id: "rock_small", name: "Skała", icon: "rock", width: 40, height: 40, hp: 1, damage: 15, color: "#5a5a5a", destroyable: true, score: 5 },
  { id: "rock_large", name: "Głaz", icon: "rock", width: 60, height: 55, hp: 3, damage: 25, color: "#4a4a4a", destroyable: true, score: 10 },
  { id: "island_small", name: "Wysepka", icon: "palm", width: 80, height: 70, hp: 0, damage: 20, color: "#2d5a1e", destroyable: false, score: 0 },
  { id: "island_large", name: "Wyspa", icon: "palm", width: 120, height: 100, hp: 0, damage: 30, color: "#1a4a10", destroyable: false, score: 0 },
  { id: "whirlpool", name: "Wir", icon: "water", width: 55, height: 55, hp: 0, damage: 20, color: "#1a3a6a", destroyable: false, score: 0, pulls: true, pullStrength: 0.8 },
  { id: "barrel", name: "Beczka", icon: "treasure", width: 30, height: 30, hp: 1, damage: 0, color: "#8a6a30", destroyable: true, score: 15, loot: true },
  { id: "mine", name: "Mina Morska", icon: "fire", width: 35, height: 35, hp: 1, damage: 35, color: "#3a3a3a", destroyable: true, score: 8, explodes: true },
  { id: "wreck", name: "Wrak", icon: "anchor", width: 70, height: 50, hp: 2, damage: 15, color: "#4a3a2a", destroyable: true, score: 12, loot: true },
];

// Wave patterns define obstacle density and types per difficulty tier
export const RIVER_WAVE_PATTERNS = [
  { minDist: 0,   maxDist: 0.3, types: ["rock_small", "barrel", "rock_small"], density: 0.6, speed: 1.0 },
  { minDist: 0.3, maxDist: 0.6, types: ["rock_small", "rock_large", "island_small", "whirlpool", "barrel"], density: 0.8, speed: 1.2 },
  { minDist: 0.6, maxDist: 1.0, types: ["rock_large", "island_small", "island_large", "whirlpool", "mine", "wreck", "barrel"], density: 1.0, speed: 1.4 },
];

// Segment length scales with room number
export function getRiverSegmentConfig(roomNumber) {
  const difficulty = Math.min(3, Math.floor(roomNumber / 10) + 1);
  return {
    segmentLength: 18 + difficulty * 5, // seconds to survive (~50% longer)
    shipHp: 80 + difficulty * 10,
    shipSpeed: 7.0, // fast lateral dodging
    scrollSpeed: 4.5 + difficulty * 0.6, // much faster river current
    obstacleSpawnRate: 500 - difficulty * 60, // more frequent obstacles
    difficulty,
  };
}

// Rewards for completing the segment
export function getRiverRewards(roomNumber, hpRemaining, maxHp, score) {
  const hpRatio = hpRemaining / maxHp;
  const baseCopper = 20 + roomNumber * 3;
  const bonusCopper = Math.round(score * 1.5);
  const rewards = {
    copper: baseCopper + bonusCopper,
    silver: hpRatio >= 0.8 ? 1 : 0,
  };
  // Perfect run bonus
  if (hpRatio >= 1.0) {
    rewards.silver += 1;
    rewards.bonusText = "Perfekcyjny rejs! Bonus: +1 srebro";
  } else if (hpRatio >= 0.5) {
    rewards.bonusText = "Dobry rejs!";
  } else {
    rewards.bonusText = "Dotarłeś do brzegu...";
  }
  return rewards;
}

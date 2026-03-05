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

// ── SEA CURRENTS ──
// Visible water streams that push the ship sideways
export const SEA_CURRENTS = [
  { id: "current_weak", name: "Słaby prąd", strength: 1.2, width: 120, color: "rgba(40,160,220,0.15)", duration: [4, 7] },
  { id: "current_strong", name: "Silny prąd", strength: 2.5, width: 90, color: "rgba(30,140,200,0.25)", duration: [3, 5] },
  { id: "current_wide", name: "Szeroki prąd", strength: 1.8, width: 200, color: "rgba(50,170,230,0.18)", duration: [5, 9] },
];

// ── WEATHER EVENTS ──
// Temporary conditions that change gameplay
export const WEATHER_EVENTS = [
  { id: "fog", name: "Mgła", duration: [5, 8], minProgress: 0.15, chance: 0.3,
    desc: "Ograniczona widoczność — przeszkody widoczne dopiero z bliska" },
  { id: "storm", name: "Sztorm", duration: [4, 7], minProgress: 0.25, chance: 0.25,
    desc: "Fale kołyszą statkiem losowo" },
  { id: "side_wind", name: "Boczny wiatr", duration: [5, 8], minProgress: 0.1, chance: 0.35,
    desc: "Stały boczny wiatr popycha statek" },
  { id: "night", name: "Noc", duration: [6, 10], minProgress: 0.3, chance: 0.2,
    desc: "Ciemność — widoczny tylko krąg światła wokół statku" },
];

// ── SEA ENEMIES ──
// Moving hostile creatures with AI behavior
export const SEA_ENEMIES = [
  { id: "kraken_tentacle", name: "Macka Krakena", width: 30, height: 80, damage: 20, speed: 0,
    behavior: "tentacle", color: "#2a6a4a", spawnChance: 0.15, minProgress: 0.3,
    desc: "Wyłania się z wody i blokuje pas" },
  { id: "pirate_ship", name: "Statek Piratów", width: 50, height: 70, damage: 25, speed: 2.5,
    behavior: "ram", color: "#4a2a1a", spawnChance: 0.1, minProgress: 0.4,
    desc: "Płynie w bok, próbuje taranować" },
  { id: "shark", name: "Rekin", width: 35, height: 50, damage: 15, speed: 3.0,
    behavior: "chase", color: "#5a6a7a", spawnChance: 0.2, minProgress: 0.2,
    desc: "Podąża za statkiem" },
  { id: "jellyfish_swarm", name: "Ławica Meduz", width: 160, height: 40, damage: 10, speed: 0.5,
    behavior: "drift", color: "#8a60c0", spawnChance: 0.25, minProgress: 0.15,
    desc: "Pływa powoli, blokuje szerokie pasy" },
];

// ── BONUS GATES ──
// Buoy pairs that reward the player for passing through
export const BONUS_GATES = {
  baseWidth: 140,       // distance between buoys
  narrowWidth: 100,     // harder gate variant
  spawnInterval: [3, 5], // seconds between gate spawns
  comboMultiplier: 0.5,  // each consecutive gate adds this to reward multiplier
  maxCombo: 5,
  rewards: {
    hp: 5,              // HP restored per gate
    score: 20,          // base score per gate
  },
};

// Segment length scales with room number
export function getRiverSegmentConfig(roomNumber) {
  const difficulty = Math.min(3, Math.floor(roomNumber / 10) + 1);
  return {
    segmentLength: 18 + difficulty * 5,
    shipHp: 80 + difficulty * 10,
    shipSpeed: 7.0,
    scrollSpeed: 4.5 + difficulty * 0.6,
    obstacleSpawnRate: 500 - difficulty * 60,
    difficulty,
    // New systems config
    currentSpawnRate: 6000 - difficulty * 800,   // ms between current spawns
    weatherInterval: 12 - difficulty * 1.5,       // seconds between weather checks
    enemySpawnRate: 4000 - difficulty * 500,      // ms between enemy spawns
    gateSpawnRate: 4000 - difficulty * 300,       // ms between gate spawns
    windChangeInterval: 8 - difficulty,           // seconds between wind direction changes
  };
}

// Rewards for completing the segment
export function getRiverRewards(roomNumber, hpRemaining, maxHp, score, gatesHit = 0) {
  const hpRatio = hpRemaining / maxHp;
  const baseCopper = 20 + roomNumber * 3;
  const bonusCopper = Math.round(score * 1.5);
  const gateBonus = gatesHit * 5;
  const rewards = {
    copper: baseCopper + bonusCopper + gateBonus,
    silver: hpRatio >= 0.8 ? 1 : 0,
  };
  // Perfect run bonus
  if (hpRatio >= 1.0) {
    rewards.silver += 1;
    rewards.bonusText = "Perfekcyjny rejs! Bonus: +1 srebro";
  } else if (hpRatio >= 0.5) {
    rewards.bonusText = gatesHit > 3 ? `Dobry rejs! Bramki: ${gatesHit}` : "Dobry rejs!";
  } else {
    rewards.bonusText = "Dotarłeś do brzegu...";
  }
  if (gatesHit >= 5) {
    rewards.silver += 1;
    rewards.bonusText += " ★ Mistrz bramek!";
  }
  return rewards;
}

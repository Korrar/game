// DungeonGenerator — Procedural multi-level dungeon generation system
// Creates dungeon structures with multiple floors, stairs, hazards, and boss arenas
// Each dungeon type has unique terrain, enemies, lighting, and visual profiles

import { ISO_CONFIG } from "../utils/isometricUtils.js";

// ─── SEEDED RNG ───

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function randRange(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

// ─── DUNGEON TYPE DEFINITIONS ───

export const DUNGEON_TYPES = {
  mine: {
    name: "Opuszczona Kopalnia",
    icon: "pickaxe",
    desc: "Głębokie tunele pełne goblinów i cennych kruszców",
    minLevels: 2,
    maxLevels: 4,
    mapSize: 30, // smaller than surface (40)
    biomeOverrides: {
      skyTop: (level) => lerpColor("#4a3a2a", "#1a0a00", level / 4),
      skyBot: (level) => lerpColor("#6a5a4a", "#2a1a0a", level / 4),
      groundCol: (level) => lerpColor("#8B7355", "#4a3a25", level / 4),
      groundBot: (level) => lerpColor("#6a5a40", "#3a2a18", level / 4),
      fogCol: (level) => `rgba(0,0,0,${(0.1 + level * 0.08).toFixed(2)})`,
    },
    ambientLight: (level) => Math.max(0.25, 1.0 - level * 0.2),
    terrain: "dungeon_mine",
    lightSources: ["torch", "lantern"],
    hazards: ["cave_in", "gas_pocket"],
    scatter: ["pickaxe", "rock", "gem", "skull", "lantern"],
    waterFeatures: ["puddle"],
    vegetation: ["crystal_spire", "boulder"],
    roadStyle: "dirt",
    enemyPool: "dungeon_mine",
    bossPool: ["crystal_guardian", "deep_worm"],
    music: { root: 110, scale: "minor", bpm: 60, drone: true },
    rewards: {
      copperBase: 100,
      copperPerLevel: 60,
      silverChance: 0.3,
      relicChance: 0.15,
    },
  },
  crypt: {
    name: "Krypta Przodków",
    icon: "skull",
    desc: "Starożytne grobowce pełne niespokojnych duchów",
    minLevels: 2,
    maxLevels: 3,
    mapSize: 28,
    biomeOverrides: {
      skyTop: (level) => lerpColor("#1a1520", "#0a0508", level / 3),
      skyBot: (level) => lerpColor("#2a2030", "#100a18", level / 3),
      groundCol: (level) => lerpColor("#3a3040", "#1a1520", level / 3),
      groundBot: (level) => lerpColor("#2a2030", "#0a0510", level / 3),
      fogCol: (level) => `rgba(80,40,120,${(0.12 + level * 0.06).toFixed(2)})`,
    },
    ambientLight: (level) => Math.max(0.2, 0.8 - level * 0.2),
    terrain: "dungeon_crypt",
    lightSources: ["torch", "ghost_flame"],
    hazards: ["spirit_surge", "trap_floor"],
    scatter: ["skull", "bone", "chain", "fire", "gem"],
    waterFeatures: ["swamp_pool"],
    vegetation: ["tombstone", "dead_tree"],
    roadStyle: "cobble",
    enemyPool: "dungeon_crypt",
    bossPool: ["tomb_pharaoh", "bone_hydra"],
    music: { root: 98, scale: "phrygian", bpm: 50, drone: true },
    rewards: {
      copperBase: 120,
      copperPerLevel: 50,
      silverChance: 0.4,
      relicChance: 0.2,
    },
  },
  cave: {
    name: "Morska Grota",
    icon: "water",
    desc: "Podwodne jaskinie z bioluminescencyjną fauną",
    minLevels: 2,
    maxLevels: 3,
    mapSize: 32,
    biomeOverrides: {
      skyTop: (level) => lerpColor("#0a2a3a", "#040a1a", level / 3),
      skyBot: (level) => lerpColor("#1a4a5a", "#0a1a2a", level / 3),
      groundCol: (level) => lerpColor("#2a5a4a", "#1a3a2a", level / 3),
      groundBot: (level) => lerpColor("#1a4a3a", "#0a2a1a", level / 3),
      fogCol: (level) => `rgba(20,80,100,${(0.08 + level * 0.06).toFixed(2)})`,
    },
    ambientLight: (level) => Math.max(0.3, 0.9 - level * 0.2),
    terrain: "dungeon_cave",
    lightSources: ["crystal", "bioluminescence"],
    hazards: ["flooding", "stalactite_fall"],
    scatter: ["water", "coral", "crystal", "shell", "rock"],
    waterFeatures: ["puddle", "coral_pool"],
    vegetation: ["coral_formation", "crystal_spire", "mushroom_giant"],
    roadStyle: "dirt",
    enemyPool: "dungeon_cave",
    bossPool: ["deep_kraken", "cave_leviathan"],
    music: { root: 130, scale: "dorian", bpm: 55, drone: true },
    rewards: {
      copperBase: 90,
      copperPerLevel: 70,
      silverChance: 0.35,
      relicChance: 0.18,
    },
  },
  ruins: {
    name: "Zatopione Ruiny",
    icon: "column",
    desc: "Pozostałości starożytnej cywilizacji pod ziemią",
    minLevels: 3,
    maxLevels: 5,
    mapSize: 34,
    biomeOverrides: {
      skyTop: (level) => lerpColor("#2a2840", "#0a0818", level / 5),
      skyBot: (level) => lerpColor("#3a3850", "#1a1828", level / 5),
      groundCol: (level) => lerpColor("#4a4838", "#2a2818", level / 5),
      groundBot: (level) => lerpColor("#3a3828", "#1a1808", level / 5),
      fogCol: (level) => `rgba(60,50,30,${(0.10 + level * 0.05).toFixed(2)})`,
    },
    ambientLight: (level) => Math.max(0.2, 0.85 - level * 0.15),
    terrain: "dungeon_ruins",
    lightSources: ["torch", "crystal", "lantern"],
    hazards: ["cave_in", "trap_floor", "gas_pocket"],
    scatter: ["column", "statue", "gem", "rock", "skull"],
    waterFeatures: ["puddle", "stream"],
    vegetation: ["column_ruins", "boulder", "crystal_spire"],
    roadStyle: "cobble",
    enemyPool: "dungeon_ruins",
    bossPool: ["ancient_golem", "ruin_guardian"],
    music: { root: 146, scale: "minor", bpm: 65, drone: true },
    rewards: {
      copperBase: 150,
      copperPerLevel: 80,
      silverChance: 0.45,
      relicChance: 0.25,
    },
  },
};

// ─── DUNGEON GENERATION ───

export function generateDungeon(type, room, difficulty) {
  const config = DUNGEON_TYPES[type];
  if (!config) return null;

  const rng = makeRng(room * 317 + 91);
  const numLevels = randRange(config.minLevels, config.maxLevels, rng);
  const bossLevel = numLevels - 1;
  const mapSize = config.mapSize;

  const levels = [];
  for (let i = 0; i < numLevels; i++) {
    const levelDifficulty = difficulty + i * 0.3;
    const isBoss = i === bossLevel;

    // Generate stairs positions - avoid edges and center
    const stairsDown = i < numLevels - 1
      ? generateStairsPosition(rng, mapSize, "down", i)
      : null;
    const stairsUp = i > 0
      ? generateStairsPosition(rng, mapSize, "up", i)
      : null;
    // Level 0 exit position (back to surface)
    const exitPos = i === 0
      ? { col: Math.floor(mapSize / 2), row: mapSize - 4 }
      : null;

    levels.push({
      level: i,
      terrainData: null,       // lazy generated on first visit
      destruction: null,        // persisted destruction state
      cleared: false,
      discovered: i === 0,
      lootDrops: [],            // uncollected loot on this floor
      stairs: { down: stairsDown, up: stairsUp },
      exitPos,
      bossLevel: isBoss,
      difficulty: levelDifficulty,
      enemyCount: isBoss ? 1 : Math.floor(3 + levelDifficulty * 2 + i * 1.5),
      lightSources: generateLightSources(rng, config, mapSize, i),
      hazardSlots: isBoss ? [] : selectHazards(rng, config.hazards, i),
      config: {
        ambientLight: config.ambientLight(i),
        biomeOverrides: {
          skyTop: config.biomeOverrides.skyTop(i),
          skyBot: config.biomeOverrides.skyBot(i),
          groundCol: config.biomeOverrides.groundCol(i),
          groundBot: config.biomeOverrides.groundBot(i),
          fogCol: config.biomeOverrides.fogCol(i),
        },
      },
    });
  }

  return {
    dungeonId: `${type}_r${room}`,
    dungeonType: type,
    dungeonName: config.name,
    dungeonIcon: config.icon,
    currentLevel: 0,
    maxLevels: numLevels,
    mapSize,
    surfaceRoom: room,
    levels,
    baseDifficulty: difficulty,
    rewards: { ...config.rewards },
    enterTime: Date.now(),
    totalEnemiesKilled: 0,
    completed: false,
  };
}

// ─── STAIRS POSITION GENERATION ───

function generateStairsPosition(rng, mapSize, direction, level) {
  const margin = 4;
  const center = mapSize / 2;
  const safeRadius = 5;

  let col, row, attempts = 0;
  do {
    col = randRange(margin, mapSize - margin - 1, rng);
    row = randRange(margin, mapSize - margin - 1, rng);
    attempts++;
    // Stairs down tend toward far corners, stairs up near center
    if (direction === "down") {
      col = randRange(mapSize - margin - 8, mapSize - margin - 1, rng);
      row = randRange(margin + 2, margin + 10, rng);
    } else {
      col = randRange(margin + 2, margin + 10, rng);
      row = randRange(mapSize - margin - 8, mapSize - margin - 1, rng);
    }
  } while (
    Math.abs(col - center) < safeRadius &&
    Math.abs(row - center) < safeRadius &&
    attempts < 10
  );

  return { col, row, direction, level };
}

// ─── LIGHT SOURCE GENERATION ───

function generateLightSources(rng, config, mapSize, level) {
  const sources = [];
  const lightTypes = config.lightSources;
  // More lights on deeper levels (to compensate for darkness)
  const count = 6 + level * 2;

  for (let i = 0; i < count; i++) {
    const margin = 3;
    const col = randRange(margin, mapSize - margin, rng);
    const row = randRange(margin, mapSize - margin, rng);
    const type = lightTypes[Math.floor(rng() * lightTypes.length)];

    sources.push({
      id: `light_${level}_${i}`,
      type,
      col,
      row,
      wx: col + 0.5,
      wy: row + 0.5,
      phase: rng() * Math.PI * 2,
    });
  }

  return sources;
}

// ─── HAZARD SELECTION ───

function selectHazards(rng, hazardPool, level) {
  if (!hazardPool || hazardPool.length === 0) return [];
  // More hazard slots on deeper levels
  const count = Math.min(level + 1, 3);
  const selected = [];
  for (let i = 0; i < count; i++) {
    const hazard = hazardPool[Math.floor(rng() * hazardPool.length)];
    selected.push({
      hazardType: hazard,
      triggered: false,
      triggerWave: randRange(1, 3, rng), // triggers during this wave number
    });
  }
  return selected;
}

// ─── BOSS ARENA GENERATION ───
// Generates a special heightmap layout for boss floors

export function generateBossArenaLayout(mapSize) {
  const center = Math.floor(mapSize / 2);
  const layout = {
    arenaCenter: { col: center, row: center },
    arenaRadius: 8,
    platforms: [
      // Elevated platforms in corners for ranged advantage
      { col: center - 7, row: center - 7, width: 3, height: 3, elevation: 3 },
      { col: center + 5, row: center - 7, width: 3, height: 3, elevation: 3 },
      { col: center - 7, row: center + 5, width: 3, height: 3, elevation: 3 },
      { col: center + 5, row: center + 5, width: 3, height: 3, elevation: 3 },
    ],
    ramps: [
      // Ramps connecting arena floor to platforms
      { fromCol: center - 5, fromRow: center - 4, toCol: center - 5, toRow: center - 6, slope: true },
      { fromCol: center + 5, fromRow: center - 4, toCol: center + 5, toRow: center - 6, slope: true },
      { fromCol: center - 5, fromRow: center + 4, toCol: center - 5, toRow: center + 6, slope: true },
      { fromCol: center + 5, fromRow: center + 4, toCol: center + 5, toRow: center + 6, slope: true },
    ],
    pillars: [
      // Destructible pillars for cover
      { col: center - 3, row: center, hp: 60, alive: true },
      { col: center + 3, row: center, hp: 60, alive: true },
      { col: center, row: center - 3, hp: 60, alive: true },
      { col: center, row: center + 3, hp: 60, alive: true },
    ],
    moat: {
      type: "lava_pool", // or water depending on dungeon type
      innerRadius: 10,
      outerRadius: 12,
    },
    bossSpawn: { col: center, row: center - 4 },
    playerEntry: { col: center, row: center + 8 },
  };
  return layout;
}

// ─── DUNGEON BIOME CREATION ───
// Creates a virtual biome object for a dungeon level (used by terrain/render systems)

export function createDungeonBiome(dungeonType, level, dungeonState) {
  const config = DUNGEON_TYPES[dungeonType];
  if (!config) return null;

  const levelConfig = dungeonState.levels[level]?.config;
  const overrides = levelConfig?.biomeOverrides || {};

  return {
    id: `dungeon_${dungeonType}_${level}`,
    name: `${config.name} - Poziom ${level + 1}`,
    icon: config.icon,
    skyTop: overrides.skyTop || "#1a1a1a",
    skyBot: overrides.skyBot || "#0a0a0a",
    groundCol: overrides.groundCol || "#3a3a3a",
    groundBot: overrides.groundBot || "#2a2a2a",
    fogCol: overrides.fogCol || "rgba(0,0,0,0.15)",
    renderFn: "dungeon",
    scatter: config.scatter,
    fx: {
      caveDrops: true,
      fireflies: level < 2,
      spores: dungeonType === "cave",
      embers: dungeonType === "mine",
      fog: true,
      ghostFlames: dungeonType === "crypt",
    },
    terrain: config.terrain,
    difficulty: Math.ceil(dungeonState.baseDifficulty + level * 0.5),
    isDungeon: true,
    dungeonType,
    dungeonLevel: level,
    ambientLight: levelConfig?.ambientLight ?? 0.5,
    music: config.music,
  };
}

// ─── DUNGEON ENEMY SELECTION ───

export const DUNGEON_ENEMY_POOLS = {
  dungeon_mine: [
    "goblin_miner", "cave_bat", "rock_golem", "mine_spider", "tunnel_rat",
  ],
  dungeon_crypt: [
    "skeleton_warrior", "ghost_pirate", "tomb_scarab", "bone_archer", "wraith",
  ],
  dungeon_cave: [
    "cave_crab", "blind_fish", "stalactite_bat", "crystal_golem", "deep_eel",
  ],
  dungeon_ruins: [
    "stone_guardian", "ruin_rat", "cursed_knight", "ancient_spider", "trap_golem",
  ],
};

// ─── COLOR UTILITIES ───

function lerpColor(colorA, colorB, t) {
  t = Math.max(0, Math.min(1, t));
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return rgbToHex(r, g, bl);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(c =>
    Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")
  ).join("");
}

// TerrainFeatures — Tile overlay definitions for isometric terrain
// Roads, bridges, water features, barricades, and biome-specific decorations
// All visual elements placed as overlays on the base height map

// ─── TERRAIN OVERLAY TYPES ───

export const OVERLAY_TYPES = {
  ROAD: "road",
  BRIDGE: "bridge",
  WATER: "water",
  BARRICADE: "barricade",
  CLIFF: "cliff",
  RAMP: "ramp",
  VEGETATION: "vegetation",
  STRUCTURE: "structure",
};

// ─── ROAD DEFINITIONS ───

export const ROAD_STYLES = {
  dirt: {
    color: "#7a6030",
    borderColor: "#5a4020",
    width: 2, // tiles wide
    pattern: "solid",
  },
  cobble: {
    color: "#6a6a6a",
    borderColor: "#4a4a4a",
    width: 2,
    pattern: "cobble", // draws small rectangles
  },
  wood: {
    color: "#8a6830",
    borderColor: "#5a4020",
    width: 2,
    pattern: "plank", // draws horizontal lines
  },
  sand: {
    color: "#d4b870",
    borderColor: "#b09050",
    width: 3,
    pattern: "solid",
  },
  lava: {
    color: "#3a1a10",
    borderColor: "#1a0a08",
    width: 2,
    pattern: "cracked", // draws crack lines
    glowColor: "#ff4400",
  },
};

// ─── WATER FEATURE DEFINITIONS ───

export const WATER_FEATURES = {
  puddle: {
    minTiles: 2,
    maxTiles: 5,
    color: "#2a5a7a",
    shallowColor: "#4a8aaa",
    animated: true,
    rippleSpeed: 0.8,
    maxHeight: 1.0, // only forms below this terrain height
  },
  stream: {
    width: 1,
    color: "#3070a0",
    flowSpeed: 1.2,
    animated: true,
    particles: "water_flow",
  },
  swamp_pool: {
    minTiles: 3,
    maxTiles: 8,
    color: "#2a4a20",
    shallowColor: "#3a5a28",
    animated: true,
    rippleSpeed: 0.3,
    maxHeight: 1.5,
    bubbles: true,
  },
  lava_pool: {
    minTiles: 2,
    maxTiles: 4,
    color: "#aa2200",
    shallowColor: "#ff4400",
    animated: true,
    rippleSpeed: 0.5,
    maxHeight: 1.2,
    glow: true,
    glowColor: "#ff6600",
    damagePerSec: 8,
    element: "fire",
  },
  ice_sheet: {
    minTiles: 3,
    maxTiles: 7,
    color: "#90c0e0",
    shallowColor: "#b0e0ff",
    animated: false,
    maxHeight: 1.0,
    slippery: true,
    crackChance: 0.3,
  },
  coral_pool: {
    minTiles: 2,
    maxTiles: 4,
    color: "#2080a0",
    shallowColor: "#40a0c0",
    animated: true,
    rippleSpeed: 0.6,
    maxHeight: 1.2,
    coralColors: ["#ff6080", "#ffa040", "#a040ff"],
  },
};

// ─── VEGETATION DEFINITIONS ───
// 3D props rendered on the iso grid with height offsets

export const VEGETATION = {
  // ─── Trees ───
  palm_tree: {
    icon: "palm",
    heightOffset: 2.5, // visual height above ground (in height units)
    shadowRadius: 1.5,
    sway: { amplitude: 3, speed: 0.002 }, // wind sway animation
    blocksLOS: true,
    destructible: false,
    biomes: ["jungle", "island", "sunset_beach", "blue_lagoon"],
  },
  pine_tree: {
    icon: "pine",
    heightOffset: 3.0,
    shadowRadius: 1.2,
    sway: { amplitude: 2, speed: 0.0015 },
    blocksLOS: true,
    destructible: false,
    biomes: ["winter", "autumn", "spring"],
  },
  bamboo_cluster: {
    icon: "bamboo",
    heightOffset: 2.8,
    shadowRadius: 0.8,
    sway: { amplitude: 4, speed: 0.003 },
    blocksLOS: true,
    destructible: true,
    hp: 25,
    biomes: ["bamboo_falls"],
  },
  mushroom_giant: {
    icon: "mushroom",
    heightOffset: 2.0,
    shadowRadius: 1.8,
    sway: { amplitude: 1, speed: 0.001 },
    blocksLOS: true,
    destructible: false,
    glow: { color: "#a040ff", radius: 24, pulse: 0.003 },
    biomes: ["mushroom"],
  },
  dead_tree: {
    icon: "wood",
    heightOffset: 2.2,
    shadowRadius: 1.0,
    sway: null,
    blocksLOS: true,
    destructible: true,
    hp: 30,
    biomes: ["swamp", "underworld", "autumn"],
  },
  cactus_large: {
    icon: "cactus",
    heightOffset: 1.8,
    shadowRadius: 0.6,
    sway: null,
    blocksLOS: false,
    destructible: true,
    hp: 20,
    biomes: ["desert"],
  },
  wheat_patch: {
    icon: "wheat",
    heightOffset: 0.8,
    shadowRadius: 0.3,
    sway: { amplitude: 5, speed: 0.004 },
    blocksLOS: false,
    destructible: false,
    biomes: ["summer", "spring"],
  },
  coral_formation: {
    icon: "coral",
    heightOffset: 0.6,
    shadowRadius: 0.5,
    sway: { amplitude: 1, speed: 0.002 },
    blocksLOS: false,
    destructible: true,
    hp: 15,
    biomes: ["blue_lagoon", "island"],
  },
  crystal_spire: {
    icon: "crystal",
    heightOffset: 1.5,
    shadowRadius: 0.4,
    sway: null,
    blocksLOS: false,
    destructible: true,
    hp: 40,
    glow: { color: "#8040ff", radius: 18, pulse: 0.005 },
    biomes: ["meteor", "mushroom"],
  },
  vine_curtain: {
    icon: "vine",
    heightOffset: 2.0,
    shadowRadius: 0.3,
    sway: { amplitude: 3, speed: 0.002 },
    blocksLOS: true,
    destructible: true,
    hp: 10,
    biomes: ["jungle", "swamp", "bamboo_falls"],
  },
  column_ruins: {
    icon: "column",
    heightOffset: 3.0,
    shadowRadius: 1.0,
    sway: null,
    blocksLOS: true,
    destructible: true,
    hp: 80,
    biomes: ["olympus"],
  },
  tombstone: {
    icon: "skull",
    heightOffset: 0.8,
    shadowRadius: 0.4,
    sway: null,
    blocksLOS: false,
    destructible: true,
    hp: 25,
    glow: { color: "#40ff60", radius: 12, pulse: 0.004 },
    biomes: ["underworld"],
  },
  // ─── Rocks / Boulders ───
  boulder: {
    icon: "rock",
    heightOffset: 1.0,
    shadowRadius: 1.2,
    sway: null,
    blocksLOS: true,
    destructible: true,
    hp: 60,
    biomes: ["desert", "volcano", "autumn", "winter", "olympus"],
  },
  obsidian_rock: {
    icon: "gem",
    heightOffset: 1.2,
    shadowRadius: 0.8,
    sway: null,
    blocksLOS: true,
    destructible: true,
    hp: 50,
    glow: { color: "#ff2200", radius: 14, pulse: 0.006 },
    biomes: ["volcano"],
  },
};

// ─── STRUCTURE DEFINITIONS ───
// Buildable / prebuilt structures on the map

export const STRUCTURES = {
  wooden_barricade: {
    icon: "wood",
    heightOffset: 1.0,
    hp: 40,
    material: "wood",
    blocksLOS: true,
    blocksMovement: true,
    width: 2, // tiles wide
  },
  stone_wall: {
    icon: "rock",
    heightOffset: 1.5,
    hp: 80,
    material: "stone",
    blocksLOS: true,
    blocksMovement: true,
    width: 3,
  },
  watchtower: {
    icon: "tower",
    heightOffset: 3.0,
    hp: 60,
    material: "wood",
    blocksLOS: false,
    blocksMovement: true,
    width: 1,
    rangeBonus: 5, // tiles of extra range for units on this
    visionBonus: 8, // tiles of extra fog-of-war reveal
  },
  bridge_wooden: {
    icon: "bridge",
    heightOffset: 0.5,
    hp: 30,
    material: "wood",
    blocksLOS: false,
    blocksMovement: false,
    spansWater: true,
    width: 2,
  },
};

// ─── BIOME TERRAIN PROFILES ───
// Defines what terrain features each biome generates

export const BIOME_TERRAIN = {
  jungle: {
    terrainType: "forest",
    heightProfile: "hilly",
    roadStyle: "dirt",
    waterFeatures: ["puddle", "stream"],
    vegetation: ["palm_tree", "vine_curtain", "coral_formation"],
    vegetationDensity: 0.12,
    waterDensity: 0.06,
    roadCount: 1,
    cliffThreshold: 1.5, // height diff to create cliff edge
    ambientParticles: ["leaf_drift", "mist_ground"],
  },
  island: {
    terrainType: "coast",
    heightProfile: "gentle",
    roadStyle: "sand",
    waterFeatures: ["puddle", "coral_pool"],
    vegetation: ["palm_tree", "coral_formation"],
    vegetationDensity: 0.08,
    waterDensity: 0.10,
    roadCount: 1,
    cliffThreshold: 1.0,
    ambientParticles: ["sand_drift", "sea_spray"],
  },
  desert: {
    terrainType: "arid",
    heightProfile: "dunes",
    roadStyle: "sand",
    waterFeatures: [],
    vegetation: ["cactus_large", "boulder"],
    vegetationDensity: 0.04,
    waterDensity: 0.0,
    roadCount: 1,
    cliffThreshold: 2.0,
    ambientParticles: ["sand_drift", "heat_shimmer"],
  },
  winter: {
    terrainType: "frozen",
    heightProfile: "rugged",
    roadStyle: "dirt",
    waterFeatures: ["ice_sheet"],
    vegetation: ["pine_tree", "boulder"],
    vegetationDensity: 0.07,
    waterDensity: 0.08,
    roadCount: 1,
    cliffThreshold: 1.5,
    ambientParticles: ["snowflake_ground", "frost_sparkle"],
  },
  city: {
    terrainType: "urban",
    heightProfile: "flat",
    roadStyle: "cobble",
    waterFeatures: ["puddle"],
    vegetation: [],
    vegetationDensity: 0.0,
    waterDensity: 0.03,
    roadCount: 3,
    cliffThreshold: 2.0,
    ambientParticles: ["dust_mote", "ember_spark"],
  },
  volcano: {
    terrainType: "volcanic",
    heightProfile: "crater",
    roadStyle: "lava",
    waterFeatures: ["lava_pool"],
    vegetation: ["obsidian_rock", "boulder"],
    vegetationDensity: 0.05,
    waterDensity: 0.07,
    roadCount: 1,
    cliffThreshold: 1.0,
    ambientParticles: ["ember_ground", "smoke_vent"],
  },
  summer: {
    terrainType: "meadow",
    heightProfile: "gentle",
    roadStyle: "dirt",
    waterFeatures: ["puddle", "stream"],
    vegetation: ["wheat_patch"],
    vegetationDensity: 0.15,
    waterDensity: 0.03,
    roadCount: 2,
    cliffThreshold: 2.0,
    ambientParticles: ["pollen_drift", "grass_rustle"],
  },
  autumn: {
    terrainType: "forest",
    heightProfile: "hilly",
    roadStyle: "dirt",
    waterFeatures: ["puddle", "stream"],
    vegetation: ["dead_tree", "boulder"],
    vegetationDensity: 0.09,
    waterDensity: 0.05,
    roadCount: 1,
    cliffThreshold: 1.5,
    ambientParticles: ["leaf_drift", "mist_ground"],
  },
  spring: {
    terrainType: "meadow",
    heightProfile: "gentle",
    roadStyle: "dirt",
    waterFeatures: ["puddle", "stream"],
    vegetation: ["pine_tree", "wheat_patch"],
    vegetationDensity: 0.10,
    waterDensity: 0.05,
    roadCount: 1,
    cliffThreshold: 2.0,
    ambientParticles: ["pollen_drift", "petal_ground"],
  },
  mushroom: {
    terrainType: "cave",
    heightProfile: "rugged",
    roadStyle: "dirt",
    waterFeatures: ["puddle", "swamp_pool"],
    vegetation: ["mushroom_giant", "crystal_spire"],
    vegetationDensity: 0.10,
    waterDensity: 0.06,
    roadCount: 0,
    cliffThreshold: 1.0,
    ambientParticles: ["spore_ground", "glow_mote"],
  },
  swamp: {
    terrainType: "wetland",
    heightProfile: "low",
    roadStyle: "wood",
    waterFeatures: ["swamp_pool", "puddle"],
    vegetation: ["dead_tree", "vine_curtain"],
    vegetationDensity: 0.08,
    waterDensity: 0.15,
    roadCount: 1,
    cliffThreshold: 2.0,
    ambientParticles: ["bubble_ground", "mist_ground"],
  },
  sunset_beach: {
    terrainType: "coast",
    heightProfile: "gentle",
    roadStyle: "sand",
    waterFeatures: ["puddle", "coral_pool"],
    vegetation: ["palm_tree"],
    vegetationDensity: 0.06,
    waterDensity: 0.08,
    roadCount: 1,
    cliffThreshold: 1.5,
    ambientParticles: ["sand_drift", "sea_spray"],
  },
  bamboo_falls: {
    terrainType: "forest",
    heightProfile: "terraced",
    roadStyle: "wood",
    waterFeatures: ["stream", "puddle"],
    vegetation: ["bamboo_cluster", "vine_curtain"],
    vegetationDensity: 0.12,
    waterDensity: 0.08,
    roadCount: 1,
    cliffThreshold: 1.0,
    ambientParticles: ["mist_ground", "leaf_drift"],
  },
  blue_lagoon: {
    terrainType: "coast",
    heightProfile: "gentle",
    roadStyle: "sand",
    waterFeatures: ["coral_pool", "puddle"],
    vegetation: ["palm_tree", "coral_formation"],
    vegetationDensity: 0.07,
    waterDensity: 0.12,
    roadCount: 0,
    cliffThreshold: 1.5,
    ambientParticles: ["sea_spray", "glow_mote"],
  },
  olympus: {
    terrainType: "mountain",
    heightProfile: "peaks",
    roadStyle: "cobble",
    waterFeatures: ["stream"],
    vegetation: ["column_ruins", "boulder"],
    vegetationDensity: 0.06,
    waterDensity: 0.03,
    roadCount: 2,
    cliffThreshold: 1.0,
    ambientParticles: ["cloud_wisp", "lightning_spark"],
  },
  underworld: {
    terrainType: "cave",
    heightProfile: "rugged",
    roadStyle: "lava",
    waterFeatures: ["lava_pool", "swamp_pool"],
    vegetation: ["tombstone", "dead_tree", "crystal_spire"],
    vegetationDensity: 0.06,
    waterDensity: 0.08,
    roadCount: 1,
    cliffThreshold: 1.0,
    ambientParticles: ["ghost_wisp", "ember_ground"],
  },
  meteor: {
    terrainType: "alien",
    heightProfile: "crater",
    roadStyle: "lava",
    waterFeatures: ["lava_pool"],
    vegetation: ["crystal_spire", "obsidian_rock"],
    vegetationDensity: 0.05,
    waterDensity: 0.05,
    roadCount: 0,
    cliffThreshold: 1.0,
    ambientParticles: ["cosmic_spark", "radiation_glow"],
  },
};

// ─── HEIGHT ADVANTAGE SYSTEM ───
// Bonuses for units on elevated terrain

export const HEIGHT_ADVANTAGE = {
  // Per height unit difference
  damageBonus: 0.08, // +8% damage per height unit above target
  damagePenalty: 0.05, // -5% damage per height unit below target
  rangeBonus: 1.5, // +1.5 tile range per height unit above
  accuracyBonus: 0.05, // +5% accuracy per height unit above
  dodgePenalty: 0.03, // -3% dodge per height unit below attacker
  maxBonus: 0.30, // cap at +30% damage bonus
  maxPenalty: 0.20, // cap at -20% damage penalty
};

// ─── FOG OF WAR SETTINGS ───

export const FOG_OF_WAR = {
  defaultVision: 8, // tiles of vision radius for caravan
  mercenaryVision: 5, // tiles of vision for mercenaries
  towerVision: 10, // tiles for watchtower structures
  heightVisionBonus: 1.5, // extra tiles per height unit
  fogColor: "rgba(0,0,0,0.7)",
  exploredColor: "rgba(0,0,0,0.35)", // previously seen but not currently visible
  revealSpeed: 0.15, // lerp speed for fog reveal animation
  edgeSoftness: 2, // tiles of soft edge on fog boundary
};

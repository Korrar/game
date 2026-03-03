// Destructible obstacles — definitions per biome with HP, material, loot, and visual properties
// Materials determine element weakness/resistance and destruction particle type

export const OBSTACLE_MATERIALS = {
  wood:    { color: 0x8a6030, particle: "splinter", weakTo: "fire",      resistTo: null,        shakeIntensity: 3 },
  stone:   { color: 0x7a7a7a, particle: "rubble",   weakTo: null,        resistTo: "fire",      shakeIntensity: 2 },
  ice:     { color: 0x90c8e8, particle: "shard",     weakTo: "fire",      resistTo: "ice",       shakeIntensity: 4 },
  crystal: { color: 0xa060e0, particle: "shard",     weakTo: "lightning", resistTo: "shadow",    shakeIntensity: 5 },
  organic: { color: 0x4a8030, particle: "leaf",      weakTo: "fire",      resistTo: "poison",    shakeIntensity: 3 },
  metal:   { color: 0x8a8a9a, particle: "spark",     weakTo: "lightning", resistTo: "fire",      shakeIntensity: 1 },
  sand:    { color: 0xc4a860, particle: "dust",      weakTo: null,        resistTo: null,        shakeIntensity: 4 },
};

// Each obstacle: { type, material, hp, width, height, loot, destructible }
// width/height are CSS px for visual; loot is what drops on destruction
export const OBSTACLE_DEFS = {
  // ─── WOOD ───
  fallen_log:    { material: "wood",    hp: 40,  loot: { copper: 3 },  destructible: true  },
  driftwood:     { material: "wood",    hp: 25,  loot: { copper: 2 },  destructible: true  },
  wooden_fence:  { material: "wood",    hp: 30,  loot: { copper: 2 },  destructible: true  },
  log_pile:      { material: "wood",    hp: 50,  loot: { copper: 5 },  destructible: true  },
  haystack:      { material: "organic", hp: 20,  loot: { copper: 1 },  destructible: true  },
  scarecrow:     { material: "wood",    hp: 15,  loot: { copper: 1 },  destructible: true  },
  market_stall:  { material: "wood",    hp: 45,  loot: { copper: 6 },  destructible: true  },
  broken_wagon:  { material: "wood",    hp: 55,  loot: { copper: 5 },  destructible: true  },
  wagon_wreck:   { material: "wood",    hp: 50,  loot: { copper: 4 },  destructible: true  },
  hunting_stand: { material: "wood",    hp: 40,  loot: { copper: 4 },  destructible: true  },
  shipwreck:     { material: "wood",    hp: 70,  loot: { copper: 8, silver: 1 }, destructible: true },
  sandbag_wall:  { material: "sand",    hp: 35,  loot: { copper: 2 },  destructible: true  },
  anchor_post:   { material: "metal",   hp: 60,  loot: { copper: 5 },  destructible: true  },
  lamp_post:     { material: "metal",   hp: 50,  loot: { copper: 4 },  destructible: true  },
  windmill:      { material: "wood",    hp: 65,  loot: { copper: 6, silver: 1 }, destructible: true },

  // ─── STONE ───
  moss_boulder:       { material: "stone",   hp: 80,  loot: { copper: 4 },  destructible: true  },
  ancient_totem:      { material: "stone",   hp: 60,  loot: { copper: 5 },  destructible: true  },
  icicle_rock:        { material: "stone",   hp: 70,  loot: { copper: 3 },  destructible: true  },
  obsidian_pillar:    { material: "stone",   hp: 90,  loot: { copper: 6 },  destructible: true  },
  stone_bridge:       { material: "stone",   hp: 100, loot: { copper: 5 },  destructible: true  },
  well:               { material: "stone",   hp: 75,  loot: { copper: 4 },  destructible: true  },
  stalactite:         { material: "stone",   hp: 40,  loot: { copper: 3 },  destructible: true  },
  sun_bleached_skull: { material: "stone",   hp: 20,  loot: { copper: 1 },  destructible: true  },
  ash_mound:          { material: "sand",    hp: 15,  loot: { copper: 1 },  destructible: true  },

  // ─── ICE ───
  ice_pillar:    { material: "ice",     hp: 45,  loot: { copper: 3 },  destructible: true  },
  frozen_barrel: { material: "ice",     hp: 35,  loot: { copper: 4 },  destructible: true  },
  snowdrift:     { material: "ice",     hp: 15,  loot: { copper: 1 },  destructible: true  },

  // ─── ORGANIC ───
  vine_wall:     { material: "organic", hp: 30,  loot: { copper: 2 },  destructible: true  },
  cactus_cluster:{ material: "organic", hp: 25,  loot: { copper: 2 },  destructible: true  },
  giant_mushroom:{ material: "organic", hp: 35,  loot: { copper: 3 },  destructible: true  },
  flower_patch:  { material: "organic", hp: 10,  loot: { copper: 1 },  destructible: true  },
  beehive:       { material: "organic", hp: 20,  loot: { copper: 3 },  destructible: true  },
  mushroom_ring: { material: "organic", hp: 25,  loot: { copper: 2 },  destructible: true  },
  dead_tree:     { material: "wood",    hp: 30,  loot: { copper: 2 },  destructible: true  },
  fallen_tree:   { material: "wood",    hp: 45,  loot: { copper: 3 },  destructible: true  },
  web_wall:      { material: "organic", hp: 10,  loot: { copper: 1 },  destructible: true  },
  lily_pad:      { material: "organic", hp: 5,   loot: {},              destructible: true  },

  // ─── CRYSTAL ───
  crystal_cluster:{ material: "crystal", hp: 50, loot: { copper: 6 },  destructible: true  },

  // ─── INDESTRUCTIBLE / TERRAIN ───
  tide_pool:     { material: "stone",   hp: 0,   loot: {},              destructible: false },
  lava_pool:     { material: "stone",   hp: 0,   loot: {},              destructible: false },
  steam_vent:    { material: "stone",   hp: 0,   loot: {},              destructible: false },
  quicksand:     { material: "sand",    hp: 0,   loot: {},              destructible: false },
  fog_pool:      { material: "organic", hp: 0,   loot: {},              destructible: false },
  tumbleweed:    { material: "organic", hp: 0,   loot: {},              destructible: false },
};

// Material weakness multiplier: 2x damage from weak element
export const WEAKNESS_MULT = 2.0;
// Material resistance multiplier: 0.25x damage from resisted element
export const RESIST_MULT = 0.25;

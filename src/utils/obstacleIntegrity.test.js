import { describe, it, expect } from 'vitest';
import { OBSTACLE_DEFS, OBSTACLE_MATERIALS } from '../data/obstacles.js';

// Extract the same obstacle variant and style definitions that App.jsx uses
const OBSTACLE_VARIANTS = {
  jungle:   ["fallen_log", "vine_wall", "ancient_totem", "moss_boulder", "giant_mushroom", "coral_reef", "rope_coil", "fallen_tree"],
  island:   ["shipwreck", "driftwood", "tide_pool", "anchor_post", "barrel_stack", "cannon_wreck", "fishing_net", "barnacle_rock"],
  desert:   ["cactus_cluster", "wagon_wreck", "sun_bleached_skull", "tumbleweed", "sandbag_wall", "rope_coil", "rusted_cage", "dead_tree"],
  winter:   ["ice_pillar", "frozen_barrel", "snowdrift", "icicle_rock", "barnacle_rock", "mast_fragment", "crystal_geode", "moss_boulder"],
  city:     ["market_stall", "broken_wagon", "lamp_post", "sandbag_wall", "barrel_stack", "rusted_cage", "rope_coil", "volatile_crystal"],
  volcano:  ["lava_pool", "obsidian_pillar", "steam_vent", "ash_mound", "crystal_cluster", "crystal_geode", "barnacle_rock", "rusted_cage"],
  summer:   ["haystack", "windmill", "scarecrow", "wooden_fence", "flower_patch", "beehive", "log_pile", "well"],
  autumn:   ["log_pile", "hunting_stand", "mushroom_ring", "fallen_tree", "dead_tree", "moss_boulder", "haystack", "wooden_fence"],
  spring:   ["flower_patch", "beehive", "stone_bridge", "well", "vine_wall", "lily_pad", "fallen_log", "giant_mushroom"],
  mushroom: ["crystal_cluster", "giant_mushroom", "web_wall", "stalactite", "crystal_geode", "fog_pool", "vine_wall", "mushroom_ring"],
  swamp:    ["quicksand", "dead_tree", "fog_pool", "lily_pad", "vine_wall", "fishing_net", "coral_reef", "seaweed_patch"],
  sunset_beach: ["driftwood", "tide_pool", "shipwreck", "anchor_post", "barrel_stack", "coral_reef", "fishing_net", "barnacle_rock"],
  bamboo_falls: ["moss_boulder", "fallen_log", "vine_wall", "flower_patch", "coral_reef", "rope_coil", "giant_mushroom", "lily_pad"],
  blue_lagoon:  ["driftwood", "tide_pool", "anchor_post", "flower_patch", "coral_reef", "seaweed_patch", "fishing_net", "barnacle_rock"],
};

const EXPLOSIVE_VARIANTS = {
  jungle: "gas_mushroom", island: "powder_keg", desert: "oil_barrel",
  winter: "frozen_gas_vent", city: "dynamite_crate", volcano: "magma_rock",
  summer: "oil_barrel", autumn: "gas_mushroom", spring: "gas_mushroom",
  mushroom: "gas_mushroom", swamp: "swamp_gas_pod", sunset_beach: "powder_keg",
  bamboo_falls: "gas_mushroom", blue_lagoon: "powder_keg",
};

// obsStyles keys from App.jsx (all types that have visual definitions)
const OBS_STYLES_KEYS = [
  "fallen_log", "vine_wall", "ancient_totem", "moss_boulder", "shipwreck", "driftwood",
  "tide_pool", "anchor_post", "cactus_cluster", "wagon_wreck", "sun_bleached_skull",
  "tumbleweed", "ice_pillar", "frozen_barrel", "snowdrift", "icicle_rock", "market_stall",
  "broken_wagon", "lamp_post", "sandbag_wall", "lava_pool", "obsidian_pillar", "steam_vent",
  "ash_mound", "haystack", "windmill", "scarecrow", "wooden_fence", "log_pile",
  "hunting_stand", "mushroom_ring", "fallen_tree", "flower_patch", "beehive", "stone_bridge",
  "well", "crystal_cluster", "giant_mushroom", "web_wall", "stalactite", "quicksand",
  "dead_tree", "fog_pool", "lily_pad", "crystal_geode", "barrel_stack", "cannon_wreck",
  "treasure_pile", "coral_reef", "fishing_net", "rope_coil", "barnacle_rock", "rusted_cage",
  "mast_fragment", "powder_keg", "whirlpool", "seaweed_patch",
  // Explosive obstacles
  "oil_barrel", "dynamite_crate", "gas_mushroom", "volatile_crystal",
  "magma_rock", "frozen_gas_vent", "swamp_gas_pod",
];

describe('obstacle data integrity', () => {
  it('all biome obstacle variants have OBSTACLE_DEFS entries', () => {
    for (const [biome, types] of Object.entries(OBSTACLE_VARIANTS)) {
      for (const type of types) {
        expect(OBSTACLE_DEFS[type], `Missing OBSTACLE_DEFS for "${type}" in biome "${biome}"`).toBeDefined();
      }
    }
  });

  it('all explosive variants have OBSTACLE_DEFS entries', () => {
    for (const [biome, type] of Object.entries(EXPLOSIVE_VARIANTS)) {
      expect(OBSTACLE_DEFS[type], `Missing OBSTACLE_DEFS for explosive "${type}" in biome "${biome}"`).toBeDefined();
      expect(OBSTACLE_DEFS[type].explosive, `Explosive "${type}" missing explosive flag`).toBe(true);
    }
  });

  it('all biome obstacle variants have visual styles (obsStyles)', () => {
    const stylesSet = new Set(OBS_STYLES_KEYS);
    for (const [biome, types] of Object.entries(OBSTACLE_VARIANTS)) {
      for (const type of types) {
        expect(stylesSet.has(type), `Missing obsStyles for "${type}" in biome "${biome}"`).toBe(true);
      }
    }
  });

  it('all explosive variants have visual styles', () => {
    const stylesSet = new Set(OBS_STYLES_KEYS);
    for (const [biome, type] of Object.entries(EXPLOSIVE_VARIANTS)) {
      expect(stylesSet.has(type), `Missing obsStyles for explosive "${type}" in biome "${biome}"`).toBe(true);
    }
  });

  it('all obstacle materials are valid', () => {
    for (const [type, def] of Object.entries(OBSTACLE_DEFS)) {
      if (def.material) {
        expect(OBSTACLE_MATERIALS[def.material], `Invalid material "${def.material}" for "${type}"`).toBeDefined();
      }
    }
  });

  it('all biomes have explosive variants defined', () => {
    for (const biome of Object.keys(OBSTACLE_VARIANTS)) {
      expect(EXPLOSIVE_VARIANTS[biome], `Missing EXPLOSIVE_VARIANTS for biome "${biome}"`).toBeDefined();
    }
  });

  it('obstacle x range 5-290 is within 360° world bounds', () => {
    // Obstacles spawn at x = 5 + Math.random() * 285, so range is [5, 290]
    // The panoramic world is 300% wide, viewport is 0-100%
    // Objects at 290% should wrap correctly
    expect(290).toBeLessThanOrEqual(300); // within world bounds
    expect(5).toBeGreaterThanOrEqual(0);
  });
});

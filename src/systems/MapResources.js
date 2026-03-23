// MapResources — Collectible resources scattered on the isometric map
// Ore, wood, herbs, and treasures require caravan proximity to gather
// Resources are hidden by fog of war until discovered

import { ISO_CONFIG, getHeightAt } from "../utils/isometricUtils.js";

const { MAP_COLS, MAP_ROWS } = ISO_CONFIG;

// ─── RESOURCE DEFINITIONS ───

export const RESOURCE_TYPES = {
  ore: {
    id: "ore",
    name: "Żyła Rudy",
    icon: "gem",
    color: "#b8860b",
    glowColor: "#ffd700",
    gatherTime: 3000, // ms to gather
    minPerRoom: 0,
    maxPerRoom: 2,
    value: { copper: 8, silverChance: 0.15 },
    prefersHeight: true, // spawns on high ground
    minHeight: 1.5,
    avoidWater: true,
    desc: "Karawana musi dojechać blisko, by zebrać rudę",
  },
  wood: {
    id: "wood",
    name: "Stare Drewno",
    icon: "wood",
    color: "#8b6914",
    glowColor: "#a0824a",
    gatherTime: 2000,
    minPerRoom: 0,
    maxPerRoom: 3,
    value: { copper: 5 },
    prefersVegetation: true, // spawns near vegetation
    desc: "Materiał na barykady — karawana zbiera w pobliżu",
  },
  herbs: {
    id: "herbs",
    name: "Lecznicze Zioła",
    icon: "herb",
    color: "#44aa44",
    glowColor: "#88ff88",
    gatherTime: 2500,
    minPerRoom: 0,
    maxPerRoom: 2,
    value: { heal: 2 },
    prefersWater: true, // spawns near water
    desc: "Zioła lecznicze — regenerują HP karawany",
  },
  treasure: {
    id: "treasure",
    name: "Ukryty Skarb",
    icon: "chest",
    color: "#ffd700",
    glowColor: "#ffee88",
    gatherTime: 4000,
    minPerRoom: 0,
    maxPerRoom: 1,
    value: { copper: 15, silverChance: 0.30 },
    prefersHidden: true, // spawns in fog-heavy areas (far from center)
    desc: "Cenny skarb — wymaga czasu na odkopanie",
  },
  ammo_crate: {
    id: "ammo_crate",
    name: "Skrzynia z Amunicją",
    icon: "barrel",
    color: "#8a6030",
    glowColor: "#c09050",
    gatherTime: 1500,
    minPerRoom: 0,
    maxPerRoom: 1,
    value: { ammo: "dynamite", amount: 2 },
    prefersRoad: true, // spawns near roads
    desc: "Porzucona amunicja — zbierz zanim wrogowie dotrą",
  },
};

// ─── BIOME RESOURCE TABLES ───
// Which resources are available per biome

const BIOME_RESOURCES = {
  jungle:       ["wood", "herbs", "treasure"],
  island:       ["treasure", "herbs", "ammo_crate"],
  desert:       ["ore", "treasure", "ammo_crate"],
  winter:       ["ore", "wood", "herbs"],
  city:         ["ammo_crate", "treasure", "ore"],
  volcano:      ["ore", "ore", "treasure"],
  summer:       ["wood", "herbs", "herbs"],
  autumn:       ["wood", "herbs", "treasure"],
  spring:       ["herbs", "herbs", "wood"],
  mushroom:     ["herbs", "ore", "treasure"],
  swamp:        ["herbs", "wood", "treasure"],
  sunset_beach: ["treasure", "ammo_crate", "herbs"],
  bamboo_falls: ["wood", "wood", "herbs"],
  blue_lagoon:  ["treasure", "herbs", "ore"],
  olympus:      ["ore", "treasure", "ammo_crate"],
  underworld:   ["ore", "treasure", "treasure"],
  meteor:       ["ore", "ore", "ammo_crate"],
};

// ─── GATHER RADIUS ───
const GATHER_RADIUS = 3.0; // tiles — caravan must be within this distance
const GATHER_CHECK_INTERVAL = 500; // ms between gather progress checks

// ─── RESOURCE STATE ───

export class MapResourceState {
  constructor() {
    this.resources = []; // Array of placed resources
    this.gatheringId = null; // Currently gathering resource ID
    this.gatherProgress = 0; // 0-1 progress
    this.gatherStartTime = 0;
    this.lastCheckTime = 0;
    this.collectedThisRoom = [];
  }

  // ─── GENERATE RESOURCES FOR A ROOM ───

  generate(room, biomeId, terrainData) {
    this.resources = [];
    this.gatheringId = null;
    this.gatherProgress = 0;
    this.collectedThisRoom = [];

    if (!terrainData) return;

    const available = BIOME_RESOURCES[biomeId] || BIOME_RESOURCES.jungle;

    // Seeded RNG for deterministic placement
    let seed = room * 313 + 17;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // Deduplicate resource types and roll count per type
    const typeSet = new Set(available);
    let resId = 0;

    for (const typeId of typeSet) {
      const def = RESOURCE_TYPES[typeId];
      if (!def) continue;

      // Count based on room number (more resources in later rooms)
      const roomBonus = Math.min(1, Math.floor(room / 10));
      const count = def.minPerRoom + Math.floor(rng() * (def.maxPerRoom - def.minPerRoom + 1 + roomBonus));

      for (let i = 0; i < count; i++) {
        const pos = this._findPosition(def, rng, terrainData);
        if (!pos) continue;

        this.resources.push({
          id: `res_${resId++}`,
          typeId,
          ...def,
          col: pos.col,
          row: pos.row,
          wx: pos.col + 0.5,
          wy: pos.row + 0.5,
          height: getHeightAt(terrainData.heightMap, pos.col, pos.row),
          collected: false,
          discovered: false, // hidden until fog reveals
          gatherProgress: 0,
          pulsePhase: rng() * Math.PI * 2,
        });
      }
    }
  }

  // ─── FIND VALID POSITION ───

  _findPosition(def, rng, terrainData) {
    const { heightMap, overlays, waterTiles, vegetation, roads, cols, rows } = terrainData;

    for (let attempt = 0; attempt < 20; attempt++) {
      const col = Math.floor(rng() * (cols - 4) + 2);
      const row = Math.floor(rng() * (rows - 4) + 2);
      const idx = row * cols + col;

      // Don't place on cliffs
      if (overlays[idx] === 3) continue;

      const h = getHeightAt(heightMap, col, row);

      // Height preference
      if (def.prefersHeight && h < (def.minHeight || 0)) continue;

      // Water avoidance
      if (def.avoidWater && overlays[idx] === 2) continue;

      // Water preference (near water but not on it)
      if (def.prefersWater) {
        if (overlays[idx] === 2) continue; // not ON water
        const nearWater = waterTiles?.some(w =>
          Math.abs(w.col - col) <= 2 && Math.abs(w.row - row) <= 2
        );
        if (!nearWater && attempt < 15) continue;
      }

      // Vegetation preference
      if (def.prefersVegetation) {
        const nearVeg = vegetation?.some(v =>
          v.alive && Math.abs(v.col - col) <= 3 && Math.abs(v.row - row) <= 3
        );
        if (!nearVeg && attempt < 15) continue;
      }

      // Road preference
      if (def.prefersRoad) {
        const nearRoad = roads?.some(r =>
          Math.abs(r.col - col) <= 2 && Math.abs(r.row - row) <= 2
        );
        if (!nearRoad && attempt < 15) continue;
      }

      // Hidden preference (far from center)
      if (def.prefersHidden) {
        const centerDist = Math.sqrt((col - cols / 2) ** 2 + (row - rows / 2) ** 2);
        if (centerDist < cols * 0.3 && attempt < 15) continue;
      }

      // Avoid existing resources too close
      const tooClose = this.resources.some(r =>
        Math.abs(r.col - col) < 3 && Math.abs(r.row - row) < 3
      );
      if (tooClose) continue;

      return { col, row };
    }
    return null;
  }

  // ─── UPDATE FOG DISCOVERY ───
  // Mark resources as discovered when fog reveals their tile

  updateDiscovery(fogGrid, cols) {
    for (const res of this.resources) {
      if (res.discovered || res.collected) continue;
      const fogIdx = res.row * cols + res.col;
      if (fogGrid && fogGrid[fogIdx] >= 0.5) {
        res.discovered = true;
      }
    }
  }

  // ─── UPDATE GATHERING ───
  // Check if caravan is close enough and progress gathering

  updateGathering(caravanX, caravanY, now) {
    if (!now) now = Date.now();
    if (now - this.lastCheckTime < GATHER_CHECK_INTERVAL) return null;
    this.lastCheckTime = now;

    // Find closest ungathered discovered resource
    let closestRes = null;
    let closestDist = Infinity;

    for (const res of this.resources) {
      if (res.collected || !res.discovered) continue;
      const dx = res.wx - caravanX;
      const dy = res.wy - caravanY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GATHER_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestRes = res;
      }
    }

    if (!closestRes) {
      // No resource in range — reset gathering
      if (this.gatheringId) {
        const prev = this.resources.find(r => r.id === this.gatheringId);
        if (prev) prev.gatherProgress = 0;
        this.gatheringId = null;
        this.gatherProgress = 0;
      }
      return null;
    }

    if (this.gatheringId !== closestRes.id) {
      // Start gathering new resource
      this.gatheringId = closestRes.id;
      this.gatherStartTime = now;
      this.gatherProgress = 0;
      closestRes.gatherProgress = 0;
      return null;
    }

    // Progress gathering
    const elapsed = now - this.gatherStartTime;
    const def = RESOURCE_TYPES[closestRes.typeId];
    const progress = Math.min(1, elapsed / (def?.gatherTime || 3000));
    this.gatherProgress = progress;
    closestRes.gatherProgress = progress;

    if (progress >= 1) {
      // Gathered!
      closestRes.collected = true;
      this.gatheringId = null;
      this.gatherProgress = 0;
      this.collectedThisRoom.push(closestRes);
      return { resource: closestRes, value: def?.value || {} };
    }

    return null;
  }

  // ─── GET VISIBLE RESOURCES ───
  // For rendering — only return discovered, uncollected resources

  getVisibleResources() {
    return this.resources.filter(r => r.discovered && !r.collected);
  }

  // Reset for new room
  reset() {
    this.resources = [];
    this.gatheringId = null;
    this.gatherProgress = 0;
    this.collectedThisRoom = [];
  }
}

// Composite Structures — multi-segment buildings per biome
// Each structure is a group of connected segments with structural dependencies
// Destroying a supporting segment cascades collapse to dependent segments

// ─── STRUCTURE DEFINITIONS ───
// segments[].supports: IDs of segments this one holds up
// segments[].dependsOn: IDs of segments that must exist for this one to stand
// segments[].collapseDelay: ms before cascade collapse when support destroyed

export const STRUCTURE_DEFS = {
  // ─── ISLAND: Latarnia Morska ───
  lighthouse: {
    id: "lighthouse",
    name: "Latarnia Morska",
    biomes: ["island", "sunset_beach"],
    width: 80,
    height: 140,
    rarity: 0.15,
    segments: [
      {
        id: "base",
        name: "Fundament",
        material: "stone",
        hp: 120,
        x: 0, y: 0, w: 60, h: 40,
        supports: ["tower"],
        loot: { copper: 15 },
        onDestroy: { shockwave: 20, screenShake: 4 },
      },
      {
        id: "tower",
        name: "Wieża",
        material: "stone",
        hp: 80,
        x: 10, y: 40, w: 40, h: 60,
        supports: ["lantern"],
        dependsOn: ["base"],
        collapseDelay: 400,
        loot: { copper: 10 },
      },
      {
        id: "lantern",
        name: "Latarnia",
        material: "crystal",
        hp: 40,
        x: 15, y: 100, w: 30, h: 30,
        dependsOn: ["tower"],
        collapseDelay: 300,
        explosive: true,
        explosionDmg: 40,
        explosionRadius: 25,
        explosionElement: "fire",
        loot: { copper: 8, silver: 1 },
        onDestroy: { particles: "fire", hazard: "fire_pool" },
      },
    ],
    fullDestroyBonus: { gold: 1, message: "Latarnia zniszczona!" },
    // Visual style for the composite container
    style: {
      base: { bg: "linear-gradient(180deg,#7a7a7a,#6a6a6a,#5a5a5a)", radius: "4px", shadow: "0 3px 8px rgba(0,0,0,0.6)" },
      tower: { bg: "linear-gradient(180deg,#8a8a8a,#7a7a7a,#6a6a6a)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
      lantern: { bg: "radial-gradient(circle,#ffe080,#ffc040,#e0a020)", radius: "50%", shadow: "0 0 16px rgba(255,200,60,0.6), 0 0 8px rgba(255,160,40,0.4)" },
    },
  },

  // ─── CITY: Wieża Zegarowa ───
  clock_tower: {
    id: "clock_tower",
    name: "Wieża Zegarowa",
    biomes: ["city"],
    width: 70,
    height: 160,
    rarity: 0.12,
    segments: [
      {
        id: "base",
        name: "Fundament",
        material: "stone",
        hp: 140,
        x: 0, y: 0, w: 55, h: 40,
        supports: ["middle", "clock"],
        loot: { copper: 12, silver: 1 },
        onDestroy: { shockwave: 25, screenShake: 5 },
      },
      {
        id: "middle",
        name: "Piętro",
        material: "stone",
        hp: 100,
        x: 5, y: 40, w: 45, h: 50,
        supports: ["clock", "spire"],
        dependsOn: ["base"],
        collapseDelay: 350,
        loot: { copper: 8 },
      },
      {
        id: "clock",
        name: "Zegar",
        material: "metal",
        hp: 60,
        x: 10, y: 90, w: 35, h: 35,
        dependsOn: ["base", "middle"],
        collapseDelay: 250,
        loot: { copper: 10, silver: 2 },
        onDestroy: { screenShake: 6, particles: "spark" },
      },
      {
        id: "spire",
        name: "Iglica",
        material: "metal",
        hp: 30,
        x: 20, y: 125, w: 15, h: 30,
        dependsOn: ["middle"],
        collapseDelay: 200,
        explosive: true,
        explosionDmg: 25,
        explosionRadius: 20,
        explosionElement: "lightning",
        loot: { copper: 5 },
      },
    ],
    fullDestroyBonus: { gold: 2, message: "Wieża Zegarowa zrównana z ziemią!" },
    style: {
      base: { bg: "linear-gradient(180deg,#8a7a60,#7a6a50,#6a5a40)", radius: "4px 4px 2px 2px", shadow: "0 4px 12px rgba(0,0,0,0.6)" },
      middle: { bg: "linear-gradient(180deg,#9a8a70,#8a7a60,#7a6a50)", radius: "3px", shadow: "0 2px 8px rgba(0,0,0,0.5)" },
      clock: { bg: "radial-gradient(circle,#f0e0c0,#d0c0a0,#b0a080)", radius: "50%", shadow: "0 0 10px rgba(200,180,140,0.4), 0 2px 6px rgba(0,0,0,0.4)" },
      spire: { bg: "linear-gradient(180deg,#6a6a7a,#5a5a6a,#4a4a5a)", radius: "2px 2px 50% 50%", shadow: "0 0 6px rgba(140,140,160,0.3)" },
    },
  },

  // ─── JUNGLE: Ruiny Świątyni ───
  temple_ruins: {
    id: "temple_ruins",
    name: "Ruiny Świątyni",
    biomes: ["jungle", "bamboo_falls"],
    width: 100,
    height: 110,
    rarity: 0.12,
    segments: [
      {
        id: "platform",
        name: "Platforma",
        material: "stone",
        hp: 130,
        x: 0, y: 0, w: 90, h: 25,
        supports: ["pillar_l", "pillar_r", "altar"],
        loot: { copper: 10 },
        onDestroy: { shockwave: 18, screenShake: 4 },
      },
      {
        id: "pillar_l",
        name: "Lewy Filar",
        material: "stone",
        hp: 60,
        x: 5, y: 25, w: 16, h: 55,
        dependsOn: ["platform"],
        collapseDelay: 300,
        loot: { copper: 5 },
      },
      {
        id: "pillar_r",
        name: "Prawy Filar",
        material: "stone",
        hp: 60,
        x: 69, y: 25, w: 16, h: 55,
        dependsOn: ["platform"],
        collapseDelay: 350,
        loot: { copper: 5 },
      },
      {
        id: "altar",
        name: "Ołtarz",
        material: "crystal",
        hp: 45,
        x: 30, y: 30, w: 30, h: 25,
        dependsOn: ["platform"],
        collapseDelay: 500,
        explosive: true,
        explosionDmg: 35,
        explosionRadius: 22,
        explosionElement: "shadow",
        loot: { copper: 12, silver: 2 },
        onDestroy: { particles: "shard", hazard: "shadow_rift" },
      },
    ],
    fullDestroyBonus: { gold: 1, silver: 3, message: "Starożytna świątynia obrócona w pył!" },
    style: {
      platform: { bg: "linear-gradient(180deg,#5a6a50,#4a5a40,#3a4a30)", radius: "4px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
      pillar_l: { bg: "linear-gradient(180deg,#7a7a6a,#6a6a5a,#5a5a4a)", radius: "3px 3px 2px 2px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
      pillar_r: { bg: "linear-gradient(180deg,#7a7a6a,#6a6a5a,#5a5a4a)", radius: "3px 3px 2px 2px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
      altar: { bg: "radial-gradient(ellipse,#8040c0,#6030a0,#402080)", radius: "4px", shadow: "0 0 12px rgba(120,50,200,0.5), 0 2px 6px rgba(0,0,0,0.4)" },
    },
  },

  // ─── VOLCANO: Obsydianowa Brama ───
  obsidian_gate: {
    id: "obsidian_gate",
    name: "Obsydianowa Brama",
    biomes: ["volcano", "underworld"],
    width: 90,
    height: 120,
    rarity: 0.10,
    segments: [
      {
        id: "pillar_l",
        name: "Lewy Filar",
        material: "stone",
        hp: 100,
        x: 0, y: 0, w: 20, h: 90,
        supports: ["arch"],
        loot: { copper: 8 },
        onDestroy: { screenShake: 3 },
      },
      {
        id: "pillar_r",
        name: "Prawy Filar",
        material: "stone",
        hp: 100,
        x: 65, y: 0, w: 20, h: 90,
        supports: ["arch"],
        loot: { copper: 8 },
        onDestroy: { screenShake: 3 },
      },
      {
        id: "arch",
        name: "Łuk z Runami",
        material: "crystal",
        hp: 70,
        x: 10, y: 80, w: 65, h: 30,
        dependsOn: ["pillar_l", "pillar_r"],
        collapseDelay: 400,
        requireAllSupports: false, // collapses if ANY support destroyed
        explosive: true,
        explosionDmg: 50,
        explosionRadius: 28,
        explosionElement: "fire",
        loot: { copper: 15, silver: 2 },
        onDestroy: { particles: "fire", hazard: "fire_pool", shockwave: 30, screenShake: 6 },
      },
    ],
    fullDestroyBonus: { gold: 2, message: "Obsydianowa Brama rozpadła się!" },
    style: {
      pillar_l: { bg: "linear-gradient(180deg,#2a2030,#1a1020,#0a0810)", radius: "3px", shadow: "0 0 8px rgba(60,20,80,0.3), 0 3px 8px rgba(0,0,0,0.6)" },
      pillar_r: { bg: "linear-gradient(180deg,#2a2030,#1a1020,#0a0810)", radius: "3px", shadow: "0 0 8px rgba(60,20,80,0.3), 0 3px 8px rgba(0,0,0,0.6)" },
      arch: { bg: "linear-gradient(180deg,#3a1040,#2a0830,#1a0420)", radius: "50% 50% 0 0", shadow: "0 0 14px rgba(255,60,20,0.4), 0 0 6px rgba(200,40,200,0.3)" },
    },
  },

  // ─── WINTER: Lodowa Twierdza ───
  ice_fortress: {
    id: "ice_fortress",
    name: "Lodowa Twierdza",
    biomes: ["winter"],
    width: 100,
    height: 100,
    rarity: 0.12,
    segments: [
      {
        id: "wall_l",
        name: "Lewa Ściana",
        material: "ice",
        hp: 70,
        x: 0, y: 0, w: 20, h: 60,
        supports: ["turret"],
        loot: { copper: 5 },
      },
      {
        id: "wall_r",
        name: "Prawa Ściana",
        material: "ice",
        hp: 70,
        x: 70, y: 0, w: 20, h: 60,
        supports: ["turret"],
        loot: { copper: 5 },
      },
      {
        id: "gate",
        name: "Lodowa Brama",
        material: "ice",
        hp: 90,
        x: 20, y: 0, w: 50, h: 35,
        supports: ["turret"],
        loot: { copper: 8, silver: 1 },
        onDestroy: { shockwave: 15, screenShake: 3 },
      },
      {
        id: "turret",
        name: "Wieżyczka",
        material: "ice",
        hp: 50,
        x: 25, y: 55, w: 40, h: 40,
        dependsOn: ["wall_l", "wall_r", "gate"],
        requireAllSupports: false, // any support destroyed → turret collapses
        collapseDelay: 350,
        explosive: true,
        explosionDmg: 30,
        explosionRadius: 22,
        explosionElement: "ice",
        loot: { copper: 10, silver: 1 },
        onDestroy: { particles: "shard", hazard: "ice_slick" },
      },
    ],
    fullDestroyBonus: { gold: 1, message: "Lodowa Twierdza roztrzaskana!" },
    style: {
      wall_l: { bg: "linear-gradient(180deg,#b0d8f0,#90b8e0,#70a0d0)", radius: "3px", shadow: "0 0 8px rgba(160,200,255,0.3), 0 2px 6px rgba(0,0,0,0.4)" },
      wall_r: { bg: "linear-gradient(180deg,#b0d8f0,#90b8e0,#70a0d0)", radius: "3px", shadow: "0 0 8px rgba(160,200,255,0.3), 0 2px 6px rgba(0,0,0,0.4)" },
      gate: { bg: "linear-gradient(180deg,#c0e0ff,#a0c8f0,#80b0e0)", radius: "8px 8px 2px 2px", shadow: "0 0 12px rgba(160,200,255,0.4), 0 3px 8px rgba(0,0,0,0.5)" },
      turret: { bg: "radial-gradient(ellipse,#d0f0ff,#a0d0f0,#80b8e0)", radius: "4px 4px 2px 2px", shadow: "0 0 14px rgba(160,200,255,0.5), 0 2px 8px rgba(0,0,0,0.4)" },
    },
  },

  // ─── DESERT: Piramida Przemytników ───
  smuggler_pyramid: {
    id: "smuggler_pyramid",
    name: "Piramida Przemytników",
    biomes: ["desert"],
    width: 100,
    height: 110,
    rarity: 0.10,
    segments: [
      {
        id: "layer_bottom",
        name: "Dolna Warstwa",
        material: "sand",
        hp: 110,
        x: 0, y: 0, w: 90, h: 30,
        supports: ["layer_mid", "entrance"],
        loot: { copper: 8 },
        onDestroy: { shockwave: 20, screenShake: 4 },
      },
      {
        id: "layer_mid",
        name: "Środkowa Warstwa",
        material: "sand",
        hp: 80,
        x: 15, y: 30, w: 60, h: 30,
        supports: ["layer_top"],
        dependsOn: ["layer_bottom"],
        collapseDelay: 300,
        loot: { copper: 6 },
      },
      {
        id: "layer_top",
        name: "Szczyt",
        material: "stone",
        hp: 50,
        x: 30, y: 60, w: 30, h: 30,
        dependsOn: ["layer_mid"],
        collapseDelay: 250,
        loot: { copper: 10, silver: 1 },
        onDestroy: { particles: "dust", screenShake: 3 },
      },
      {
        id: "entrance",
        name: "Wejście",
        material: "wood",
        hp: 40,
        x: 35, y: 5, w: 20, h: 20,
        dependsOn: ["layer_bottom"],
        collapseDelay: 200,
        loot: { copper: 5, silver: 1 },
      },
    ],
    fullDestroyBonus: { gold: 2, silver: 2, message: "Piramida Przemytników zburzona!" },
    style: {
      layer_bottom: { bg: "linear-gradient(180deg,#c4a860,#b09850,#9a8840)", radius: "2px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
      layer_mid: { bg: "linear-gradient(180deg,#d0b870,#c0a860,#b09850)", radius: "2px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
      layer_top: { bg: "linear-gradient(180deg,#e0c880,#d0b870,#c0a860)", radius: "2px 2px 50% 50%", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
      entrance: { bg: "linear-gradient(180deg,#2a1a0a,#1a1008,#0a0804)", radius: "8px 8px 2px 2px", shadow: "inset 0 0 6px rgba(0,0,0,0.6)" },
    },
  },

  // ─── CITY: Portowa Karczma ───
  port_tavern: {
    id: "port_tavern",
    name: "Portowa Karczma",
    biomes: ["city"],
    width: 90,
    height: 120,
    rarity: 0.12,
    segments: [
      {
        id: "walls",
        name: "Ściany",
        material: "wood",
        hp: 100,
        x: 0, y: 0, w: 80, h: 60,
        supports: ["roof", "balcony", "sign"],
        loot: { copper: 10 },
        onDestroy: { shockwave: 15, screenShake: 3 },
      },
      {
        id: "roof",
        name: "Dach",
        material: "wood",
        hp: 60,
        x: -5, y: 55, w: 90, h: 25,
        dependsOn: ["walls"],
        collapseDelay: 400,
        loot: { copper: 6 },
      },
      {
        id: "balcony",
        name: "Balkon",
        material: "wood",
        hp: 35,
        x: 60, y: 30, w: 25, h: 20,
        dependsOn: ["walls"],
        collapseDelay: 200,
        explosive: true,
        explosionDmg: 20,
        explosionRadius: 15,
        explosionElement: null,
        loot: { copper: 4 },
        onDestroy: { particles: "splinter", screenShake: 2 },
      },
      {
        id: "sign",
        name: "Szyld",
        material: "wood",
        hp: 15,
        x: 10, y: 65, w: 20, h: 15,
        dependsOn: ["walls"],
        collapseDelay: 150,
        loot: { copper: 2 },
      },
    ],
    fullDestroyBonus: { gold: 1, silver: 2, message: "Karczma zrównana z ziemią!" },
    style: {
      walls: { bg: "linear-gradient(180deg,#8a6a40,#7a5a30,#6a4a20)", radius: "3px", shadow: "0 3px 10px rgba(0,0,0,0.6)" },
      roof: { bg: "linear-gradient(180deg,#7a3a18,#6a3018,#5a2810)", radius: "6px 6px 0 0", shadow: "0 -2px 6px rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.5)" },
      balcony: { bg: "linear-gradient(180deg,#9a7a50,#8a6a40,#7a5a30)", radius: "2px", shadow: "0 3px 6px rgba(0,0,0,0.4)" },
      sign: { bg: "linear-gradient(180deg,#c0a060,#a08840,#806830)", radius: "3px", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
    },
  },
  // ═══════════════════════════════════════════════════
  // ─── PHASE 2 STRUCTURES ───
  // ═══════════════════════════════════════════════════

  // ─── SUMMER: Wiatrak ───
  windmill_tower: {
    id: "windmill_tower",
    name: "Wiatrak",
    biomes: ["summer"],
    width: 70,
    height: 130,
    rarity: 0.15,
    segments: [
      {
        id: "base",
        name: "Baza",
        material: "stone",
        hp: 100,
        x: 5, y: 0, w: 50, h: 35,
        supports: ["tower"],
        loot: { copper: 8 },
        onDestroy: { shockwave: 15, screenShake: 3 },
      },
      {
        id: "tower",
        name: "Wieża",
        material: "wood",
        hp: 70,
        x: 10, y: 35, w: 40, h: 50,
        supports: ["blades", "mechanism"],
        dependsOn: ["base"],
        collapseDelay: 350,
        loot: { copper: 6 },
      },
      {
        id: "blades",
        name: "Skrzydła",
        material: "wood",
        hp: 35,
        x: -10, y: 75, w: 80, h: 40,
        dependsOn: ["tower"],
        collapseDelay: 200,
        loot: { copper: 4 },
        onDestroy: { screenShake: 2 },
      },
      {
        id: "mechanism",
        name: "Mechanizm",
        material: "metal",
        hp: 45,
        x: 20, y: 85, w: 20, h: 20,
        dependsOn: ["tower"],
        collapseDelay: 300,
        explosive: true,
        explosionDmg: 25,
        explosionRadius: 18,
        explosionElement: "lightning",
        loot: { copper: 6, silver: 1 },
        onDestroy: { particles: "spark" },
      },
    ],
    fullDestroyBonus: { gold: 1, message: "Wiatrak zmiażdżony!" },
    style: {
      base: { bg: "linear-gradient(180deg,#8a8a7a,#7a7a6a,#6a6a5a)", radius: "4px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
      tower: { bg: "linear-gradient(180deg,#9a8060,#8a7050,#7a6040)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
      blades: { bg: "linear-gradient(45deg,#8a7050 20%,transparent 20%,transparent 80%,#8a7050 80%),linear-gradient(-45deg,#8a7050 20%,transparent 20%,transparent 80%,#8a7050 80%)", radius: "2px", shadow: "0 0 4px rgba(0,0,0,0.3)" },
      mechanism: { bg: "radial-gradient(circle,#7a7a8a,#5a5a6a,#4a4a5a)", radius: "50%", shadow: "0 0 6px rgba(140,140,160,0.3)" },
    },
  },

  // ─── AUTUMN: Stary Most ───
  old_bridge: {
    id: "old_bridge",
    name: "Stary Most",
    biomes: ["autumn"],
    width: 120,
    height: 70,
    rarity: 0.14,
    segments: [
      {
        id: "pillar_l",
        name: "Lewy Filar",
        material: "stone",
        hp: 80,
        x: 10, y: 0, w: 18, h: 50,
        supports: ["span_l"],
        loot: { copper: 5 },
      },
      {
        id: "pillar_m",
        name: "Środkowy Filar",
        material: "stone",
        hp: 90,
        x: 50, y: 0, w: 18, h: 55,
        supports: ["span_l", "span_r"],
        loot: { copper: 6 },
        onDestroy: { screenShake: 3 },
      },
      {
        id: "pillar_r",
        name: "Prawy Filar",
        material: "stone",
        hp: 80,
        x: 90, y: 0, w: 18, h: 50,
        supports: ["span_r"],
        loot: { copper: 5 },
      },
      {
        id: "span_l",
        name: "Lewe Przęsło",
        material: "wood",
        hp: 50,
        x: 0, y: 45, w: 60, h: 15,
        dependsOn: ["pillar_l", "pillar_m"],
        requireAllSupports: false,
        collapseDelay: 300,
        loot: { copper: 4 },
      },
      {
        id: "span_r",
        name: "Prawe Przęsło",
        material: "wood",
        hp: 50,
        x: 58, y: 45, w: 60, h: 15,
        dependsOn: ["pillar_m", "pillar_r"],
        requireAllSupports: false,
        collapseDelay: 350,
        loot: { copper: 4 },
      },
    ],
    fullDestroyBonus: { gold: 1, message: "Stary Most zawalony!" },
    style: {
      pillar_l: { bg: "linear-gradient(180deg,#7a6a5a,#6a5a4a,#5a4a3a)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
      pillar_m: { bg: "linear-gradient(180deg,#7a6a5a,#6a5a4a,#5a4a3a)", radius: "3px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
      pillar_r: { bg: "linear-gradient(180deg,#7a6a5a,#6a5a4a,#5a4a3a)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
      span_l: { bg: "linear-gradient(180deg,#8a6a40,#7a5a30,#6a4a20)", radius: "2px", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
      span_r: { bg: "linear-gradient(180deg,#8a6a40,#7a5a30,#6a4a20)", radius: "2px", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
    },
  },

  // ─── SPRING: Altana Ogrodowa ───
  garden_gazebo: {
    id: "garden_gazebo",
    name: "Altana Ogrodowa",
    biomes: ["spring"],
    width: 80,
    height: 100,
    rarity: 0.15,
    segments: [
      {
        id: "columns",
        name: "Kolumny",
        material: "stone",
        hp: 80,
        x: 0, y: 0, w: 70, h: 55,
        supports: ["roof"],
        loot: { copper: 6 },
      },
      {
        id: "fountain",
        name: "Fontanna",
        material: "stone",
        hp: 50,
        x: 20, y: 5, w: 30, h: 30,
        loot: { copper: 8, silver: 1 },
        onDestroy: { hazard: "ice_slick", screenShake: 2, particles: "shard" },
      },
      {
        id: "roof",
        name: "Dach",
        material: "wood",
        hp: 45,
        x: -5, y: 50, w: 80, h: 20,
        dependsOn: ["columns"],
        collapseDelay: 300,
        loot: { copper: 4 },
      },
      {
        id: "flowers",
        name: "Kwiaty",
        material: "organic",
        hp: 15,
        x: 5, y: 70, w: 60, h: 15,
        dependsOn: ["roof"],
        collapseDelay: 200,
        loot: { copper: 2 },
      },
    ],
    fullDestroyBonus: { gold: 1, message: "Altana zniszczona!" },
    style: {
      columns: { bg: "linear-gradient(180deg,#c0c0b0,#a0a090,#808070)", radius: "3px", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
      fountain: { bg: "radial-gradient(circle,#80c0e0,#60a0c0,#4080a0)", radius: "50%", shadow: "0 0 10px rgba(100,180,220,0.4), 0 2px 6px rgba(0,0,0,0.3)" },
      roof: { bg: "linear-gradient(180deg,#6a8a4a,#5a7a3a,#4a6a2a)", radius: "4px 4px 0 0", shadow: "0 -1px 4px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.4)" },
      flowers: { bg: "radial-gradient(ellipse,#e060a0,#c04080,#a02060)", radius: "50%", shadow: "0 0 8px rgba(200,60,120,0.3)" },
    },
  },

  // ─── MUSHROOM: Gigantyczny Grzyb ───
  giant_shroom: {
    id: "giant_shroom",
    name: "Gigantyczny Grzyb",
    biomes: ["mushroom"],
    width: 80,
    height: 120,
    rarity: 0.15,
    segments: [
      {
        id: "stem",
        name: "Nóżka",
        material: "organic",
        hp: 90,
        x: 20, y: 0, w: 30, h: 60,
        supports: ["cap"],
        loot: { copper: 6 },
        onDestroy: { screenShake: 3 },
      },
      {
        id: "cap",
        name: "Kapelusz",
        material: "organic",
        hp: 60,
        x: 0, y: 55, w: 70, h: 40,
        supports: ["spores"],
        dependsOn: ["stem"],
        collapseDelay: 400,
        explosive: true,
        explosionDmg: 25,
        explosionRadius: 20,
        explosionElement: "poison",
        loot: { copper: 8, silver: 1 },
        onDestroy: { particles: "leaf", hazard: "toxic_cloud" },
      },
      {
        id: "spores",
        name: "Zarodniki",
        material: "organic",
        hp: 25,
        x: 10, y: 90, w: 50, h: 20,
        dependsOn: ["cap"],
        collapseDelay: 200,
        explosive: true,
        explosionDmg: 15,
        explosionRadius: 18,
        explosionElement: "poison",
        loot: { copper: 3 },
      },
    ],
    fullDestroyBonus: { gold: 1, message: "Gigantyczny Grzyb rozpadł się!" },
    style: {
      stem: { bg: "linear-gradient(180deg,#b0a080,#9a8a70,#8a7a60)", radius: "8px", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
      cap: { bg: "radial-gradient(ellipse at 40% 60%,#a060c0,#8040a0,#602080)", radius: "50% 50% 10% 10%", shadow: "0 0 12px rgba(140,60,180,0.4), 0 3px 8px rgba(0,0,0,0.5)" },
      spores: { bg: "radial-gradient(ellipse,rgba(160,100,200,0.6),rgba(120,60,160,0.3))", radius: "50%", shadow: "0 0 10px rgba(160,100,200,0.4)" },
    },
  },

  // ─── SWAMP: Chata na Kurzych Nóżkach ───
  swamp_hut: {
    id: "swamp_hut",
    name: "Chata na Kurzych Nóżkach",
    biomes: ["swamp"],
    width: 80,
    height: 110,
    rarity: 0.12,
    segments: [
      {
        id: "legs",
        name: "Nogi",
        material: "wood",
        hp: 70,
        x: 10, y: 0, w: 50, h: 35,
        supports: ["hut"],
        loot: { copper: 5 },
        onDestroy: { screenShake: 3 },
      },
      {
        id: "hut",
        name: "Chata",
        material: "wood",
        hp: 80,
        x: 0, y: 30, w: 70, h: 40,
        supports: ["roof", "chimney"],
        dependsOn: ["legs"],
        collapseDelay: 400,
        loot: { copper: 8 },
        onDestroy: { hazard: "toxic_cloud", screenShake: 4 },
      },
      {
        id: "roof",
        name: "Dach",
        material: "organic",
        hp: 40,
        x: -5, y: 65, w: 80, h: 20,
        dependsOn: ["hut"],
        collapseDelay: 250,
        loot: { copper: 3 },
      },
      {
        id: "chimney",
        name: "Komin",
        material: "stone",
        hp: 35,
        x: 50, y: 75, w: 15, h: 25,
        dependsOn: ["hut"],
        collapseDelay: 200,
        explosive: true,
        explosionDmg: 20,
        explosionRadius: 14,
        explosionElement: "poison",
        loot: { copper: 4, silver: 1 },
      },
    ],
    fullDestroyBonus: { gold: 1, message: "Chata zatonęła w bagnie!" },
    style: {
      legs: { bg: "linear-gradient(180deg,#6a5030 30%,transparent 30%,transparent 70%,#6a5030 70%)", radius: "2px", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
      hut: { bg: "linear-gradient(180deg,#7a6040,#6a5030,#5a4020)", radius: "3px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
      roof: { bg: "linear-gradient(180deg,#4a6030,#3a5020,#2a4010)", radius: "50% 50% 0 0", shadow: "0 -1px 4px rgba(0,0,0,0.3)" },
      chimney: { bg: "linear-gradient(180deg,#5a5a5a,#4a4a4a,#3a3a3a)", radius: "2px", shadow: "0 -4px 8px rgba(80,120,40,0.3)" },
    },
  },

  // ─── BLUE LAGOON: Podwodna Świątynia ───
  underwater_temple: {
    id: "underwater_temple",
    name: "Podwodna Świątynia",
    biomes: ["blue_lagoon"],
    width: 90,
    height: 110,
    rarity: 0.12,
    segments: [
      {
        id: "coral_base",
        name: "Koralowa Podstawa",
        material: "organic",
        hp: 100,
        x: 0, y: 0, w: 80, h: 25,
        supports: ["pillars"],
        loot: { copper: 8 },
      },
      {
        id: "pillars",
        name: "Filary",
        material: "stone",
        hp: 80,
        x: 5, y: 25, w: 70, h: 40,
        supports: ["dome"],
        dependsOn: ["coral_base"],
        collapseDelay: 350,
        loot: { copper: 6 },
      },
      {
        id: "dome",
        name: "Kopuła",
        material: "crystal",
        hp: 60,
        x: 10, y: 60, w: 60, h: 30,
        supports: ["jewel"],
        dependsOn: ["pillars"],
        collapseDelay: 300,
        loot: { copper: 8, silver: 1 },
        onDestroy: { hazard: "ice_slick", screenShake: 4 },
      },
      {
        id: "jewel",
        name: "Klejnot Głębin",
        material: "crystal",
        hp: 30,
        x: 25, y: 85, w: 20, h: 20,
        dependsOn: ["dome"],
        collapseDelay: 200,
        explosive: true,
        explosionDmg: 35,
        explosionRadius: 22,
        explosionElement: "ice",
        loot: { copper: 15, silver: 3 },
        onDestroy: { particles: "shard", screenShake: 5 },
      },
    ],
    fullDestroyBonus: { gold: 2, message: "Podwodna Świątynia pochłonięta przez fale!" },
    style: {
      coral_base: { bg: "radial-gradient(ellipse,#e06080,#c04060,#a03050)", radius: "6px", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
      pillars: { bg: "linear-gradient(180deg,#70a0b0,#5090a0,#408090)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
      dome: { bg: "radial-gradient(ellipse,#80d0f0,#60b0e0,#4090c0)", radius: "50% 50% 10% 10%", shadow: "0 0 14px rgba(100,180,240,0.5)" },
      jewel: { bg: "radial-gradient(circle,#60f0ff,#40d0e0,#20b0c0)", radius: "50%", shadow: "0 0 16px rgba(80,220,255,0.6), 0 0 8px rgba(40,180,220,0.4)" },
    },
  },

  // ─── OLYMPUS: Panteon ───
  pantheon: {
    id: "pantheon",
    name: "Panteon Olimpijski",
    biomes: ["olympus"],
    width: 110,
    height: 130,
    rarity: 0.10,
    segments: [
      {
        id: "foundation",
        name: "Fundament",
        material: "stone",
        hp: 150,
        x: 0, y: 0, w: 100, h: 25,
        supports: ["columns_l", "columns_r"],
        loot: { copper: 10 },
        onDestroy: { shockwave: 25, screenShake: 5 },
      },
      {
        id: "columns_l",
        name: "Lewe Kolumny",
        material: "stone",
        hp: 80,
        x: 5, y: 25, w: 20, h: 60,
        supports: ["pediment"],
        dependsOn: ["foundation"],
        collapseDelay: 350,
        loot: { copper: 6 },
      },
      {
        id: "columns_r",
        name: "Prawe Kolumny",
        material: "stone",
        hp: 80,
        x: 75, y: 25, w: 20, h: 60,
        supports: ["pediment"],
        dependsOn: ["foundation"],
        collapseDelay: 400,
        loot: { copper: 6 },
      },
      {
        id: "pediment",
        name: "Fronton",
        material: "stone",
        hp: 60,
        x: 0, y: 80, w: 100, h: 25,
        supports: ["statue"],
        dependsOn: ["columns_l", "columns_r"],
        requireAllSupports: false,
        collapseDelay: 300,
        loot: { copper: 8, silver: 1 },
      },
      {
        id: "statue",
        name: "Posąg Zeusa",
        material: "crystal",
        hp: 50,
        x: 35, y: 100, w: 30, h: 30,
        dependsOn: ["pediment"],
        collapseDelay: 250,
        explosive: true,
        explosionDmg: 45,
        explosionRadius: 25,
        explosionElement: "lightning",
        loot: { copper: 12, silver: 2, gold: 1 },
        onDestroy: { particles: "spark", screenShake: 6 },
      },
    ],
    fullDestroyBonus: { gold: 3, message: "Panteon Olimpijski obrócony w ruiny!" },
    style: {
      foundation: { bg: "linear-gradient(180deg,#e0d8c8,#d0c8b8,#c0b8a8)", radius: "3px", shadow: "0 3px 10px rgba(0,0,0,0.5)" },
      columns_l: { bg: "linear-gradient(180deg,#f0e8d8,#e0d8c8,#d0c8b8)", radius: "4px", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
      columns_r: { bg: "linear-gradient(180deg,#f0e8d8,#e0d8c8,#d0c8b8)", radius: "4px", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
      pediment: { bg: "linear-gradient(180deg,#f0e8d0,#e0d8c0,#d0c8b0)", radius: "50% 50% 0 0", shadow: "0 -2px 6px rgba(0,0,0,0.2), 0 3px 8px rgba(0,0,0,0.5)" },
      statue: { bg: "radial-gradient(ellipse,#ffe080,#ffc040,#e0a020)", radius: "30%", shadow: "0 0 16px rgba(255,200,60,0.5), 0 0 8px rgba(255,240,100,0.3)" },
    },
  },

  // ─── METEOR: Kryształ Mocy ───
  power_crystal: {
    id: "power_crystal",
    name: "Kryształ Mocy",
    biomes: ["meteor"],
    width: 80,
    height: 110,
    rarity: 0.10,
    segments: [
      {
        id: "force_field",
        name: "Pole Siłowe",
        material: "crystal",
        hp: 60,
        x: 0, y: 0, w: 70, h: 70,
        supports: ["core"],
        loot: { copper: 5 },
        onDestroy: { shockwave: 20, screenShake: 3, particles: "shard" },
      },
      {
        id: "core",
        name: "Rdzeń",
        material: "crystal",
        hp: 100,
        x: 20, y: 20, w: 30, h: 30,
        supports: ["orbital_top", "orbital_l", "orbital_r"],
        dependsOn: ["force_field"],
        collapseDelay: 500,
        explosive: true,
        explosionDmg: 60,
        explosionRadius: 30,
        explosionElement: "lightning",
        loot: { copper: 20, silver: 3, gold: 1 },
        onDestroy: { shockwave: 35, screenShake: 8, particles: "spark", hazard: "lightning_field" },
      },
      {
        id: "orbital_top",
        name: "Fragment Orbitalny",
        material: "crystal",
        hp: 30,
        x: 25, y: 75, w: 20, h: 20,
        dependsOn: ["core"],
        collapseDelay: 150,
        explosive: true,
        explosionDmg: 20,
        explosionRadius: 14,
        explosionElement: "lightning",
        loot: { copper: 5 },
      },
      {
        id: "orbital_l",
        name: "Fragment Orbitalny",
        material: "crystal",
        hp: 30,
        x: 0, y: 40, w: 20, h: 20,
        dependsOn: ["core"],
        collapseDelay: 200,
        explosive: true,
        explosionDmg: 20,
        explosionRadius: 14,
        explosionElement: "lightning",
        loot: { copper: 5 },
      },
      {
        id: "orbital_r",
        name: "Fragment Orbitalny",
        material: "crystal",
        hp: 30,
        x: 50, y: 40, w: 20, h: 20,
        dependsOn: ["core"],
        collapseDelay: 250,
        explosive: true,
        explosionDmg: 20,
        explosionRadius: 14,
        explosionElement: "lightning",
        loot: { copper: 5 },
      },
    ],
    fullDestroyBonus: { gold: 3, message: "Kryształ Mocy implodował!" },
    style: {
      force_field: { bg: "radial-gradient(circle,rgba(100,180,255,0.15),rgba(60,120,200,0.08),transparent)", radius: "50%", shadow: "0 0 20px rgba(80,160,255,0.3), inset 0 0 10px rgba(80,160,255,0.2)" },
      core: { bg: "radial-gradient(circle,#e0c0ff,#c080ff,#a040e0,#8020c0)", radius: "20%", shadow: "0 0 24px rgba(180,80,255,0.7), 0 0 12px rgba(140,40,220,0.5)" },
      orbital_top: { bg: "radial-gradient(circle,#c0a0ff,#a070e0,#8050c0)", radius: "40%", shadow: "0 0 10px rgba(160,80,240,0.5)" },
      orbital_l: { bg: "radial-gradient(circle,#c0a0ff,#a070e0,#8050c0)", radius: "40%", shadow: "0 0 10px rgba(160,80,240,0.5)" },
      orbital_r: { bg: "radial-gradient(circle,#c0a0ff,#a070e0,#8050c0)", radius: "40%", shadow: "0 0 10px rgba(160,80,240,0.5)" },
    },
  },
};

// Map biome IDs to structures that can spawn in them
export const BIOME_STRUCTURES = {};
for (const [key, def] of Object.entries(STRUCTURE_DEFS)) {
  for (const biomeId of def.biomes) {
    if (!BIOME_STRUCTURES[biomeId]) BIOME_STRUCTURES[biomeId] = [];
    BIOME_STRUCTURES[biomeId].push(key);
  }
}

// Get a random structure for a biome (respects rarity as spawn chance)
export function getRandomStructure(biomeId) {
  const candidates = BIOME_STRUCTURES[biomeId];
  if (!candidates || candidates.length === 0) return null;
  // Pick a random candidate, then check rarity
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  for (const structId of shuffled) {
    const def = STRUCTURE_DEFS[structId];
    if (Math.random() < def.rarity) return def;
  }
  return null;
}

// Create a runtime structure instance from a definition
export function createStructureInstance(def, baseX, baseY, roomNumber) {
  const roomScale = 1 + Math.min(roomNumber / 20, 0.5);
  const segments = def.segments.map(seg => ({
    ...seg,
    hp: Math.round(seg.hp * roomScale),
    maxHp: Math.round(seg.hp * roomScale),
    alive: true,
    hitAnim: 0,
    destroying: false,
  }));
  return {
    id: `struct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    defId: def.id,
    name: def.name,
    x: baseX,
    y: baseY,
    width: def.width,
    height: def.height,
    segments,
    fullDestroyBonus: def.fullDestroyBonus,
    style: def.style,
    allDestroyed: false,
  };
}

// Check if a segment should cascade-collapse based on destroyed supports
export function checkCascadeCollapse(structure, destroyedSegId) {
  const cascadeTargets = [];
  for (const seg of structure.segments) {
    if (!seg.alive || seg.destroying) continue;
    if (!seg.dependsOn || seg.dependsOn.length === 0) continue;
    // Check if any/all supports are destroyed
    const requireAll = seg.requireAllSupports !== false; // default true: needs ALL supports gone
    if (requireAll) {
      // All supports must be gone
      const allGone = seg.dependsOn.every(depId =>
        structure.segments.find(s => s.id === depId && (!s.alive || s.destroying))
      );
      if (allGone) {
        cascadeTargets.push({ segId: seg.id, delay: seg.collapseDelay || 300 });
      }
    } else {
      // Any support gone triggers collapse
      const anyGone = seg.dependsOn.some(depId =>
        structure.segments.find(s => s.id === depId && (!s.alive || s.destroying))
      );
      if (anyGone) {
        cascadeTargets.push({ segId: seg.id, delay: seg.collapseDelay || 300 });
      }
    }
  }
  return cascadeTargets;
}

// Calculate total collision bounds for structure (for obstacle spacing)
export function getStructureBounds(baseX, baseY, def) {
  // Return bounding box in game coordinate units
  // Width/height are in px, need to convert to % for panoramic
  return {
    x: baseX,
    y: baseY,
    // Use larger spacing multiplier to prevent overlap
    radius: Math.max(def.width, def.height) * 0.12,
  };
}

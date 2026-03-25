// DungeonHazards — Hazard definitions for multi-level dungeons
// Dynamic environmental threats that activate during combat waves
// All player-facing text in Polish

export const DUNGEON_HAZARDS = {
  // ─── MINE HAZARDS ───
  cave_in: {
    id: "cave_in",
    name: "Zawalenie Tunelu",
    icon: "mountain",
    desc: "Sklepienie jaskini się wali — unikaj spadających głazów!",
    warningDuration: 2000,    // ms of warning before activation
    warningFx: "dust_fall",
    activeDuration: 3000,     // ms of active danger
    cooldown: 15000,          // ms before can trigger again
    radius: 4,                // tile radius of effect
    damage: 20,
    element: null,
    effect: "terrain_raise",  // raises terrain height in area
    terrainMod: {
      type: "raise",
      amount: 1.5,
      blocksPath: true,
    },
    visual: {
      particles: "rock_debris",
      shakeIntensity: 8,
      dustColor: "#8a7a60",
    },
  },

  gas_pocket: {
    id: "gas_pocket",
    name: "Kieszeń Gazowa",
    icon: "cloud",
    desc: "Trujący gaz wydobywa się ze szczelin!",
    warningDuration: 1500,
    warningFx: "gas_hiss",
    activeDuration: 8000,
    cooldown: 20000,
    radius: 3,
    damage: 3,               // damage per second while in zone
    element: "shadow",
    effect: "poison_zone",
    terrainMod: null,
    visual: {
      particles: "toxic_cloud",
      shakeIntensity: 0,
      gasColor: "rgba(80,160,40,0.4)",
    },
  },

  // ─── CRYPT HAZARDS ───
  spirit_surge: {
    id: "spirit_surge",
    name: "Fala Duchów",
    icon: "ghost",
    desc: "Niespokojne dusze atakują wszystko na swojej drodze!",
    warningDuration: 2500,
    warningFx: "ghost_wail",
    activeDuration: 4000,
    cooldown: 18000,
    radius: 5,
    damage: 15,
    element: "shadow",
    effect: "wave_damage",
    terrainMod: null,
    visual: {
      particles: "ghost_wisps",
      shakeIntensity: 3,
      waveColor: "rgba(120,60,180,0.5)",
    },
  },

  trap_floor: {
    id: "trap_floor",
    name: "Pułapka Podłogowa",
    icon: "lightning",
    desc: "Starożytne pułapki wciąż działają — uważaj na płyty naciskowe!",
    warningDuration: 800,
    warningFx: "click_mechanism",
    activeDuration: 1000,
    cooldown: 10000,
    radius: 2,
    damage: 25,
    element: null,
    effect: "spike_trap",
    terrainMod: null,
    visual: {
      particles: "spike_burst",
      shakeIntensity: 2,
      spikeColor: "#808080",
    },
  },

  // ─── CAVE HAZARDS ───
  flooding: {
    id: "flooding",
    name: "Zalanie",
    icon: "water",
    desc: "Woda wdziera się do jaskini — niskie tereny zostaną zalane!",
    warningDuration: 3000,
    warningFx: "water_rush",
    activeDuration: 12000,
    cooldown: 25000,
    radius: 0,                // affects all tiles below height threshold
    damage: 2,                // per second in water
    element: "ice",
    effect: "flood",
    terrainMod: {
      type: "flood",
      heightThreshold: 1.0,   // tiles at or below this height get flooded
      slowMult: 0.5,
    },
    visual: {
      particles: "water_rise",
      shakeIntensity: 4,
      waterColor: "rgba(40,100,140,0.5)",
    },
  },

  stalactite_fall: {
    id: "stalactite_fall",
    name: "Spadające Stalaktyty",
    icon: "lightning",
    desc: "Stalaktyty spadają z sufitu — uciekaj z zagrożonej strefy!",
    warningDuration: 1500,
    warningFx: "crack_sound",
    activeDuration: 2000,
    cooldown: 12000,
    radius: 2,
    damage: 30,
    element: null,
    effect: "impact_damage",
    terrainMod: {
      type: "crater",
      depth: 0.5,
    },
    visual: {
      particles: "falling_rocks",
      shakeIntensity: 6,
      impactColor: "#6a6050",
    },
  },

  // ─── RUINS HAZARDS ───
  // Uses cave_in and trap_floor from above, plus gas_pocket
};

// ─── HAZARD TRIGGER LOGIC ───

export function shouldTriggerHazard(hazardSlot, waveNumber, now, lastTriggerTime) {
  if (hazardSlot.triggered && now - lastTriggerTime < DUNGEON_HAZARDS[hazardSlot.hazardType]?.cooldown) {
    return false;
  }
  if (waveNumber >= hazardSlot.triggerWave) {
    // 8% chance per combat tick (called ~60fps, so roughly every ~0.8s on average)
    return Math.random() < 0.001;
  }
  return false;
}

// ─── HAZARD EFFECT APPLICATION ───

export function applyHazardEffect(hazard, targetPos, terrainData, terrainDestruction) {
  const def = DUNGEON_HAZARDS[hazard.hazardType];
  if (!def) return null;

  const result = {
    hazardType: hazard.hazardType,
    position: targetPos,
    radius: def.radius,
    damage: def.damage,
    element: def.element,
    duration: def.activeDuration,
    startTime: Date.now(),
    visual: def.visual,
  };

  // Apply terrain modifications
  if (def.terrainMod && terrainData?.heightMap) {
    const { data, cols } = terrainData.heightMap;

    if (def.terrainMod.type === "raise") {
      for (let dy = -def.radius; dy <= def.radius; dy++) {
        for (let dx = -def.radius; dx <= def.radius; dx++) {
          const c = targetPos.col + dx;
          const r = targetPos.row + dy;
          if (c >= 0 && c < cols && r >= 0 && r < terrainData.heightMap.rows) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= def.radius) {
              const falloff = 1 - dist / def.radius;
              const idx = r * cols + c;
              data[idx] = Math.min(4, data[idx] + def.terrainMod.amount * falloff);
            }
          }
        }
      }
    } else if (def.terrainMod.type === "crater") {
      if (terrainDestruction) {
        terrainDestruction.applyExplosion(
          targetPos.col + 0.5, targetPos.row + 0.5,
          def.radius, def.element, terrainData
        );
      }
    }
  }

  return result;
}

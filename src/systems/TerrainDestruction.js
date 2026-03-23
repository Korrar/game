// TerrainDestruction — Destructible terrain system for isometric mode
// Handles: explosion craters, burning vegetation, ice freezing water,
// and dynamic terrain modification during combat

import { ISO_CONFIG, getHeightAt } from "../utils/isometricUtils.js";

const { MAP_COLS, MAP_ROWS } = ISO_CONFIG;

// ─── TERRAIN EFFECT TYPES ───

export const TERRAIN_EFFECTS = {
  CRATER: "crater",
  BURNING: "burning",
  FROZEN: "frozen",
  SCORCHED: "scorched",
  POISONED: "poisoned",
  SMOKE: "smoke",
};

// ─── EFFECT CONFIG ───

const EFFECT_CONFIG = {
  crater: {
    heightReduction: 0.8,  // how much to lower terrain
    duration: -1,          // permanent
    speedMod: 0.85,        // slight slow in craters
    color: "#3a2a1a",
    particleType: "dust",
  },
  burning: {
    duration: 5000,        // 5 seconds burn
    damagePerSec: 4,
    element: "fire",
    speedMod: 0.70,        // slow through fire
    color: "#ff6020",
    particleType: "fire",
    spreadChance: 0.15,    // chance to spread to adjacent vegetation
    smokeAfter: true,      // leaves smoke zone after burning
  },
  frozen: {
    duration: 12000,       // 12 seconds frozen
    speedMod: 1.20,        // ice is slippery-fast
    color: "#80c0e0",
    particleType: "ice",
    makesWalkable: true,   // frozen water becomes walkable
  },
  scorched: {
    duration: 15000,       // 15 seconds
    speedMod: 0.90,
    color: "#2a1a10",
    particleType: null,
  },
  poisoned: {
    duration: 8000,        // 8 seconds
    damagePerSec: 3,
    element: "poison",
    speedMod: 0.65,
    color: "#40a030",
    particleType: "poison",
  },
  smoke: {
    duration: 4000,        // 4 seconds
    speedMod: 0.75,
    blocksLOS: true,       // blocks line of sight
    color: "#666666",
    particleType: "smoke",
  },
};

// ─── TERRAIN DESTRUCTION STATE ───

export class TerrainDestructionState {
  constructor() {
    // Active terrain effects: Map<tileKey, Array<effect>>
    this.effects = new Map();
    // Destroyed vegetation IDs
    this.destroyedVeg = new Set();
    // Terrain height modifications (craters)
    this.heightMods = new Map();
    // Overlay modifications (frozen water etc.)
    this.overlayMods = new Map();
    // Pending particle spawns
    this.pendingParticles = [];
  }

  // ─── EXPLOSION ───
  // Creates a crater, destroys vegetation, and applies fire/effects in radius

  applyExplosion(wx, wy, radius, element, terrainData) {
    if (!terrainData) return;
    const { heightMap, vegetation, overlays, cols, rows } = terrainData;

    const centerCol = Math.floor(wx);
    const centerRow = Math.floor(wy);
    const radiusTiles = Math.ceil(radius);
    const r2 = radius * radius;

    const results = { destroyedVeg: [], craterTiles: [], effectTiles: [] };

    for (let dr = -radiusTiles; dr <= radiusTiles; dr++) {
      for (let dc = -radiusTiles; dc <= radiusTiles; dc++) {
        const col = centerCol + dc;
        const row = centerRow + dr;
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;

        const d2 = dc * dc + dr * dr;
        if (d2 > r2) continue;

        const dist = Math.sqrt(d2);
        const falloff = 1 - dist / radius; // 1 at center, 0 at edge
        const tileKey = row * cols + col;

        // Crater: lower terrain in inner 60% of blast
        if (dist < radius * 0.6) {
          const reduction = EFFECT_CONFIG.crater.heightReduction * falloff;
          const currentH = getHeightAt(heightMap, col, row);
          const newH = Math.max(0, currentH - reduction);
          heightMap.data[row * cols + col] = Math.round(newH * 2) / 2;
          this.heightMods.set(tileKey, { originalH: currentH, newH });
          results.craterTiles.push({ col, row });

          // Add crater effect
          this._addEffect(tileKey, {
            type: TERRAIN_EFFECTS.CRATER,
            col, row,
            startTime: Date.now(),
            duration: -1,
            intensity: falloff,
          });
        }

        // Element-specific effects in outer ring
        if (element === "fire" && dist < radius * 0.8) {
          this._addEffect(tileKey, {
            type: TERRAIN_EFFECTS.BURNING,
            col, row,
            startTime: Date.now(),
            duration: EFFECT_CONFIG.burning.duration * falloff,
            intensity: falloff,
          });
          results.effectTiles.push({ col, row, type: "burning" });
        } else if (element === "ice" && dist < radius * 0.9) {
          // Check if water tile — freeze it
          const overlay = overlays[tileKey];
          if (overlay === 2) {
            this._addEffect(tileKey, {
              type: TERRAIN_EFFECTS.FROZEN,
              col, row,
              startTime: Date.now(),
              duration: EFFECT_CONFIG.frozen.duration,
              intensity: 1,
            });
            this.overlayMods.set(tileKey, { original: 2, current: 5 }); // 5 = frozen
            results.effectTiles.push({ col, row, type: "frozen" });
          }
        } else if (element === "poison" && dist < radius * 0.85) {
          this._addEffect(tileKey, {
            type: TERRAIN_EFFECTS.POISONED,
            col, row,
            startTime: Date.now(),
            duration: EFFECT_CONFIG.poisoned.duration * (0.5 + falloff * 0.5),
            intensity: falloff,
          });
          results.effectTiles.push({ col, row, type: "poisoned" });
        }
      }
    }

    // Destroy vegetation in blast radius
    if (vegetation) {
      for (const veg of vegetation) {
        if (!veg.alive || !veg.destructible) continue;
        const vdx = veg.wx - wx;
        const vdy = veg.wy - wy;
        const vd2 = vdx * vdx + vdy * vdy;
        if (vd2 < r2 * 0.7) {
          const falloff2 = 1 - Math.sqrt(vd2) / radius;
          const damage = Math.round(30 * falloff2 + 10);
          veg.hp -= damage;
          if (veg.hp <= 0) {
            veg.alive = false;
            this.destroyedVeg.add(veg.id);
            results.destroyedVeg.push(veg);

            // Burning vegetation leaves fire effect
            if (element === "fire") {
              const tKey = veg.row * cols + veg.col;
              this._addEffect(tKey, {
                type: TERRAIN_EFFECTS.BURNING,
                col: veg.col, row: veg.row,
                startTime: Date.now(),
                duration: EFFECT_CONFIG.burning.duration * 1.5,
                intensity: 0.8,
              });
            }

            this.pendingParticles.push({
              type: "destruction",
              wx: veg.wx, wy: veg.wy,
              element: element || "melee",
              vegType: veg.type,
            });
          }
        }
      }
    }

    // Add explosion particles
    this.pendingParticles.push({
      type: "explosion",
      wx, wy,
      radius,
      element: element || "fire",
    });

    return results;
  }

  // ─── BURN VEGETATION ───
  // Fire projectile hits a specific tree/vegetation

  burnVegetation(vegId, terrainData) {
    if (!terrainData?.vegetation) return false;
    const veg = terrainData.vegetation.find(v => v.id === vegId);
    if (!veg || !veg.alive) return false;

    const tileKey = veg.row * terrainData.cols + veg.col;

    // Set vegetation on fire
    this._addEffect(tileKey, {
      type: TERRAIN_EFFECTS.BURNING,
      col: veg.col, row: veg.row,
      startTime: Date.now(),
      duration: EFFECT_CONFIG.burning.duration,
      intensity: 1.0,
      linkedVegId: vegId,
    });

    this.pendingParticles.push({
      type: "burn_start",
      wx: veg.wx, wy: veg.wy,
    });

    return true;
  }

  // ─── FREEZE WATER ───
  // Ice projectile hits water — creates walkable frozen surface

  freezeWaterAt(col, row, terrainData) {
    if (!terrainData) return false;
    const { overlays, cols } = terrainData;
    const idx = row * cols + col;

    if (overlays[idx] !== 2) return false; // not water

    this._addEffect(idx, {
      type: TERRAIN_EFFECTS.FROZEN,
      col, row,
      startTime: Date.now(),
      duration: EFFECT_CONFIG.frozen.duration,
      intensity: 1.0,
    });

    this.overlayMods.set(idx, { original: 2, current: 5 });

    // Also freeze adjacent water tiles with decreasing probability
    const neighbors = [
      { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
      { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
    ];
    for (const n of neighbors) {
      const nc = col + n.dc, nr = row + n.dr;
      if (nc < 0 || nc >= terrainData.cols || nr < 0 || nr >= terrainData.rows) continue;
      const nIdx = nr * cols + nc;
      if (overlays[nIdx] === 2 && Math.random() < 0.6) {
        this._addEffect(nIdx, {
          type: TERRAIN_EFFECTS.FROZEN,
          col: nc, row: nr,
          startTime: Date.now(),
          duration: EFFECT_CONFIG.frozen.duration * 0.8,
          intensity: 0.7,
        });
        this.overlayMods.set(nIdx, { original: 2, current: 5 });
      }
    }

    this.pendingParticles.push({
      type: "freeze",
      wx: col + 0.5, wy: row + 0.5,
    });

    return true;
  }

  // ─── UPDATE ───
  // Tick all effects, remove expired, spread fire, apply damage

  update(terrainData, now) {
    if (!now) now = Date.now();
    const expired = [];

    for (const [tileKey, effects] of this.effects) {
      for (let i = effects.length - 1; i >= 0; i--) {
        const eff = effects[i];
        if (eff.duration < 0) continue; // permanent

        const elapsed = now - eff.startTime;
        if (elapsed >= eff.duration) {
          // Effect expired
          const cfg = EFFECT_CONFIG[eff.type];

          // Burning → smoke transition
          if (eff.type === TERRAIN_EFFECTS.BURNING && cfg.smokeAfter) {
            effects[i] = {
              type: TERRAIN_EFFECTS.SMOKE,
              col: eff.col, row: eff.row,
              startTime: now,
              duration: EFFECT_CONFIG.smoke.duration,
              intensity: eff.intensity * 0.5,
            };

            // Destroy linked vegetation
            if (eff.linkedVegId && terrainData?.vegetation) {
              const veg = terrainData.vegetation.find(v => v.id === eff.linkedVegId);
              if (veg && veg.alive) {
                veg.alive = false;
                this.destroyedVeg.add(veg.id);
                // Leave scorched ground
                this._addEffect(tileKey, {
                  type: TERRAIN_EFFECTS.SCORCHED,
                  col: eff.col, row: eff.row,
                  startTime: now,
                  duration: EFFECT_CONFIG.scorched.duration,
                  intensity: 0.6,
                });
              }
            }
            continue;
          }

          // Frozen → thaw
          if (eff.type === TERRAIN_EFFECTS.FROZEN) {
            const overlayMod = this.overlayMods.get(tileKey);
            if (overlayMod) {
              // Restore original overlay
              if (terrainData?.overlays) {
                terrainData.overlays[tileKey] = overlayMod.original;
              }
              this.overlayMods.delete(tileKey);
            }
          }

          effects.splice(i, 1);
        }
      }

      if (effects.length === 0) {
        expired.push(tileKey);
      }
    }

    for (const key of expired) {
      this.effects.delete(key);
    }

    // Fire spread to adjacent vegetation
    if (terrainData?.vegetation) {
      for (const [, effects] of this.effects) {
        for (const eff of effects) {
          if (eff.type !== TERRAIN_EFFECTS.BURNING) continue;
          if (Math.random() > 0.003) continue; // very rare per frame

          for (const veg of terrainData.vegetation) {
            if (!veg.alive || !veg.destructible) continue;
            const dx = veg.col - eff.col;
            const dy = veg.row - eff.row;
            if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2 && (dx !== 0 || dy !== 0)) {
              if (Math.random() < EFFECT_CONFIG.burning.spreadChance) {
                this.burnVegetation(veg.id, terrainData);
              }
            }
          }
        }
      }
    }
  }

  // ─── QUERIES ───

  // Get speed modifier for a tile considering active effects
  getEffectSpeedMod(col, row, cols) {
    const tileKey = row * cols + col;
    const effects = this.effects.get(tileKey);
    if (!effects || effects.length === 0) return 1.0;

    let mod = 1.0;
    for (const eff of effects) {
      const cfg = EFFECT_CONFIG[eff.type];
      if (cfg?.speedMod) {
        mod = Math.min(mod, cfg.speedMod);
      }
    }
    return mod;
  }

  // Get damage per second for a tile (fire, poison zones)
  getEffectDamage(col, row, cols) {
    const tileKey = row * cols + col;
    const effects = this.effects.get(tileKey);
    if (!effects || effects.length === 0) return null;

    for (const eff of effects) {
      const cfg = EFFECT_CONFIG[eff.type];
      if (cfg?.damagePerSec) {
        return { damage: cfg.damagePerSec * eff.intensity, element: cfg.element };
      }
    }
    return null;
  }

  // Check if tile blocks LOS (smoke)
  doesEffectBlockLOS(col, row, cols) {
    const tileKey = row * cols + col;
    const effects = this.effects.get(tileKey);
    if (!effects) return false;
    return effects.some(e => EFFECT_CONFIG[e.type]?.blocksLOS);
  }

  // Check if water tile is frozen (walkable)
  isWaterFrozen(col, row, cols) {
    const tileKey = row * cols + col;
    return this.overlayMods.has(tileKey) && this.overlayMods.get(tileKey).current === 5;
  }

  // Get all active effects for rendering
  getAllEffects() {
    const all = [];
    for (const [, effects] of this.effects) {
      for (const eff of effects) {
        all.push(eff);
      }
    }
    return all;
  }

  // Flush pending particles (read and clear)
  flushParticles() {
    const p = this.pendingParticles;
    this.pendingParticles = [];
    return p;
  }

  // ─── INTERNAL ───

  _addEffect(tileKey, effect) {
    if (!this.effects.has(tileKey)) {
      this.effects.set(tileKey, []);
    }
    // Don't stack same type
    const existing = this.effects.get(tileKey);
    const sameIdx = existing.findIndex(e => e.type === effect.type);
    if (sameIdx >= 0) {
      // Refresh duration if new effect is stronger
      if (effect.intensity >= existing[sameIdx].intensity) {
        existing[sameIdx] = effect;
      }
    } else {
      existing.push(effect);
    }
  }

  // Reset state for new room
  reset() {
    this.effects.clear();
    this.destroyedVeg.clear();
    this.heightMods.clear();
    this.overlayMods.clear();
    this.pendingParticles = [];
  }
}

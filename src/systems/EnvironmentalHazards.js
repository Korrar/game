// EnvironmentalHazards — persistent hazard zones spawned by obstacle destruction
// Destroyed objects leave behind hazards: oil spills, rubble, toxic clouds, etc.
// Hazards affect NPC movement, deal damage over time, and interact with elements

export const HAZARD_CONFIG = {
  maxHazards: 15,
  defaultDuration: 10000,   // 10 seconds
  tickRate: 500,            // damage tick every 500ms
};

// Hazard type definitions
export const HAZARD_TYPES = {
  oil_spill: {
    name: "Plama oleju",
    color: "rgba(40,30,10,0.5)",
    radius: 25,              // px radius
    duration: 15000,
    speedMod: 0.6,           // 60% speed through oil
    damagePerTick: 0,
    element: null,
    flammable: true,         // fire ignites oil spill
    igniteEffect: "fire_pool",
    icon: "💧",
  },
  fire_pool: {
    name: "Ogniste jezioro",
    color: "rgba(255,80,20,0.45)",
    radius: 28,
    duration: 8000,
    speedMod: 0.5,
    damagePerTick: 6,
    element: "fire",
    flammable: false,
    particleType: "fire",
    icon: "🔥",
  },
  rubble_zone: {
    name: "Gruzowisko",
    color: "rgba(100,90,70,0.4)",
    radius: 22,
    duration: 20000,         // long lasting
    speedMod: 0.45,          // major slow
    damagePerTick: 0,
    element: null,
    flammable: false,
    blocksProjectiles: true, // partially blocks projectile paths
    icon: "🪨",
  },
  toxic_cloud: {
    name: "Toksyczna chmura",
    color: "rgba(60,160,30,0.35)",
    radius: 30,
    duration: 8000,
    speedMod: 0.7,
    damagePerTick: 4,
    element: "poison",
    flammable: true,         // fire + poison = toxic explosion
    igniteEffect: null,      // special handling: creates explosion
    igniteExplosion: { damage: 25, radius: 35, element: "fire" },
    blocksLOS: true,
    icon: "☁️",
  },
  ice_slick: {
    name: "Lodowa tafla",
    color: "rgba(140,210,255,0.35)",
    radius: 24,
    duration: 12000,
    speedMod: 1.3,           // faster but uncontrollable
    damagePerTick: 0,
    element: "ice",
    flammable: false,
    slideFactor: 0.85,       // NPCs slide (reduced control)
    icon: "❄️",
  },
  lightning_field: {
    name: "Pole elektryczne",
    color: "rgba(255,238,0,0.3)",
    radius: 20,
    duration: 6000,
    speedMod: 0.8,
    damagePerTick: 5,
    element: "lightning",
    flammable: false,
    chainToMetal: true,      // chains to nearby metal obstacles
    icon: "⚡",
  },
  shadow_rift: {
    name: "Szczelina cienia",
    color: "rgba(50,20,80,0.5)",
    radius: 18,
    duration: 10000,
    speedMod: 0.55,
    damagePerTick: 3,
    element: "shadow",
    flammable: false,
    blocksLOS: true,
    fearChance: 0.15,        // chance to fear NPCs entering
    icon: "🌑",
  },
};

// Map: which obstacle materials create which hazards on destruction
export const MATERIAL_HAZARDS = {
  metal:   { hazard: "oil_spill",      chance: 0.35 },
  stone:   { hazard: "rubble_zone",    chance: 0.40 },
  ice:     { hazard: "ice_slick",      chance: 0.50 },
  crystal: { hazard: "lightning_field", chance: 0.30 },
  organic: { hazard: "toxic_cloud",    chance: 0.25 },
  wood:    { hazard: null,             chance: 0 },    // wood just burns
  sand:    { hazard: null,             chance: 0 },    // sand just crumbles
};

// Special hazards from explosive obstacles
export const EXPLOSIVE_HAZARDS = {
  oil_barrel:       { hazard: "fire_pool",      chance: 1.0, radiusMult: 1.3 },
  gas_mushroom:     { hazard: "toxic_cloud",    chance: 1.0, radiusMult: 1.2 },
  volatile_crystal: { hazard: "lightning_field", chance: 1.0, radiusMult: 1.1 },
  frozen_gas_vent:  { hazard: "ice_slick",      chance: 1.0, radiusMult: 1.4 },
  swamp_gas_pod:    { hazard: "toxic_cloud",    chance: 0.8, radiusMult: 0.9 },
  magma_rock:       { hazard: "fire_pool",      chance: 1.0, radiusMult: 1.2 },
};

export class EnvironmentalHazardManager {
  constructor() {
    this.hazards = [];
    this.pendingEffects = [];  // effects to apply (explosions, chain reactions)
  }

  // Spawn a hazard from obstacle destruction
  spawnFromDestruction(obstacle, element) {
    // Check for explosive-specific hazards first
    const explosiveHazard = EXPLOSIVE_HAZARDS[obstacle.type];
    if (explosiveHazard && Math.random() < explosiveHazard.chance) {
      return this._createHazard(
        explosiveHazard.hazard,
        obstacle.x, obstacle.y,
        explosiveHazard.radiusMult
      );
    }

    // Check material-based hazards
    const matHazard = MATERIAL_HAZARDS[obstacle.material];
    if (matHazard?.hazard && Math.random() < matHazard.chance) {
      return this._createHazard(matHazard.hazard, obstacle.x, obstacle.y, 1.0);
    }

    // Element-based hazard override
    if (element === "fire" && obstacle.material === "wood") {
      return this._createHazard("fire_pool", obstacle.x, obstacle.y, 0.7);
    }
    if (element === "ice") {
      return this._createHazard("ice_slick", obstacle.x, obstacle.y, 0.8);
    }

    return null;
  }

  // Update all hazards: tick damage, check expiry, handle interactions
  update(now) {
    if (!now) now = Date.now();
    const expired = [];

    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      const elapsed = now - h.startTime;

      if (elapsed >= h.duration) {
        expired.push(i);
        continue;
      }

      // Calculate remaining life ratio for fade effect
      h.lifeRatio = 1 - elapsed / h.duration;

      // Fade alpha in last 20% of lifetime
      if (h.lifeRatio < 0.2) {
        h.currentAlpha = h.baseAlpha * (h.lifeRatio / 0.2);
      }
    }

    // Remove expired (reverse order)
    for (let i = expired.length - 1; i >= 0; i--) {
      this.hazards.splice(expired[i], 1);
    }
  }

  // Check if a position is inside any hazard, return effects
  getHazardEffectsAt(x, y) {
    const effects = {
      speedMod: 1.0,
      damage: 0,
      element: null,
      slideFactor: 0,
      blocksLOS: false,
      fearChance: 0,
    };

    for (const h of this.hazards) {
      const dx = x - h.x;
      const dy = y - h.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > h.radius) continue;

      const def = HAZARD_TYPES[h.type];
      if (!def) continue;

      // Apply worst speed modifier
      effects.speedMod = Math.min(effects.speedMod, def.speedMod);

      // Accumulate damage (strongest element wins)
      if (def.damagePerTick > effects.damage) {
        effects.damage = def.damagePerTick;
        effects.element = def.element;
      }

      if (def.slideFactor) effects.slideFactor = Math.max(effects.slideFactor, def.slideFactor);
      if (def.blocksLOS) effects.blocksLOS = true;
      if (def.fearChance) effects.fearChance = Math.max(effects.fearChance, def.fearChance);
    }

    return effects;
  }

  // Handle element interaction with existing hazards (e.g., fire hits oil spill)
  applyElementToHazards(x, y, radius, element) {
    const reactions = [];

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      const dx = x - h.x;
      const dy = y - h.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius + h.radius) continue;

      const def = HAZARD_TYPES[h.type];
      if (!def) continue;

      // Fire hits flammable hazard
      if (element === "fire" && def.flammable) {
        if (def.igniteExplosion) {
          // Toxic cloud + fire = explosion
          reactions.push({
            type: "explosion",
            x: h.x,
            y: h.y,
            ...def.igniteExplosion,
          });
          this.hazards.splice(i, 1);
        } else if (def.igniteEffect) {
          // Oil spill → fire pool
          const newType = def.igniteEffect;
          h.type = newType;
          const newDef = HAZARD_TYPES[newType];
          h.duration = newDef.duration;
          h.startTime = Date.now();
          h.radius = Math.max(h.radius, newDef.radius);
          reactions.push({
            type: "ignite",
            x: h.x,
            y: h.y,
            hazardType: newType,
          });
        }
      }

      // Ice hits fire pool → steam (smoke effect)
      if (element === "ice" && h.type === "fire_pool") {
        h.type = "toxic_cloud"; // repurpose as steam/smoke
        h.duration = 5000;
        h.startTime = Date.now();
        reactions.push({
          type: "steam",
          x: h.x,
          y: h.y,
        });
      }
    }

    return reactions;
  }

  // Get all hazards for rendering
  getAllHazards() {
    return this.hazards;
  }

  // Flush pending effects
  flushEffects() {
    const fx = this.pendingEffects;
    this.pendingEffects = [];
    return fx;
  }

  _createHazard(type, x, y, radiusMult = 1.0) {
    const def = HAZARD_TYPES[type];
    if (!def) return null;

    // Cap hazards
    if (this.hazards.length >= HAZARD_CONFIG.maxHazards) {
      // Remove oldest
      this.hazards.shift();
    }

    const hazard = {
      id: `hazard_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      x,
      y,
      radius: def.radius * radiusMult,
      duration: def.duration,
      startTime: Date.now(),
      lifeRatio: 1.0,
      baseAlpha: 1.0,
      currentAlpha: 1.0,
    };

    this.hazards.push(hazard);
    return hazard;
  }

  reset() {
    this.hazards = [];
    this.pendingEffects = [];
  }
}

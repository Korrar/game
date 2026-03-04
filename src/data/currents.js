// Prądy Morskie — modyfikatory fizyki terenu per-pokój
// Wpływają na pociski, NPC, pułapki i najemników
// Mogą się zmieniać w trakcie walki (co 15s zmiana kierunku)

export const CURRENT_TYPES = {
  updraft: {
    id: "updraft",
    name: "Prąd Wstępujący",
    icon: "feather",
    desc: "Pociski łukowe lecą dalej, wrogowie skaczą wyżej",
    color: "#80c0ff",
    glowColor: "rgba(128,192,255,0.2)",
    // Physics modifiers
    gravityMult: 0.6,       // arc projectiles fly further (less gravity)
    npcJumpMult: 1.5,       // enemies jump higher during dodge
    projectileLifeMult: 1.3, // projectiles live 30% longer
    // Visual
    particleDir: "up",
    particleColor: "#80c0ff",
    excludeBiomes: ["volcano"],
    weight: 2,
  },
  lateral: {
    id: "lateral",
    name: "Prąd Boczny",
    icon: "wind",
    desc: "Wszystko dryfuje w jednym kierunku — pociski, wrogowie, najemnicy",
    color: "#60e080",
    glowColor: "rgba(96,224,128,0.2)",
    // Physics modifiers
    driftForce: 0.8,        // pixels per frame drift on everything
    driftDir: 0,            // set randomly: -1 or 1
    affectsNpcs: true,      // NPCs also drift
    affectsMercs: true,     // mercs also drift
    // Visual
    particleDir: "horizontal",
    particleColor: "#60e080",
    excludeBiomes: [],
    weight: 2,
  },
  turbulent: {
    id: "turbulent",
    name: "Prąd Turbulentny",
    icon: "vortex",
    desc: "Losowe mikroimpulsy co sekundę — totalny chaos",
    color: "#e06060",
    glowColor: "rgba(224,96,96,0.2)",
    // Physics modifiers
    impulseInterval: 1000,   // ms between random impulses
    impulseStrength: 1.5,    // random force magnitude
    affectsProjectiles: true,
    affectsNpcs: true,
    affectsMercs: false,     // mercs are anchored (would be too annoying)
    // Visual
    particleDir: "random",
    particleColor: "#e06060",
    excludeBiomes: [],
    weight: 1,
  },
  deadCalm: {
    id: "deadCalm",
    name: "Martwe Morze",
    icon: "anchor",
    desc: "Brak grawitacji — pociski łukowe lecą prosto",
    color: "#a0a0c0",
    glowColor: "rgba(160,160,192,0.2)",
    // Physics modifiers
    gravityMult: 0,          // no gravity = arc becomes linear
    projectileSpeedMult: 0.8, // slightly slower (eerie feel)
    npcSpeedMult: 0.85,      // enemies slightly slower
    // Visual
    particleDir: "float",
    particleColor: "#a0a0c0",
    excludeBiomes: ["volcano", "desert"],
    weight: 1,
  },
  vortex: {
    id: "vortex",
    name: "Wir Morski",
    icon: "vortex",
    desc: "Centrum pokoju przyciąga pociski i wrogów",
    color: "#4080c0",
    glowColor: "rgba(64,128,192,0.3)",
    // Physics modifiers
    attractPoint: { x: 50, y: 50 }, // percent of screen
    attractForce: 0.3,       // force pulling toward center
    attractRadius: 40,       // percent of screen — beyond this, no effect
    affectsProjectiles: true,
    affectsNpcs: true,
    // Visual
    particleDir: "spiral",
    particleColor: "#4080c0",
    excludeBiomes: [],
    weight: 1,
  },
  tailwind: {
    id: "tailwind",
    name: "Wiatr w Plecy",
    icon: "feather",
    desc: "Pociski gracza lecą szybciej, pociski wrogów wolniej",
    color: "#40e0a0",
    glowColor: "rgba(64,224,160,0.2)",
    // Physics modifiers
    playerProjectileSpeedMult: 1.4,
    enemyProjectileSpeedMult: 0.6,
    // Visual
    particleDir: "forward",
    particleColor: "#40e0a0",
    excludeBiomes: [],
    weight: 2,
  },
};

// Chance per room to roll a current (independent of weather)
export const CURRENT_CHANCE = 0.30;

// Current shift: direction changes every N ms (only for lateral/turbulent)
export const CURRENT_SHIFT_INTERVAL = 15000; // 15 seconds

// Roll a current for the room
export function rollCurrent(biomeId) {
  if (Math.random() > CURRENT_CHANCE) return null;

  const eligible = Object.values(CURRENT_TYPES)
    .filter(c => !c.excludeBiomes.includes(biomeId));

  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((s, c) => s + c.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const c of eligible) {
    roll -= c.weight;
    if (roll <= 0) {
      const result = { ...c };
      // Randomize direction for lateral current
      if (result.id === "lateral") {
        result.driftDir = Math.random() < 0.5 ? -1 : 1;
      }
      return result;
    }
  }

  return null;
}

// Apply current physics to a projectile position each frame
export function applyCurrentToProjectile(projectile, current, dt) {
  if (!current) return;

  switch (current.id) {
    case "updraft":
      // Reduce gravity effect on arc projectiles
      if (projectile.vy !== undefined) {
        projectile.vy *= current.gravityMult;
      }
      break;

    case "lateral":
      // Drift projectile sideways
      projectile.x += current.driftForce * current.driftDir * dt;
      break;

    case "turbulent":
      // Random impulse (handled by interval timer externally)
      break;

    case "deadCalm":
      // Zero out gravity
      if (projectile.vy !== undefined) {
        projectile.vy = 0;
      }
      break;

    case "vortex": {
      // Pull toward attract point
      const dx = current.attractPoint.x - projectile.x;
      const dy = current.attractPoint.y - projectile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < current.attractRadius && dist > 1) {
        projectile.x += (dx / dist) * current.attractForce * dt;
        projectile.y += (dy / dist) * current.attractForce * dt;
      }
      break;
    }

    case "tailwind":
      // Speed is applied at spawn, not per-frame
      break;
  }
}

// Apply current physics to an NPC position each frame
export function applyCurrentToNpc(npc, current, dt) {
  if (!current) return;

  switch (current.id) {
    case "lateral":
      if (current.affectsNpcs) {
        npc.x += current.driftForce * current.driftDir * 0.5 * dt; // half effect on NPCs
      }
      break;

    case "vortex":
      if (current.affectsNpcs) {
        const dx = current.attractPoint.x - npc.x;
        const dy = current.attractPoint.y - npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < current.attractRadius && dist > 2) {
          npc.x += (dx / dist) * current.attractForce * 0.3 * dt;
          npc.y += (dy / dist) * current.attractForce * 0.3 * dt;
        }
      }
      break;

    case "deadCalm":
      // Slow NPCs
      if (current.npcSpeedMult) {
        npc._currentSpeedMult = current.npcSpeedMult;
      }
      break;
  }
}

// Get display info for the current (for UI overlay)
export function getCurrentDisplay(current) {
  if (!current) return null;
  return {
    name: current.name,
    desc: current.desc,
    icon: current.icon,
    color: current.color,
    glowColor: current.glowColor,
  };
}

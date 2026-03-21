// Pure-math animation offset functions (no physics engine dependency)

export function getWalkingOffsets(phase) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return { lLegX: s * 6, rLegX: -s * 6, lArmX: -s * 4, rArmX: s * 4, lLegY: Math.abs(c) * 3, rLegY: Math.abs(s) * 3 };
}

export function getQuadrupedOffsets(phase) {
  const s = Math.sin(phase), c = Math.cos(phase);
  return { flX: s * 5, frX: -s * 5, blX: -s * 5, brX: s * 5, flY: Math.abs(c) * 3, frY: Math.abs(s) * 3, blY: Math.abs(s) * 3, brY: Math.abs(c) * 3, tailPhase: phase };
}

export function getFloatingOffsets(phase) {
  return { bobY: Math.sin(phase * 0.7) * 5, armSway: Math.sin(phase) * 6, trailSway: Math.sin(phase * 1.3) * 4 };
}

export function getScorpionOffsets(phase) {
  const s = Math.sin(phase);
  return {
    legPhase: phase,
    l1X: s * 3, l2X: -s * 3, l3X: s * 3,
    r1X: -s * 3, r2X: s * 3, r3X: -s * 3,
    pincerOpen: Math.abs(Math.sin(phase * 0.5)) * 4,
    tailSway: Math.sin(phase * 0.8) * 3,
  };
}

export function getSpiderOffsets(phase) {
  const offsets = {};
  for (let i = 0; i < 4; i++) {
    const p = phase + i * Math.PI / 4;
    offsets[`ll${i}X`] = Math.sin(p) * 4;
    offsets[`rl${i}X`] = -Math.sin(p) * 4;
    offsets[`ll${i}Y`] = Math.abs(Math.cos(p)) * 2;
    offsets[`rl${i}Y`] = Math.abs(Math.cos(p + Math.PI / 2)) * 2;
  }
  return offsets;
}

export function getFrogOffsets(phase) {
  const t = (phase % (Math.PI * 2)) / (Math.PI * 2);
  const jumpHeight = t < 0.3 ? 0 : t < 0.6 ? Math.sin((t - 0.3) / 0.3 * Math.PI) * 18 : 0;
  const crouch = t < 0.3 ? Math.sin(t / 0.3 * Math.PI) * 4 : 0;
  const hindSpread = t < 0.3 ? 6 : t < 0.6 ? -4 : 0;
  return { jumpY: jumpHeight, crouch, hindSpread, phase: t };
}

export function getSerpentOffsets(phase) {
  return {
    seg2X: Math.sin(phase) * 3,
    seg2Y: Math.sin(phase * 0.5) * 2,
    seg3X: Math.sin(phase + 1) * 4,
    seg3Y: Math.sin(phase * 0.5 + 1) * 2,
    tailX: Math.sin(phase + 2) * 5,
    tailY: Math.sin(phase * 0.5 + 2) * 2,
    finPhase: phase,
  };
}

// ─── NEW BODY TYPES ───

export function getLizardOffsets(phase) {
  const s = Math.sin(phase), c = Math.cos(phase);
  // Low-slung reptile gait with body sway and tail wave
  return {
    flX: s * 4, frX: -s * 4, blX: -s * 4, brX: s * 4,
    flY: Math.abs(c) * 2, frY: Math.abs(s) * 2,
    blY: Math.abs(s) * 2, brY: Math.abs(c) * 2,
    bodySway: Math.sin(phase * 0.8) * 3, // side-to-side body sway
    tailX: Math.sin(phase + 1.5) * 6,
    tailY: Math.sin(phase * 0.6) * 2,
    jawOpen: Math.max(0, Math.sin(phase * 0.3)) * 2,
  };
}

export function getCrabOffsets(phase) {
  const s = Math.sin(phase);
  // Sideways scuttle with pincer snapping
  return {
    l1X: s * 3, l2X: -s * 2.5, l3X: s * 2,
    r1X: -s * 3, r2X: s * 2.5, r3X: -s * 2,
    l1Y: Math.abs(Math.cos(phase)) * 2,
    r1Y: Math.abs(Math.cos(phase + Math.PI / 3)) * 2,
    pincerOpen: Math.abs(Math.sin(phase * 0.4)) * 5,
    bodyBob: Math.abs(Math.sin(phase * 1.2)) * 2,
  };
}

export function getBirdOffsets(phase) {
  // Wing flapping with claw tuck
  const wingPhase = Math.sin(phase * 1.5);
  return {
    wingY: wingPhase * 10, // up-down wing beat
    wingSpread: 8 + Math.abs(wingPhase) * 4, // wing extension
    clawTuck: Math.max(0, -wingPhase) * 3, // claws tuck on upstroke
    tailSway: Math.sin(phase * 0.8) * 3,
    bobY: Math.sin(phase * 2) * 2, // body bob from flapping
  };
}

export function getTentacleOffsets(phase) {
  // Independent tentacle wave with pulsing body
  const offsets = { pulse: Math.sin(phase * 0.6) * 3 };
  for (let i = 1; i <= 6; i++) {
    const p = phase + i * Math.PI / 3;
    offsets[`t${i}X`] = Math.sin(p) * (3 + i * 0.5);
    offsets[`t${i}Y`] = Math.cos(p * 0.7) * 2;
  }
  return offsets;
}

export function getPrimateOffsets(phase) {
  const s = Math.sin(phase);
  // Knuckle-walking with long arm swing
  return {
    lArmX: -s * 8, rArmX: s * 8, // long arm swing
    lArmY: Math.abs(Math.cos(phase)) * 3,
    rArmY: Math.abs(Math.sin(phase)) * 3,
    lLegX: s * 4, rLegX: -s * 4,
    tailSway: Math.sin(phase * 1.3) * 5,
    bodyLean: Math.sin(phase * 0.5) * 2,
  };
}

export function getFishOffsets(phase) {
  // Sinusoidal swimming motion
  return {
    tailX: Math.sin(phase * 1.5) * 5,
    tailY: Math.sin(phase * 0.8) * 2,
    bodyWave: Math.sin(phase) * 2,
    lFinY: Math.sin(phase * 1.2) * 3,
    rFinY: -Math.sin(phase * 1.2) * 3,
    dorsalPhase: phase,
  };
}

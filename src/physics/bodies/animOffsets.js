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

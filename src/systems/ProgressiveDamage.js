// ProgressiveDamage — visual damage stages for obstacles
// Obstacles show increasing damage: cracks, darkening, material leaking

export const DAMAGE_STAGES = [
  { threshold: 0.0, name: "critical" },
  { threshold: 0.15, name: "broken" },
  { threshold: 0.4, name: "cracked" },
  { threshold: 0.7, name: "scratched" },
  { threshold: 0.9, name: "pristine" },
];

// Crack patterns per material (CSS-like descriptors)
const CRACK_PATTERNS = {
  wood: "splinter",
  stone: "fracture",
  ice: "shatter",
  crystal: "shatter",
  organic: "wilt",
  metal: "dent",
  sand: "crumble",
};

// Leak particle configs per material
const LEAK_CONFIGS = {
  wood:    { type: "smoke",   color: 0x888888 },
  stone:   { type: "crumble", color: 0x8a8a8a },
  ice:     { type: "drip",    color: 0x80d0ff },
  crystal: { type: "sparkle", color: 0xc080ff },
  organic: { type: "spore",   color: 0x50a030 },
  metal:   { type: "spark",   color: 0xffe060 },
  sand:    { type: "dust",    color: 0xc4a860 },
};

export function getDamageStage(hpRatio) {
  const clamped = Math.max(0, Math.min(1, hpRatio));
  // Walk stages from highest threshold down
  for (let i = DAMAGE_STAGES.length - 1; i >= 0; i--) {
    if (clamped >= DAMAGE_STAGES[i].threshold) {
      return DAMAGE_STAGES[i];
    }
  }
  return DAMAGE_STAGES[0]; // critical
}

export function getDamageVisuals(hpRatio, material) {
  const clamped = Math.max(0, Math.min(1, hpRatio));
  const damagePct = 1 - clamped; // 0 = pristine, 1 = destroyed

  return {
    crackOpacity: damagePct > 0.1 ? Math.min(1, (damagePct - 0.1) * 1.2) : 0,
    darkenAmount: damagePct > 0.1 ? Math.min(1, damagePct * 0.6) : 0,
    shakeIntensity: damagePct > 0.5 ? (damagePct - 0.5) * 4 : 0,
    crackPattern: CRACK_PATTERNS[material] || "fracture",
  };
}

export function getLeakParticles(hpRatio, material) {
  // Only leak when below 25% HP
  if (hpRatio > 0.25) return null;

  const config = LEAK_CONFIGS[material] || LEAK_CONFIGS.wood;
  const intensity = 1 - (hpRatio / 0.25); // 0 at 25%, 1 at 0%
  const rate = 0.02 + intensity * 0.08;   // particles per frame chance

  return {
    type: config.type,
    color: config.color,
    rate,
  };
}

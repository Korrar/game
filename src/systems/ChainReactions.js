// ChainReactions — elemental chain reactions between obstacles
// Fire spreads to wood, lightning chains to metal, etc.

export const CHAIN_RULES = {
  fire: {
    spreadTo: ["wood", "organic"],
    radius: 15,       // % of game width
    damageMult: 0.5,  // 50% of original damage
    delay: 400,       // ms before chain triggers
  },
  lightning: {
    spreadTo: ["metal", "crystal"],
    radius: 20,
    damageMult: 0.6,
    delay: 100,       // lightning is fast
  },
  ice: {
    spreadTo: ["organic", "sand"],
    radius: 12,
    damageMult: 0.3,
    delay: 300,
  },
  explosion: {
    spreadTo: ["wood", "stone", "ice", "crystal", "organic", "metal", "sand"],
    radius: 18,
    damageMult: 0.4,
    delay: 50,
  },
  poison: {
    spreadTo: ["organic"],
    radius: 10,
    damageMult: 0.3,
    delay: 500,
  },
};

export function findChainTargets(element, sourceX, sourceY, obstacles, sourceId) {
  const rule = CHAIN_RULES[element];
  if (!rule) return [];

  const targets = [];
  for (const obs of obstacles) {
    if (obs.id === sourceId) continue;
    if (!obs.destructible || obs.destroying || obs.hp <= 0) continue;
    if (!rule.spreadTo.includes(obs.material)) continue;

    // Distance check (percentage-based coords)
    const dx = obs.x - sourceX;
    const dy = obs.y - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= rule.radius) {
      targets.push(obs);
    }
  }

  return targets;
}

export function getChainDamage(element, baseDamage) {
  const rule = CHAIN_RULES[element];
  if (!rule) return 0;
  return Math.round(baseDamage * rule.damageMult);
}

export function getChainDelay(element) {
  const rule = CHAIN_RULES[element];
  if (!rule) return 0;
  return rule.delay;
}

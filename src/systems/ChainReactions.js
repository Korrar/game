// ChainReactions — elemental chain reactions between obstacles
// Fire spreads to wood, lightning chains to metal, etc.
// Advanced: multi-element cascade combos, recursive chains, element synergies

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

// ─── MULTI-ELEMENT CASCADE SYSTEM ───
// When two elements meet in a chain, they produce a synergy effect
export const ELEMENT_SYNERGIES = {
  "fire+ice":       { result: "steam_blast",   damageMult: 1.4, radius: 22, desc: "Parowy wybuch" },
  "fire+poison":    { result: "toxic_inferno",  damageMult: 1.6, radius: 18, desc: "Toksyczne piekło" },
  "fire+organic":   { result: "wildfire",       damageMult: 1.2, radius: 25, desc: "Pożar" },
  "lightning+ice":  { result: "shatter_storm",  damageMult: 1.5, radius: 20, desc: "Lodowa burza" },
  "lightning+metal":{ result: "arc_chain",      damageMult: 1.3, radius: 28, desc: "Łańcuch błyskawic" },
  "poison+ice":     { result: "cryo_toxin",     damageMult: 1.3, radius: 16, desc: "Kriotoksyna" },
  "shadow+fire":    { result: "hellfire",       damageMult: 1.7, radius: 15, desc: "Piekielny ogień" },
  "shadow+poison":  { result: "plague_cloud",   damageMult: 1.4, radius: 24, desc: "Chmura zarazy" },
};

// Get synergy key from two elements (order-independent)
function _synergyKey(el1, el2) {
  const pair = [el1, el2].sort();
  return `${pair[0]}+${pair[1]}`;
}

// Check if two elements create a synergy
export function getElementSynergy(element1, element2) {
  const key = _synergyKey(element1, element2);
  return ELEMENT_SYNERGIES[key] || null;
}

// ─── CHAIN DEPTH TRACKING ───
// Recursive chains lose power but gain spectacle

export const CHAIN_DEPTH_CONFIG = {
  maxDepth: 5,                // max recursive chain depth
  depthDamageFalloff: 0.75,   // each depth level multiplies damage by this
  depthRadiusGrowth: 1.1,     // each depth level grows chain radius slightly
  synergyBonusPerDepth: 0.05, // synergy chance increases with depth
};

export function findChainTargets(element, sourceX, sourceY, obstacles, sourceId, depth = 0) {
  const rule = CHAIN_RULES[element];
  if (!rule) return [];
  if (depth >= CHAIN_DEPTH_CONFIG.maxDepth) return [];

  const radiusMult = Math.pow(CHAIN_DEPTH_CONFIG.depthRadiusGrowth, depth);
  const effectiveRadius = rule.radius * radiusMult;
  const targets = [];

  for (const obs of obstacles) {
    if (obs.id === sourceId) continue;
    if (!obs.destructible || obs.destroying || obs.hp <= 0) continue;
    if (!rule.spreadTo.includes(obs.material)) continue;

    // Distance check (percentage-based coords)
    const dx = obs.x - sourceX;
    const dy = obs.y - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= effectiveRadius) {
      targets.push({
        ...obs,
        chainDepth: depth + 1,
        chainDistance: dist,
      });
    }
  }

  // Sort by distance (closest first for cascading effect)
  targets.sort((a, b) => a.chainDistance - b.chainDistance);

  return targets;
}

export function getChainDamage(element, baseDamage, depth = 0) {
  const rule = CHAIN_RULES[element];
  if (!rule) return 0;
  const depthMult = Math.pow(CHAIN_DEPTH_CONFIG.depthDamageFalloff, depth);
  return Math.round(baseDamage * rule.damageMult * depthMult);
}

export function getChainDelay(element, depth = 0) {
  const rule = CHAIN_RULES[element];
  if (!rule) return 0;
  // Each depth level adds a bit more delay for cascading feel
  return rule.delay + depth * 150;
}

// ─── CHAIN EVENT BUILDER ───
// Build a complete chain reaction sequence from a source destruction

export function buildChainSequence(sourceElement, sourceX, sourceY, baseDamage, obstacles, sourceId, activeElements = []) {
  const sequence = [];
  const processed = new Set([sourceId]);

  function _recurse(element, x, y, dmg, depth, prevElements) {
    const targets = findChainTargets(element, x, y, obstacles, sourceId, depth);

    for (const target of targets) {
      if (processed.has(target.id)) continue;
      processed.add(target.id);

      const chainDmg = getChainDamage(element, dmg, depth);
      const chainDelay = getChainDelay(element, depth);

      // Check for element synergy
      let synergy = null;
      for (const prevEl of prevElements) {
        synergy = getElementSynergy(prevEl, element);
        if (synergy) break;
      }

      const event = {
        targetId: target.id,
        targetX: target.x,
        targetY: target.y,
        damage: chainDmg,
        element,
        delay: chainDelay,
        depth,
        synergy,
        synergyDamage: synergy ? Math.round(chainDmg * synergy.damageMult) : 0,
        synergyRadius: synergy ? synergy.radius : 0,
      };
      sequence.push(event);

      // If target is explosive, it will chain further
      if (target.explosive) {
        const newElements = [...prevElements, element];
        _recurse(
          target.element || element,
          target.x, target.y,
          target.explosionDmg || dmg,
          depth + 1,
          newElements
        );
      }
    }
  }

  _recurse(sourceElement, sourceX, sourceY, baseDamage, 0, activeElements);
  return sequence;
}

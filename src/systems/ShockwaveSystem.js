// ShockwaveSystem — expanding shockwave rings from explosions
// Pushes NPCs, scatters debris, and creates visual ripple effects
// Integrates with PixiJS for rendering and Rapier2D for force application

export const SHOCKWAVE_CONFIG = {
  maxShockwaves: 8,
  expansionSpeed: 4.5,     // pixels per frame
  maxRadius: 120,           // max radius in pixels
  pushForce: 6.0,           // base knockback force
  damageFalloff: 0.7,       // damage multiplier at edge vs center
  ringWidth: 3,             // visual ring thickness
  fadeSpeed: 0.025,         // alpha decay per frame
  debrisPushMult: 1.4,      // extra push for lightweight debris
  npcStaggerDuration: 600,  // ms NPCs are staggered after shockwave hit
};

// Element-specific shockwave visuals
const SHOCKWAVE_STYLES = {
  fire:      { color: 0xff6020, innerColor: 0xffcc40, distortion: 1.2 },
  ice:       { color: 0x4488ff, innerColor: 0xaaddff, distortion: 0.8 },
  lightning: { color: 0xffee00, innerColor: 0xffffff, distortion: 1.5 },
  poison:    { color: 0x44ff44, innerColor: 0x88ff88, distortion: 0.6 },
  shadow:    { color: 0x8844cc, innerColor: 0xbb88ee, distortion: 1.0 },
  holy:      { color: 0xffd700, innerColor: 0xfffff0, distortion: 0.9 },
  explosion: { color: 0xff4400, innerColor: 0xffaa00, distortion: 1.4 },
};

const DEFAULT_STYLE = { color: 0xff6020, innerColor: 0xffaa00, distortion: 1.0 };

export function getShockwaveStyle(element) {
  return SHOCKWAVE_STYLES[element] || DEFAULT_STYLE;
}

export function createShockwave(x, y, element, intensity = 1.0, sourceRadius = 0) {
  const style = getShockwaveStyle(element);
  const maxR = SHOCKWAVE_CONFIG.maxRadius * intensity;

  return {
    x,
    y,
    radius: sourceRadius || 8,    // start from source size
    maxRadius: maxR,
    alpha: 0.8 * intensity,
    element,
    style,
    intensity,
    speed: SHOCKWAVE_CONFIG.expansionSpeed * style.distortion,
    hitNpcs: new Set(),           // track which NPCs were already pushed
    hitDebris: new Set(),         // track pushed debris indices
    active: true,
    age: 0,
  };
}

// Update all active shockwaves, return push events for NPCs/debris
export function updateShockwaves(shockwaves) {
  const pushEvents = [];
  const toRemove = [];

  for (let i = 0; i < shockwaves.length; i++) {
    const sw = shockwaves[i];
    if (!sw.active) {
      toRemove.push(i);
      continue;
    }

    const prevRadius = sw.radius;
    sw.radius += sw.speed;
    sw.alpha -= SHOCKWAVE_CONFIG.fadeSpeed;
    sw.age++;

    if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
      sw.active = false;
      toRemove.push(i);
      continue;
    }

    // Emit push event for the expanding ring zone
    pushEvents.push({
      shockwaveIndex: i,
      x: sw.x,
      y: sw.y,
      innerRadius: prevRadius,
      outerRadius: sw.radius,
      force: SHOCKWAVE_CONFIG.pushForce * sw.intensity * (1 - sw.radius / sw.maxRadius),
      element: sw.element,
      hitNpcs: sw.hitNpcs,
      hitDebris: sw.hitDebris,
      staggerMs: SHOCKWAVE_CONFIG.npcStaggerDuration,
    });
  }

  // Remove dead shockwaves (reverse order)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    shockwaves.splice(toRemove[i], 1);
  }

  return pushEvents;
}

// Apply shockwave push to an NPC position, returns push vector or null
export function calcShockwavePush(pushEvent, targetX, targetY, targetId) {
  if (pushEvent.hitNpcs.has(targetId)) return null;

  const dx = targetX - pushEvent.x;
  const dy = targetY - pushEvent.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Check if target is in the ring zone
  if (dist < pushEvent.innerRadius || dist > pushEvent.outerRadius) return null;

  // Direction from shockwave center
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : -1;

  // Force decreases with distance
  const falloff = 1 - (dist / pushEvent.outerRadius) * SHOCKWAVE_CONFIG.damageFalloff;
  const force = pushEvent.force * Math.max(0.2, falloff);

  pushEvent.hitNpcs.add(targetId);

  return {
    vx: nx * force,
    vy: ny * force,
    staggerMs: pushEvent.staggerMs,
    element: pushEvent.element,
  };
}

// Apply shockwave push to debris, returns velocity adjustment
export function calcDebrisPush(pushEvent, debrisX, debrisY, debrisIndex) {
  if (pushEvent.hitDebris.has(debrisIndex)) return null;

  const dx = debrisX - pushEvent.x;
  const dy = debrisY - pushEvent.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < pushEvent.innerRadius || dist > pushEvent.outerRadius) return null;

  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : -1;
  const force = pushEvent.force * SHOCKWAVE_CONFIG.debrisPushMult;

  pushEvent.hitDebris.add(debrisIndex);

  return {
    vx: nx * force * (0.5 + Math.random() * 0.5),
    vy: ny * force * (0.5 + Math.random() * 0.5) - 2, // upward bias
  };
}

// Draw shockwave ring (called from PixiJS render loop)
export function drawShockwave(graphics, sw, cameraX = 0, cameraY = 0) {
  if (!sw.active || sw.alpha <= 0) return;

  const x = sw.x - cameraX;
  const y = sw.y - cameraY;

  // Outer ring
  graphics.circle(x, y, sw.radius);
  graphics.stroke({
    color: sw.style.color,
    alpha: sw.alpha * 0.6,
    width: SHOCKWAVE_CONFIG.ringWidth,
  });

  // Inner glow ring (slightly smaller)
  const innerR = sw.radius * 0.85;
  graphics.circle(x, y, innerR);
  graphics.stroke({
    color: sw.style.innerColor,
    alpha: sw.alpha * 0.3,
    width: SHOCKWAVE_CONFIG.ringWidth * 2,
  });

  // Distortion hint: faint filled circle at edge
  if (sw.age < 10) {
    graphics.circle(x, y, sw.radius * 0.5);
    graphics.fill({ color: sw.style.innerColor, alpha: sw.alpha * 0.08 });
  }
}

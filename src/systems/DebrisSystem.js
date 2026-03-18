// DebrisSystem — persistent debris fragments after obstacle destruction
// Debris scatters with physics, settles on ground, and fades over time

export const DEBRIS_CONFIG = {
  maxDebris: 60,
  debrisPerDestruction: 8,
  fadeDuration: 120,  // frames of fade at end of life
  gravity: 0.18,
  friction: 0.85,
};

// Material → debris fragment definitions
const DEBRIS_DEFS = {
  wood: [
    { color: 0x8a6030, shape: "rect", sizeMin: 3, sizeMax: 8 },
    { color: 0xa07840, shape: "rect", sizeMin: 2, sizeMax: 5 },
    { color: 0x6a4820, shape: "rect", sizeMin: 4, sizeMax: 10 },
  ],
  stone: [
    { color: 0x6a6a6a, shape: "rect", sizeMin: 4, sizeMax: 10 },
    { color: 0x8a8a8a, shape: "circle", sizeMin: 2, sizeMax: 6 },
    { color: 0x555555, shape: "rect", sizeMin: 3, sizeMax: 7 },
  ],
  ice: [
    { color: 0x80d0ff, shape: "diamond", sizeMin: 3, sizeMax: 8 },
    { color: 0xa0e0ff, shape: "diamond", sizeMin: 2, sizeMax: 5 },
    { color: 0xc0f0ff, shape: "circle", sizeMin: 2, sizeMax: 4 },
  ],
  crystal: [
    { color: 0xc080ff, shape: "diamond", sizeMin: 3, sizeMax: 9 },
    { color: 0xe0a0ff, shape: "diamond", sizeMin: 2, sizeMax: 5 },
    { color: 0xa060d0, shape: "rect", sizeMin: 3, sizeMax: 6 },
  ],
  organic: [
    { color: 0x50a030, shape: "circle", sizeMin: 2, sizeMax: 6 },
    { color: 0x408020, shape: "rect", sizeMin: 3, sizeMax: 7 },
    { color: 0x68b848, shape: "circle", sizeMin: 2, sizeMax: 4 },
  ],
  metal: [
    { color: 0xb0b0b0, shape: "rect", sizeMin: 3, sizeMax: 8 },
    { color: 0xd0d0d0, shape: "rect", sizeMin: 2, sizeMax: 5 },
    { color: 0x808080, shape: "circle", sizeMin: 2, sizeMax: 4 },
  ],
  sand: [
    { color: 0xc4a860, shape: "circle", sizeMin: 2, sizeMax: 5 },
    { color: 0xb09848, shape: "circle", sizeMin: 1, sizeMax: 3 },
    { color: 0xd0b870, shape: "circle", sizeMin: 2, sizeMax: 4 },
  ],
};

export function getDebrisForMaterial(material) {
  return DEBRIS_DEFS[material] || DEBRIS_DEFS.wood;
}

export function createDebris(material, x, y) {
  const defs = getDebrisForMaterial(material);
  const pieces = [];
  const { debrisPerDestruction } = DEBRIS_CONFIG;

  for (let i = 0; i < debrisPerDestruction; i++) {
    const def = defs[i % defs.length];
    const size = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;

    pieces.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: -Math.abs(Math.sin(angle) * speed) - 1, // upward bias
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      size,
      color: def.color,
      shape: def.shape,
      life: 300 + Math.floor(Math.random() * 200),
      maxLife: 500,
      grounded: false,
    });
  }

  return pieces;
}

export function updateDebris(debris, groundY) {
  const dead = [];

  for (let i = 0; i < debris.length; i++) {
    const d = debris[i];
    d.life--;

    if (d.life <= 0) {
      dead.push(i);
      continue;
    }

    if (!d.grounded) {
      // Physics: gravity + velocity
      d.vy += DEBRIS_CONFIG.gravity;
      d.x += d.vx;
      d.y += d.vy;
      d.rotation += d.rotSpeed;

      // Ground collision
      if (d.y >= groundY) {
        d.y = groundY;
        d.vy = 0;
        d.vx = 0;
        d.grounded = true;
      }
    }
    // Grounded debris doesn't move or rotate
  }

  return dead;
}

export function clearDebris() {
  return [];
}

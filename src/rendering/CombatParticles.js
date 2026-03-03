// CombatParticles — PixiJS-based particle system for combat effects
// Replaces Canvas2D CombatEffects with better blending and glow

import { Graphics } from "pixi.js";

const _isMobile = ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900;
const MAX_PARTICLES = _isMobile ? 100 : 250;

export class CombatParticles {
  constructor(layer) {
    this.layer = layer;
    this.particles = [];
    this.gfx = new Graphics();
    this.layer.addChild(this.gfx);
    this.mobile = _isMobile;
  }

  // Scale particle counts for mobile
  _c(count) {
    return this.mobile ? Math.ceil(count * 0.5) : count;
  }

  _emit(count, x, y, config) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      this.particles.push({
        x, y,
        vx: config.vx ? config.vx() : 0,
        vy: config.vy ? config.vy() : 0,
        life: config.life || 30,
        maxLife: config.life || 30,
        size: config.size || 3,
        color: config.color || 0xff0000,
        gravity: config.gravity || 0,
        shrink: config.shrink !== false,
        type: config.type || "circle",
      });
    }
  }

  spawnBlood(x, y, dirX, intensity = 1) {
    const count = this._c(Math.round(16 * intensity));
    this._emit(count, x, y, {
      vx: () => dirX * (Math.random() * 4 + 2) + (Math.random() - 0.5) * 3,
      vy: () => -(Math.random() * 5 + 1),
      life: 25 + Math.random() * 15,
      size: 2 + Math.random() * 2,
      color: 0xcc2020,
      gravity: 0.25,
    });
  }

  spawnFire(x, y) {
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 4 + 2),
      life: 20 + Math.random() * 10,
      size: 3 + Math.random() * 2,
      color: 0xff8c28,
      gravity: -0.08,
    });
    // Inner white-hot
    this._emit(this._c(3), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => -(Math.random() * 3 + 1),
      life: 12,
      size: 2,
      color: 0xffe0a0,
      gravity: -0.05,
    });
  }

  spawnIceShards(x, y, dirX) {
    this._emit(this._c(8), x, y, {
      vx: () => dirX * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 2,
      vy: () => -(Math.random() * 3 + 1),
      life: 22 + Math.random() * 10,
      size: 2 + Math.random() * 2,
      color: 0x80d0ff,
      gravity: 0.12,
      type: "diamond",
    });
  }

  spawnShadowMist(x, y) {
    this._emit(this._c(16), x, y, {
      vx: () => (Math.random() - 0.5) * 3,
      vy: () => -(Math.random() * 2),
      life: 30 + Math.random() * 15,
      size: 4 + Math.random() * 3,
      color: 0x6428b4,
      gravity: -0.03,
    });
  }

  spawnHolyLight(x, y) {
    this._emit(this._c(14), x, y, {
      vx: () => (Math.random() - 0.5) * 5,
      vy: () => (Math.random() - 0.5) * 5,
      life: 18 + Math.random() * 8,
      size: 2 + Math.random() * 2,
      color: 0xffe080,
      gravity: -0.06,
    });
    // Central flash
    this._emit(this._c(4), x, y, {
      vx: () => 0,
      vy: () => 0,
      life: 8,
      size: 8,
      color: 0xffffff,
    });
  }

  spawnMeleeSparks(x, y, dirX) {
    this._emit(this._c(6), x, y, {
      vx: () => dirX * (Math.random() * 5 + 2) + (Math.random() - 0.5) * 2,
      vy: () => -(Math.random() * 4 + 1),
      life: 12 + Math.random() * 8,
      size: 1.5 + Math.random(),
      color: 0xe0c060,
      gravity: 0.2,
    });
  }

  spawnFireBreath(x, y, dirX) {
    this._emit(this._c(20), x, y, {
      vx: () => dirX * (Math.random() * 6 + 3),
      vy: () => (Math.random() - 0.5) * 3,
      life: 18 + Math.random() * 8,
      size: 3 + Math.random() * 3,
      color: 0xff6428,
      gravity: -0.05,
    });
  }

  spawnPoisonCloud(x, y) {
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => -(Math.random() * 1.5),
      life: 35 + Math.random() * 15,
      size: 4 + Math.random() * 3,
      color: 0x40b430,
      gravity: -0.02,
    });
  }

  spawnGoldCoins(x, y, intensity = 1) {
    // Big bright gold coins - fountain upward
    const count = this._c(Math.round(24 * intensity));
    this._emit(count, x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 8 + 4),
      life: 50 + Math.random() * 20,
      size: 5 + Math.random() * 3,
      color: 0xffd700,
      gravity: 0.14,
    });
    // Bright white-gold sparkles
    this._emit(this._c(Math.round(14 * intensity)), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 7 + 3),
      life: 35 + Math.random() * 15,
      size: 3 + Math.random() * 2,
      color: 0xfff8c0,
      gravity: 0.10,
    });
    // Copper-colored coins
    this._emit(this._c(Math.round(10 * intensity)), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 6 + 3),
      life: 45 + Math.random() * 15,
      size: 4 + Math.random() * 2,
      color: 0xd4a030,
      gravity: 0.16,
    });
    // Tiny glitter dust
    this._emit(this._c(Math.round(8 * intensity)), x, y, {
      vx: () => (Math.random() - 0.5) * 6,
      vy: () => -(Math.random() * 3 + 1),
      life: 25 + Math.random() * 10,
      size: 1.5 + Math.random(),
      color: 0xffffff,
      gravity: 0.05,
    });
  }

  // Blood slash — saber cut blood spray
  spawnSlashBlood(x, y, dirX, intensity = 1) {
    // Dark blood droplets spraying to the side
    const count = this._c(Math.round(20 * intensity));
    this._emit(count, x, y, {
      vx: () => dirX * (Math.random() * 6 + 3) + (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 6 + 2),
      life: 30 + Math.random() * 20,
      size: 2.5 + Math.random() * 2.5,
      color: 0xaa1818,
      gravity: 0.28,
    });
    // Bright red mist
    this._emit(this._c(Math.round(8 * intensity)), x, y, {
      vx: () => dirX * (Math.random() * 3) + (Math.random() - 0.5) * 5,
      vy: () => -(Math.random() * 3 + 1),
      life: 18 + Math.random() * 10,
      size: 4 + Math.random() * 3,
      color: 0xff3030,
      gravity: -0.02,
    });
  }

  // Critical saber hit — massive slash spray in two halves
  spawnCritSlash(x, y, dirX) {
    // Upward half
    this._emit(this._c(18), x, y, {
      vx: () => dirX * (Math.random() * 5 + 1) + (Math.random() - 0.5) * 6,
      vy: () => -(Math.random() * 9 + 4),
      life: 35 + Math.random() * 20,
      size: 3 + Math.random() * 3,
      color: 0xcc1010,
      gravity: 0.22,
    });
    // Downward half
    this._emit(this._c(14), x, y, {
      vx: () => dirX * (Math.random() * 4 + 1) + (Math.random() - 0.5) * 5,
      vy: () => (Math.random() * 5 + 2),
      life: 30 + Math.random() * 15,
      size: 2.5 + Math.random() * 2.5,
      color: 0x881010,
      gravity: 0.18,
    });
    // White flash at impact
    this._emit(this._c(5), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => (Math.random() - 0.5) * 2,
      life: 6,
      size: 8,
      color: 0xffffff,
    });
  }

  // Gore explosion — spectacular body parts + blood for explosive kills
  spawnGoreExplosion(x, y) {
    // Massive blood fountain
    this._emit(this._c(35), x, y, {
      vx: () => (Math.random() - 0.5) * 14,
      vy: () => -(Math.random() * 12 + 4),
      life: 45 + Math.random() * 25,
      size: 3 + Math.random() * 3,
      color: 0xcc1818,
      gravity: 0.20,
    });
    // Bone/body chunks (light beige diamonds)
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 10 + 5),
      life: 50 + Math.random() * 25,
      size: 3 + Math.random() * 3,
      color: 0xd0b088,
      gravity: 0.22,
      type: "diamond",
    });
    // Dark gore chunks
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 8 + 3),
      life: 40 + Math.random() * 20,
      size: 4 + Math.random() * 4,
      color: 0x661010,
      gravity: 0.25,
    });
    // Hot fire flash (from explosion)
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 6 + 2),
      life: 14 + Math.random() * 8,
      size: 5 + Math.random() * 4,
      color: 0xff8020,
      gravity: -0.06,
    });
    // Smoke
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 3 + 1),
      life: 35 + Math.random() * 20,
      size: 6 + Math.random() * 4,
      color: 0x444444,
      gravity: -0.04,
    });
  }

  // Subtle shot blood — small impact for bullet kills
  spawnShotBlood(x, y, dirX) {
    this._emit(this._c(8), x, y, {
      vx: () => dirX * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 2,
      vy: () => -(Math.random() * 3 + 1),
      life: 18 + Math.random() * 10,
      size: 1.5 + Math.random() * 1.5,
      color: 0xaa2020,
      gravity: 0.20,
    });
    // Small mist puff
    this._emit(this._c(3), x, y, {
      vx: () => dirX * (Math.random() * 1.5),
      vy: () => -(Math.random() * 2),
      life: 12 + Math.random() * 6,
      size: 3 + Math.random() * 2,
      color: 0x882020,
      gravity: -0.01,
    });
  }

  spawnChainLightning(x1, y1, x2, y2) {
    // Sparks along the bolt path between source and chain target
    const segments = this.mobile ? 4 : 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 12;
      const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 12;
      this._emit(1, px, py, {
        vx: () => (Math.random() - 0.5) * 3,
        vy: () => (Math.random() - 0.5) * 3,
        life: 10 + Math.random() * 6,
        size: 2 + Math.random() * 2,
        color: 0xffee00,
      });
    }
    // Flash at target
    this._emit(this._c(6), x2, y2, {
      vx: () => (Math.random() - 0.5) * 6,
      vy: () => (Math.random() - 0.5) * 6,
      life: 12 + Math.random() * 6,
      size: 2.5 + Math.random() * 1.5,
      color: 0xffff80,
    });
  }

  // ─── OBSTACLE DESTRUCTION PARTICLES ───

  // Wood splinters — brown/tan chunks flying outward with gravity
  spawnWoodSplinters(x, y) {
    // Large splinters
    this._emit(this._c(16), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 8 + 3),
      life: 40 + Math.random() * 20,
      size: 3 + Math.random() * 2,
      color: 0x8a6030,
      gravity: 0.22,
      type: "diamond",
    });
    // Small wood dust
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 5 + 2),
      life: 25 + Math.random() * 15,
      size: 2 + Math.random() * 1.5,
      color: 0xb08850,
      gravity: 0.15,
    });
    // Sawdust cloud
    this._emit(this._c(6), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 2 + 1),
      life: 30 + Math.random() * 15,
      size: 5 + Math.random() * 3,
      color: 0xc0a870,
      gravity: -0.02,
    });
  }

  // Stone rubble — grey chunks with heavy gravity
  spawnStoneRubble(x, y) {
    // Heavy chunks
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 7 + 4),
      life: 45 + Math.random() * 20,
      size: 3 + Math.random() * 3,
      color: 0x6a6a6a,
      gravity: 0.28,
      type: "diamond",
    });
    // Smaller pebbles
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 6 + 2),
      life: 35 + Math.random() * 15,
      size: 2 + Math.random() * 1.5,
      color: 0x8a8a8a,
      gravity: 0.25,
    });
    // Dust cloud
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 5,
      vy: () => -(Math.random() * 2 + 0.5),
      life: 35 + Math.random() * 20,
      size: 6 + Math.random() * 4,
      color: 0x9a9080,
      gravity: -0.02,
    });
  }

  // Ice shard explosion — bright blue diamonds scattering
  spawnIceShatter(x, y) {
    // Bright shards
    this._emit(this._c(14), x, y, {
      vx: () => (Math.random() - 0.5) * 14,
      vy: () => -(Math.random() * 9 + 3),
      life: 35 + Math.random() * 15,
      size: 2.5 + Math.random() * 2.5,
      color: 0x80d0ff,
      gravity: 0.18,
      type: "diamond",
    });
    // White core flash
    this._emit(this._c(4), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => (Math.random() - 0.5) * 2,
      life: 8,
      size: 10,
      color: 0xe0f0ff,
    });
    // Frost mist
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 6,
      vy: () => -(Math.random() * 2),
      life: 25 + Math.random() * 15,
      size: 4 + Math.random() * 3,
      color: 0xa0d8f0,
      gravity: -0.03,
    });
  }

  // Crystal shatter — purple/pink glowing shards
  spawnCrystalShatter(x, y) {
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 8 + 4),
      life: 40 + Math.random() * 20,
      size: 3 + Math.random() * 2,
      color: 0xc080ff,
      gravity: 0.16,
      type: "diamond",
    });
    // Sparkle dust
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 5 + 2),
      life: 30 + Math.random() * 15,
      size: 2 + Math.random(),
      color: 0xffa0ff,
      gravity: 0.10,
    });
    // Glow flash
    this._emit(this._c(3), x, y, {
      vx: () => 0,
      vy: () => 0,
      life: 10,
      size: 12,
      color: 0xe0c0ff,
    });
  }

  // Leaf burst — green particles drifting
  spawnLeafBurst(x, y) {
    this._emit(this._c(14), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 6 + 2),
      life: 40 + Math.random() * 25,
      size: 3 + Math.random() * 2,
      color: 0x50a030,
      gravity: 0.08,
      type: "diamond",
    });
    // Small green mist
    this._emit(this._c(6), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 2 + 0.5),
      life: 35 + Math.random() * 15,
      size: 5 + Math.random() * 3,
      color: 0x80c060,
      gravity: -0.02,
    });
  }

  // Metal sparks — bright yellow/white with fast scatter
  spawnMetalSparks(x, y) {
    this._emit(this._c(18), x, y, {
      vx: () => (Math.random() - 0.5) * 16,
      vy: () => -(Math.random() * 10 + 4),
      life: 20 + Math.random() * 15,
      size: 1.5 + Math.random() * 1.5,
      color: 0xffe060,
      gravity: 0.30,
    });
    // Hot white sparks
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 8 + 3),
      life: 12 + Math.random() * 8,
      size: 1 + Math.random(),
      color: 0xffffff,
      gravity: 0.25,
    });
  }

  // Sand/dust burst — light particles rising
  spawnDustBurst(x, y) {
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 4 + 2),
      life: 35 + Math.random() * 20,
      size: 4 + Math.random() * 3,
      color: 0xc4a860,
      gravity: 0.06,
    });
    // Fine dust
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 5,
      vy: () => -(Math.random() * 2 + 0.5),
      life: 30 + Math.random() * 20,
      size: 6 + Math.random() * 4,
      color: 0xd8c090,
      gravity: -0.01,
    });
  }

  // Small hit spark on non-destruction damage to obstacle
  spawnObstacleHitSpark(x, y, materialColor) {
    this._emit(this._c(5), x, y, {
      vx: () => (Math.random() - 0.5) * 6,
      vy: () => -(Math.random() * 4 + 1),
      life: 10 + Math.random() * 6,
      size: 2 + Math.random(),
      color: materialColor || 0xc0a060,
      gravity: 0.15,
    });
  }

  spawnArrowTrail(x, y, vx, vy) {
    this._emit(this.mobile ? 1 : 3, x, y, {
      vx: () => (Math.random() - 0.5) * 0.5,
      vy: () => (Math.random() - 0.5) * 0.5,
      life: 8,
      size: 1.5,
      color: 0xc0a060,
      shrink: true,
    });
  }

  update() {
    this.gfx.clear();

    // Swap-and-pop removal to avoid O(n^2) splice
    let len = this.particles.length;
    for (let i = len - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;

      if (p.life <= 0) {
        this.particles[i] = this.particles[len - 1];
        len--;
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio > 0.7 ? 1 : lifeRatio / 0.7;
      const size = p.shrink ? p.size * lifeRatio : p.size;

      if (p.type === "diamond") {
        this.gfx.moveTo(p.x, p.y - size);
        this.gfx.lineTo(p.x + size * 0.6, p.y);
        this.gfx.lineTo(p.x, p.y + size);
        this.gfx.lineTo(p.x - size * 0.6, p.y);
        this.gfx.closePath();
        this.gfx.fill({ color: p.color, alpha: alpha * 0.8 });
      } else {
        // On mobile: skip glow halo to reduce draw calls
        if (!this.mobile) {
          this.gfx.circle(p.x, p.y, size * 2);
          this.gfx.fill({ color: p.color, alpha: alpha * 0.1 });
        }
        // Core
        this.gfx.circle(p.x, p.y, size);
        this.gfx.fill({ color: p.color, alpha: alpha * 0.7 });
      }
    }
    this.particles.length = len;
  }
}

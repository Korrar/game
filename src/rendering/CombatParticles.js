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

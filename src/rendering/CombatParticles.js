// CombatParticles — PixiJS-based particle system for combat effects
// Replaces Canvas2D CombatEffects with better blending and glow

import { Graphics } from "pixi.js";
import { wrapPxToScreen } from "../utils/panoramaWrap.js";
import { worldToScreen, ISO_CONFIG } from "../utils/isometricUtils.js";

const _isMobile = ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900;
const MAX_PARTICLES = _isMobile ? 100 : 250;

// Multi-layer bloom config per element — drives the glow intensity and spread
const GLOW_CONFIG = {
  fire:      { outerScale: 3.5, outerAlpha: 0.12, midScale: 1.9, midAlpha: 0.22, hotCore: true },
  lightning: { outerScale: 4.2, outerAlpha: 0.20, midScale: 2.1, midAlpha: 0.28, hotCore: true },
  ice:       { outerScale: 3.0, outerAlpha: 0.10, midScale: 1.7, midAlpha: 0.16, hotCore: false },
  shadow:    { outerScale: 3.8, outerAlpha: 0.16, midScale: 2.1, midAlpha: 0.22, hotCore: false },
  holy:      { outerScale: 4.5, outerAlpha: 0.22, midScale: 2.2, midAlpha: 0.32, hotCore: true },
  gold:      { outerScale: 4.0, outerAlpha: 0.22, midScale: 2.0, midAlpha: 0.32, hotCore: true },
  crystal:   { outerScale: 3.5, outerAlpha: 0.16, midScale: 1.9, midAlpha: 0.24, hotCore: false },
  poison:    { outerScale: 3.2, outerAlpha: 0.14, midScale: 1.8, midAlpha: 0.20, hotCore: false },
  default:   { outerScale: 2.2, outerAlpha: 0.08, midScale: 1.5, midAlpha: 0.12, hotCore: false },
};

export class CombatParticles {
  constructor(layer) {
    this.layer = layer;
    this.particles = [];
    this.gfx = new Graphics();
    this.layer.addChild(this.gfx);
    this.mobile = _isMobile;
    this._panOffset = 0;
    this._gameW = 1280;
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
        glowType: config.glowType || "default",
        colorHot: config.colorHot || null, // if set, lerp color from colorHot (start) to color (end)
        rotation: config.rotation || 0,
        rotSpeed: config.rotSpeed || 0,
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
      glowType: "default",
    });
  }

  spawnFire(x, y) {
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 4 + 2),
      life: 20 + Math.random() * 10,
      size: 3 + Math.random() * 2,
      color: 0xff6820,
      colorHot: 0xfff0a0, // starts white-yellow, fades to orange
      gravity: -0.08,
      glowType: "fire",
    });
    // Inner white-hot core
    this._emit(this._c(4), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => -(Math.random() * 3 + 1),
      life: 14,
      size: 2.5,
      color: 0xfff0d0,
      gravity: -0.05,
      glowType: "fire",
      colorHot: 0xffffff,
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
      glowType: "ice",
      rotSpeed: (Math.random() - 0.5) * 0.15,
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
      glowType: "shadow",
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
      glowType: "holy",
    });
    // Central flash
    this._emit(this._c(4), x, y, {
      vx: () => 0,
      vy: () => 0,
      life: 8,
      size: 8,
      color: 0xffffff,
      glowType: "holy",
    });
  }

  spawnMeleeSparks(x, y, dirX) {
    this._emit(this._c(6), x, y, {
      vx: () => dirX * (Math.random() * 5 + 2) + (Math.random() - 0.5) * 2,
      vy: () => -(Math.random() * 4 + 1),
      life: 12 + Math.random() * 8,
      size: 1.5 + Math.random(),
      color: 0xffe060,
      gravity: 0.2,
      glowType: "lightning",
    });
  }

  spawnFireBreath(x, y, dirX) {
    this._emit(this._c(20), x, y, {
      vx: () => dirX * (Math.random() * 6 + 3),
      vy: () => (Math.random() - 0.5) * 3,
      life: 18 + Math.random() * 8,
      size: 3 + Math.random() * 3,
      color: 0xff6428,
      colorHot: 0xffd080,
      gravity: -0.05,
      glowType: "fire",
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
      glowType: "poison",
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
      colorHot: 0xffffa0,
      gravity: 0.14,
      glowType: "gold",
    });
    // Bright white-gold sparkles
    this._emit(this._c(Math.round(14 * intensity)), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 7 + 3),
      life: 35 + Math.random() * 15,
      size: 3 + Math.random() * 2,
      color: 0xfff8c0,
      gravity: 0.10,
      glowType: "gold",
      type: "diamond",
      rotSpeed: (Math.random() - 0.5) * 0.2,
    });
    // Copper-colored coins
    this._emit(this._c(Math.round(10 * intensity)), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 6 + 3),
      life: 45 + Math.random() * 15,
      size: 4 + Math.random() * 2,
      color: 0xd4a030,
      gravity: 0.16,
      glowType: "gold",
    });
    // Tiny glitter dust
    this._emit(this._c(Math.round(8 * intensity)), x, y, {
      vx: () => (Math.random() - 0.5) * 6,
      vy: () => -(Math.random() * 3 + 1),
      life: 25 + Math.random() * 10,
      size: 1.5 + Math.random(),
      color: 0xffffff,
      gravity: 0.05,
      glowType: "gold",
    });
  }

  // Blood slash — saber cut blood spray
  spawnSlashBlood(x, y, dirX, intensity = 1) {
    const count = this._c(Math.round(20 * intensity));
    this._emit(count, x, y, {
      vx: () => dirX * (Math.random() * 6 + 3) + (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 6 + 2),
      life: 30 + Math.random() * 20,
      size: 2.5 + Math.random() * 2.5,
      color: 0xaa1818,
      gravity: 0.28,
      glowType: "default",
    });
    // Bright red mist
    this._emit(this._c(Math.round(8 * intensity)), x, y, {
      vx: () => dirX * (Math.random() * 3) + (Math.random() - 0.5) * 5,
      vy: () => -(Math.random() * 3 + 1),
      life: 18 + Math.random() * 10,
      size: 4 + Math.random() * 3,
      color: 0xff3030,
      gravity: -0.02,
      glowType: "default",
    });
  }

  // Critical saber hit — massive slash spray in two halves
  spawnCritSlash(x, y, dirX) {
    this._emit(this._c(18), x, y, {
      vx: () => dirX * (Math.random() * 5 + 1) + (Math.random() - 0.5) * 6,
      vy: () => -(Math.random() * 9 + 4),
      life: 35 + Math.random() * 20,
      size: 3 + Math.random() * 3,
      color: 0xcc1010,
      gravity: 0.22,
      glowType: "default",
    });
    this._emit(this._c(14), x, y, {
      vx: () => dirX * (Math.random() * 4 + 1) + (Math.random() - 0.5) * 5,
      vy: () => (Math.random() * 5 + 2),
      life: 30 + Math.random() * 15,
      size: 2.5 + Math.random() * 2.5,
      color: 0x881010,
      gravity: 0.18,
      glowType: "default",
    });
    // White flash at impact with glow
    this._emit(this._c(5), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => (Math.random() - 0.5) * 2,
      life: 8,
      size: 8,
      color: 0xffffff,
      glowType: "holy",
    });
    // Golden sparks on crit
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 5 + 2),
      life: 16 + Math.random() * 8,
      size: 2 + Math.random() * 1.5,
      color: 0xffe040,
      gravity: 0.18,
      glowType: "lightning",
    });
  }

  // Gore explosion — spectacular body parts + blood for explosive kills
  spawnGoreExplosion(x, y) {
    this._emit(this._c(35), x, y, {
      vx: () => (Math.random() - 0.5) * 14,
      vy: () => -(Math.random() * 12 + 4),
      life: 45 + Math.random() * 25,
      size: 3 + Math.random() * 3,
      color: 0xcc1818,
      gravity: 0.20,
      glowType: "default",
    });
    // Bone/body chunks
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 10 + 5),
      life: 50 + Math.random() * 25,
      size: 3 + Math.random() * 3,
      color: 0xd0b088,
      gravity: 0.22,
      type: "diamond",
      rotSpeed: (Math.random() - 0.5) * 0.1,
    });
    // Dark gore chunks
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 8 + 3),
      life: 40 + Math.random() * 20,
      size: 4 + Math.random() * 4,
      color: 0x661010,
      gravity: 0.25,
      glowType: "default",
    });
    // Hot fire flash
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 6 + 2),
      life: 14 + Math.random() * 8,
      size: 5 + Math.random() * 4,
      color: 0xff8020,
      colorHot: 0xffee80,
      gravity: -0.06,
      glowType: "fire",
    });
    // Smoke
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 3 + 1),
      life: 35 + Math.random() * 20,
      size: 6 + Math.random() * 4,
      color: 0x444444,
      gravity: -0.04,
      shrink: false,
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
        glowType: "lightning",
      });
    }
    // Flash at target
    this._emit(this._c(8), x2, y2, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => (Math.random() - 0.5) * 8,
      life: 14 + Math.random() * 6,
      size: 2.5 + Math.random() * 2,
      color: 0xffff80,
      glowType: "lightning",
    });
  }

  // ─── OBSTACLE DESTRUCTION PARTICLES ───

  spawnWoodSplinters(x, y) {
    this._emit(this._c(16), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 8 + 3),
      life: 40 + Math.random() * 20,
      size: 3 + Math.random() * 2,
      color: 0x8a6030,
      gravity: 0.22,
      type: "diamond",
      rotSpeed: (Math.random() - 0.5) * 0.12,
    });
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 5 + 2),
      life: 25 + Math.random() * 15,
      size: 2 + Math.random() * 1.5,
      color: 0xb08850,
      gravity: 0.15,
    });
    this._emit(this._c(6), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 2 + 1),
      life: 30 + Math.random() * 15,
      size: 5 + Math.random() * 3,
      color: 0xc0a870,
      gravity: -0.02,
      shrink: false,
    });
  }

  spawnStoneRubble(x, y) {
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 7 + 4),
      life: 45 + Math.random() * 20,
      size: 3 + Math.random() * 3,
      color: 0x6a6a6a,
      gravity: 0.28,
      type: "diamond",
      rotSpeed: (Math.random() - 0.5) * 0.08,
    });
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 6 + 2),
      life: 35 + Math.random() * 15,
      size: 2 + Math.random() * 1.5,
      color: 0x8a8a8a,
      gravity: 0.25,
    });
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 5,
      vy: () => -(Math.random() * 2 + 0.5),
      life: 35 + Math.random() * 20,
      size: 6 + Math.random() * 4,
      color: 0x9a9080,
      gravity: -0.02,
      shrink: false,
    });
  }

  spawnIceShatter(x, y) {
    this._emit(this._c(14), x, y, {
      vx: () => (Math.random() - 0.5) * 14,
      vy: () => -(Math.random() * 9 + 3),
      life: 35 + Math.random() * 15,
      size: 2.5 + Math.random() * 2.5,
      color: 0x80d0ff,
      gravity: 0.18,
      type: "diamond",
      glowType: "ice",
      rotSpeed: (Math.random() - 0.5) * 0.18,
    });
    this._emit(this._c(4), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => (Math.random() - 0.5) * 2,
      life: 10,
      size: 12,
      color: 0xe0f0ff,
      glowType: "ice",
    });
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 6,
      vy: () => -(Math.random() * 2),
      life: 25 + Math.random() * 15,
      size: 4 + Math.random() * 3,
      color: 0xa0d8f0,
      gravity: -0.03,
      glowType: "ice",
      shrink: false,
    });
  }

  spawnCrystalShatter(x, y) {
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 8 + 4),
      life: 40 + Math.random() * 20,
      size: 3 + Math.random() * 2,
      color: 0xc080ff,
      gravity: 0.16,
      type: "diamond",
      glowType: "crystal",
      rotSpeed: (Math.random() - 0.5) * 0.15,
    });
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 5 + 2),
      life: 30 + Math.random() * 15,
      size: 2 + Math.random(),
      color: 0xffa0ff,
      gravity: 0.10,
      glowType: "crystal",
    });
    this._emit(this._c(3), x, y, {
      vx: () => 0,
      vy: () => 0,
      life: 12,
      size: 14,
      color: 0xe0c0ff,
      glowType: "crystal",
    });
  }

  spawnLeafBurst(x, y) {
    this._emit(this._c(14), x, y, {
      vx: () => (Math.random() - 0.5) * 10,
      vy: () => -(Math.random() * 6 + 2),
      life: 40 + Math.random() * 25,
      size: 3 + Math.random() * 2,
      color: 0x50a030,
      gravity: 0.08,
      type: "diamond",
      rotSpeed: (Math.random() - 0.5) * 0.12,
    });
    this._emit(this._c(6), x, y, {
      vx: () => (Math.random() - 0.5) * 4,
      vy: () => -(Math.random() * 2 + 0.5),
      life: 35 + Math.random() * 15,
      size: 5 + Math.random() * 3,
      color: 0x80c060,
      gravity: -0.02,
      shrink: false,
    });
  }

  spawnMetalSparks(x, y) {
    this._emit(this._c(18), x, y, {
      vx: () => (Math.random() - 0.5) * 16,
      vy: () => -(Math.random() * 10 + 4),
      life: 20 + Math.random() * 15,
      size: 1.5 + Math.random() * 1.5,
      color: 0xffe060,
      gravity: 0.30,
      glowType: "lightning",
    });
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 12,
      vy: () => -(Math.random() * 8 + 3),
      life: 12 + Math.random() * 8,
      size: 1 + Math.random(),
      color: 0xffffff,
      gravity: 0.25,
      glowType: "lightning",
    });
  }

  spawnDustBurst(x, y) {
    this._emit(this._c(12), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => -(Math.random() * 4 + 2),
      life: 35 + Math.random() * 20,
      size: 4 + Math.random() * 3,
      color: 0xc4a860,
      gravity: 0.06,
      shrink: false,
    });
    this._emit(this._c(8), x, y, {
      vx: () => (Math.random() - 0.5) * 5,
      vy: () => -(Math.random() * 2 + 0.5),
      life: 30 + Math.random() * 20,
      size: 6 + Math.random() * 4,
      color: 0xd8c090,
      gravity: -0.01,
      shrink: false,
    });
  }

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

  spawnEnemyAttackWarn(x, y) {
    this._emit(this._c(10), x, y, {
      vx: () => (Math.random() - 0.5) * 6,
      vy: () => (Math.random() * 6 + 3),
      life: 18 + Math.random() * 8,
      size: 3 + Math.random() * 2,
      color: 0xff4020,
      gravity: 0.1,
      glowType: "fire",
    });
    this._emit(this._c(3), x, y, {
      vx: () => (Math.random() - 0.5) * 2,
      vy: () => (Math.random() * 2 + 1),
      life: 8,
      size: 6,
      color: 0xffffaa,
      glowType: "holy",
    });
  }

  spawnMeleeSlashTrail(x, y, dir = 1) {
    this._emit(this._c(8), x, y, {
      vx: () => dir * (2 + Math.random() * 4),
      vy: () => (Math.random() - 0.5) * 6,
      life: 12 + Math.random() * 6,
      size: 2.5 + Math.random() * 1.5,
      color: 0xff8040,
      gravity: 0.08,
      shrink: true,
      glowType: "fire",
    });
    this._emit(this._c(3), x, y, {
      vx: () => dir * (3 + Math.random() * 3),
      vy: () => (Math.random() - 0.5) * 4,
      life: 8,
      size: 3,
      color: 0xffffff,
      shrink: true,
      glowType: "holy",
    });
  }

  spawnChargeTrail(x, y) {
    this._emit(this._c(4), x, y, {
      vx: () => (Math.random() - 0.5) * 3,
      vy: () => -(Math.random() * 2 + 1),
      life: 15 + Math.random() * 8,
      size: 3 + Math.random() * 3,
      color: 0xa09070,
      gravity: 0.05,
      shrink: true,
    });
  }

  spawnRangedChargeUp(x, y, element) {
    const colorMap = {
      fire: { color: 0xff6020, glowType: "fire" },
      ice: { color: 0x60c0ff, glowType: "ice" },
      shadow: { color: 0xa050e0, glowType: "shadow" },
      poison: { color: 0x44ff44, glowType: "poison" },
    };
    const cfg = colorMap[element] || { color: 0xffaa00, glowType: "lightning" };
    this._emit(this._c(6), x, y, {
      vx: () => (Math.random() - 0.5) * 8,
      vy: () => (Math.random() - 0.5) * 8,
      life: 12 + Math.random() * 4,
      size: 2 + Math.random() * 2,
      color: cfg.color,
      gravity: 0,
      converge: true,
      cx: x, cy: y,
      glowType: cfg.glowType,
    });
  }

  spawnArrowTrail(x, y) {
    this._emit(this.mobile ? 1 : 3, x, y, {
      vx: () => (Math.random() - 0.5) * 0.5,
      vy: () => (Math.random() - 0.5) * 0.5,
      life: 8,
      size: 1.5,
      color: 0xc0a060,
      shrink: true,
    });
  }

  // ─── RENDER HELPERS ───

  _lerpColor(c1, c2, t) {
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    return ((Math.round(r1 + (r2 - r1) * t) << 16) |
            (Math.round(g1 + (g2 - g1) * t) << 8) |
             Math.round(b1 + (b2 - b1) * t));
  }

  _drawParticle(sx, sy, p, lifeRatio) {
    const alpha = lifeRatio > 0.7 ? 1 : lifeRatio / 0.7;
    const size = p.shrink ? p.size * lifeRatio : p.size;

    // Resolve final color (temperature shift: colorHot at start, color at end)
    const color = (p.colorHot !== null)
      ? this._lerpColor(p.colorHot, p.color, 1 - lifeRatio)
      : p.color;

    const glowCfg = GLOW_CONFIG[p.glowType] || GLOW_CONFIG.default;

    if (p.type === "diamond") {
      const rot = p.rotation || 0;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const rx = size * 0.65, ry = size;

      if (!this.mobile) {
        // Outer bloom for glowing diamonds
        const outerR = size * glowCfg.outerScale;
        this.gfx.circle(sx, sy, outerR);
        this.gfx.fill({ color, alpha: alpha * glowCfg.outerAlpha });
      }

      // Draw rotated diamond
      const pts = [
        sx + cos * 0 - sin * (-ry), sy + sin * 0 + cos * (-ry),
        sx + cos * rx - sin * 0,    sy + sin * rx + cos * 0,
        sx + cos * 0 - sin * ry,    sy + sin * 0 + cos * ry,
        sx + cos * (-rx) - sin * 0, sy + sin * (-rx) + cos * 0,
      ];
      this.gfx.poly(pts);
      this.gfx.fill({ color, alpha: alpha * 0.85 });

    } else {
      if (!this.mobile) {
        // Outer soft bloom
        this.gfx.circle(sx, sy, size * glowCfg.outerScale);
        this.gfx.fill({ color, alpha: alpha * glowCfg.outerAlpha });
        // Mid bloom
        this.gfx.circle(sx, sy, size * glowCfg.midScale);
        this.gfx.fill({ color, alpha: alpha * glowCfg.midAlpha });
      } else {
        // Mobile: single light halo
        this.gfx.circle(sx, sy, size * 2);
        this.gfx.fill({ color, alpha: alpha * 0.10 });
      }
      // Core
      this.gfx.circle(sx, sy, size);
      this.gfx.fill({ color, alpha: alpha * 0.80 });

      // Hot bright core dot for luminous particles
      if (!this.mobile && glowCfg.hotCore && lifeRatio > 0.4) {
        this.gfx.circle(sx, sy, size * 0.4);
        this.gfx.fill({ color: 0xffffff, alpha: alpha * 0.55 * lifeRatio });
      }
    }
  }

  update(panOffset, gameW) {
    if (panOffset !== undefined) this._panOffset = panOffset;
    if (gameW !== undefined) this._gameW = gameW;
    this.gfx.clear();

    const po = this._panOffset;
    const gw = this._gameW;

    let len = this.particles.length;
    for (let i = len - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      if (p.rotSpeed) p.rotation += p.rotSpeed;
      p.life--;

      if (p.life <= 0) {
        this.particles[i] = this.particles[len - 1];
        len--;
        continue;
      }

      const sx = po ? wrapPxToScreen(p.x, po, gw) : p.x;
      if (sx === null) continue;

      const lifeRatio = p.life / p.maxLife;
      this._drawParticle(sx, p.y, p, lifeRatio);
    }
    this.particles.length = len;
  }

  updateIso(cameraX, cameraY, gameW) {
    this._gameW = gameW || 1280;
    this.gfx.clear();

    let len = this.particles.length;
    for (let i = len - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      if (p.rotSpeed) p.rotation += p.rotSpeed;
      p.life--;

      if (p.life <= 0) {
        this.particles[i] = this.particles[len - 1];
        len--;
        continue;
      }

      const gw = this._gameW || 1280;
      const wx = p.wx ?? (p.x / gw) * ISO_CONFIG.MAP_COLS;
      const wy = p.wy ?? (p.y / ISO_CONFIG.GAME_H) * ISO_CONFIG.MAP_ROWS;
      const screen = worldToScreen(wx, wy, cameraX, cameraY);
      const sx = screen.x;
      const sy = screen.y;
      if (sx < -50 || sx > gw + 50 || sy < -50 || sy > ISO_CONFIG.GAME_H + 50) continue;

      const lifeRatio = p.life / p.maxLife;
      this._drawParticle(sx, sy, p, lifeRatio);
    }
    this.particles.length = len;
  }
}

// TerrainParticles — Ambient particle effects tied to terrain features
// Water splashes, cliff dust, ground mist, lava embers, etc.
// Rendered on Canvas2D alongside biome animations

import { ISO_CONFIG, worldToScreen, getHeightAt } from "../utils/isometricUtils.js";
import { WATER_FEATURES } from "../data/terrainFeatures.js";

const MAX_PARTICLES = 200;
const MOBILE_MAX = 80;

// ─── PARTICLE POOL ───

class TerrainParticle {
  constructor() {
    this.alive = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.wx = 0; this.wy = 0; // world position
    this.age = 0; this.maxAge = 0;
    this.size = 0;
    this.type = "";
    this.r = 0; this.g = 0; this.b = 0;
    this.alpha = 1;
    this.gravity = 0;
    this.phase = 0;
  }
}

export class TerrainParticleSystem {
  constructor(isMobile) {
    this._isMobile = isMobile;
    const max = isMobile ? MOBILE_MAX : MAX_PARTICLES;
    this._pool = [];
    for (let i = 0; i < max; i++) {
      this._pool.push(new TerrainParticle());
    }
    this._nextFree = 0;
    this._frameCount = 0;
  }

  _alloc() {
    const max = this._pool.length;
    for (let i = 0; i < max; i++) {
      const idx = (this._nextFree + i) % max;
      if (!this._pool[idx].alive) {
        this._nextFree = (idx + 1) % max;
        return this._pool[idx];
      }
    }
    // Steal oldest
    const p = this._pool[this._nextFree];
    this._nextFree = (this._nextFree + 1) % max;
    return p;
  }

  // ─── SPAWN FUNCTIONS ───

  // Water ripple splash (when NPC walks through water)
  spawnWaterSplash(wx, wy, height) {
    for (let i = 0; i < 4; i++) {
      const p = this._alloc();
      p.alive = true;
      p.wx = wx + (Math.random() - 0.5) * 0.5;
      p.wy = wy + (Math.random() - 0.5) * 0.5;
      p.vx = (Math.random() - 0.5) * 0.8;
      p.vy = -1.5 - Math.random() * 1.5;
      p.age = 0;
      p.maxAge = 20 + Math.random() * 15;
      p.size = 2 + Math.random() * 2;
      p.type = "water_splash";
      p.r = 80; p.g = 160; p.b = 220;
      p.gravity = 0.12;
      p.alpha = 0.6;
      p.height = height || 0;
    }
  }

  // Cliff dust (falling from cliff edges)
  spawnCliffDust(wx, wy, height) {
    for (let i = 0; i < 3; i++) {
      const p = this._alloc();
      p.alive = true;
      p.wx = wx + (Math.random() - 0.5) * 0.8;
      p.wy = wy + (Math.random() - 0.5) * 0.8;
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = 0.3 + Math.random() * 0.5;
      p.age = 0;
      p.maxAge = 30 + Math.random() * 20;
      p.size = 1.5 + Math.random() * 2;
      p.type = "dust";
      p.r = 160; p.g = 140; p.b = 100;
      p.gravity = 0.02;
      p.alpha = 0.35;
      p.height = height || 0;
    }
  }

  // Ground mist (swamp, mushroom cave)
  spawnGroundMist(wx, wy, height, r, g, b) {
    const p = this._alloc();
    p.alive = true;
    p.wx = wx + (Math.random() - 0.5) * 1.5;
    p.wy = wy + (Math.random() - 0.5) * 1.5;
    p.vx = (Math.random() - 0.5) * 0.15;
    p.vy = (Math.random() - 0.5) * 0.1;
    p.age = 0;
    p.maxAge = 60 + Math.random() * 40;
    p.size = 8 + Math.random() * 12;
    p.type = "mist";
    p.r = r || 100; p.g = g || 140; p.b = b || 100;
    p.gravity = -0.005;
    p.alpha = 0.12;
    p.height = height || 0;
    p.phase = Math.random() * Math.PI * 2;
  }

  // Lava ember (rising from lava pools)
  spawnLavaEmber(wx, wy, height) {
    const p = this._alloc();
    p.alive = true;
    p.wx = wx + (Math.random() - 0.5) * 0.8;
    p.wy = wy + (Math.random() - 0.5) * 0.8;
    p.vx = (Math.random() - 0.5) * 0.4;
    p.vy = -0.8 - Math.random() * 1.2;
    p.age = 0;
    p.maxAge = 35 + Math.random() * 25;
    p.size = 1.5 + Math.random() * 2.5;
    p.type = "ember";
    p.r = 255; p.g = 100 + Math.random() * 80; p.b = 20;
    p.gravity = -0.02;
    p.alpha = 0.7;
    p.height = height || 0;
  }

  // Pollen / spore drift (gentle floating)
  spawnPollenDrift(wx, wy, height, r, g, b) {
    const p = this._alloc();
    p.alive = true;
    p.wx = wx + (Math.random() - 0.5) * 2;
    p.wy = wy + (Math.random() - 0.5) * 2;
    p.vx = (Math.random() - 0.5) * 0.2;
    p.vy = -0.1 - Math.random() * 0.2;
    p.age = 0;
    p.maxAge = 80 + Math.random() * 60;
    p.size = 1 + Math.random() * 2;
    p.type = "pollen";
    p.r = r || 220; p.g = g || 200; p.b = b || 100;
    p.gravity = 0;
    p.alpha = 0.3;
    p.height = (height || 0) + 0.5 + Math.random();
    p.phase = Math.random() * Math.PI * 2;
  }

  // Frost sparkle (ice/winter terrain)
  spawnFrostSparkle(wx, wy, height) {
    const p = this._alloc();
    p.alive = true;
    p.wx = wx + (Math.random() - 0.5) * 1;
    p.wy = wy + (Math.random() - 0.5) * 1;
    p.vx = 0; p.vy = 0;
    p.age = 0;
    p.maxAge = 15 + Math.random() * 15;
    p.size = 1 + Math.random() * 1.5;
    p.type = "sparkle";
    p.r = 200; p.g = 230; p.b = 255;
    p.gravity = 0;
    p.alpha = 0;
    p.height = (height || 0) + 0.1;
    p.phase = Math.random() * Math.PI * 2;
  }

  // Smoke vent (volcanic/underworld)
  spawnSmokeVent(wx, wy, height) {
    const p = this._alloc();
    p.alive = true;
    p.wx = wx + (Math.random() - 0.5) * 0.3;
    p.wy = wy + (Math.random() - 0.5) * 0.3;
    p.vx = (Math.random() - 0.5) * 0.1;
    p.vy = -0.4 - Math.random() * 0.6;
    p.age = 0;
    p.maxAge = 40 + Math.random() * 30;
    p.size = 4 + Math.random() * 6;
    p.type = "smoke";
    p.r = 80; p.g = 70; p.b = 60;
    p.gravity = -0.01;
    p.alpha = 0.2;
    p.height = (height || 0) + 0.5;
  }

  // ─── AMBIENT SPAWNING ───
  // Call each frame to spawn ambient particles based on terrain

  spawnAmbient(terrainData, cameraX, cameraY) {
    if (!terrainData) return;
    this._frameCount++;

    const { waterTiles, cliffs, vegetation, profile, heightMap } = terrainData;
    const skipRate = this._isMobile ? 4 : 2;
    if (this._frameCount % skipRate !== 0) return;

    // Water ambient (ripples on pools)
    if (waterTiles && waterTiles.length > 0) {
      const idx = Math.floor(Math.random() * waterTiles.length);
      const tile = waterTiles[idx];
      const feature = WATER_FEATURES[tile.featureId];
      if (feature) {
        const h = getHeightAt(heightMap, tile.col, tile.row);
        if (feature.glow) {
          this.spawnLavaEmber(tile.col + 0.5, tile.row + 0.5, h);
        } else if (feature.bubbles) {
          this.spawnGroundMist(tile.col + 0.5, tile.row + 0.5, h, 60, 90, 50);
        } else {
          this.spawnWaterSplash(tile.col + 0.5, tile.row + 0.5, h);
        }
      }
    }

    // Cliff ambient (occasional dust)
    if (cliffs && cliffs.length > 0 && Math.random() < 0.3) {
      const idx = Math.floor(Math.random() * cliffs.length);
      const cliff = cliffs[idx];
      const h = getHeightAt(heightMap, cliff.col, cliff.row);
      this.spawnCliffDust(cliff.col + 0.5, cliff.row + 0.5, h);
    }

    // Biome ambient particles
    const ambientTypes = profile?.ambientParticles || [];
    if (ambientTypes.length > 0 && Math.random() < 0.5) {
      // Pick a random visible tile
      const rx = Math.random() * ISO_CONFIG.MAP_COLS;
      const ry = Math.random() * ISO_CONFIG.MAP_ROWS;
      const h = getHeightAt(heightMap, Math.floor(rx), Math.floor(ry));
      const pType = ambientTypes[Math.floor(Math.random() * ambientTypes.length)];

      switch (pType) {
        case "mist_ground":
          this.spawnGroundMist(rx, ry, h, 120, 150, 120);
          break;
        case "leaf_drift":
          this.spawnPollenDrift(rx, ry, h, 80, 140, 40);
          break;
        case "sand_drift":
          this.spawnPollenDrift(rx, ry, h, 200, 180, 120);
          break;
        case "sea_spray":
          this.spawnWaterSplash(rx, ry, h);
          break;
        case "heat_shimmer":
          this.spawnGroundMist(rx, ry, h, 200, 180, 100);
          break;
        case "snowflake_ground":
          this.spawnFrostSparkle(rx, ry, h);
          break;
        case "frost_sparkle":
          this.spawnFrostSparkle(rx, ry, h);
          break;
        case "dust_mote":
          this.spawnCliffDust(rx, ry, h);
          break;
        case "ember_ground":
        case "ember_spark":
          this.spawnLavaEmber(rx, ry, h);
          break;
        case "smoke_vent":
          this.spawnSmokeVent(rx, ry, h);
          break;
        case "pollen_drift":
        case "petal_ground":
          this.spawnPollenDrift(rx, ry, h, 255, 180, 200);
          break;
        case "grass_rustle":
          this.spawnPollenDrift(rx, ry, h, 100, 180, 60);
          break;
        case "spore_ground":
          this.spawnPollenDrift(rx, ry, h, 180, 100, 220);
          break;
        case "glow_mote":
          this.spawnFrostSparkle(rx, ry, h);
          break;
        case "bubble_ground":
          this.spawnGroundMist(rx, ry, h, 80, 120, 60);
          break;
        case "ghost_wisp":
          this.spawnGroundMist(rx, ry, h, 100, 80, 160);
          break;
        case "cloud_wisp":
          this.spawnGroundMist(rx, ry, h, 200, 210, 230);
          break;
        case "lightning_spark":
          this.spawnFrostSparkle(rx, ry, h);
          break;
        case "cosmic_spark":
          this.spawnFrostSparkle(rx, ry, h);
          break;
        case "radiation_glow":
          this.spawnPollenDrift(rx, ry, h, 100, 200, 255);
          break;
      }
    }
  }

  // ─── UPDATE & RENDER ───

  update(ctx, cameraX, cameraY) {
    for (const p of this._pool) {
      if (!p.alive) continue;

      p.age++;
      if (p.age >= p.maxAge) { p.alive = false; continue; }

      // Physics
      p.vy += p.gravity;
      p.wx += p.vx * 0.02; // world units per frame
      p.wy += p.vy * 0.02;

      // Life ratio
      const t = p.age / p.maxAge;

      // Convert to screen
      const screen = worldToScreen(p.wx, p.wy, cameraX, cameraY, p.height);
      if (screen.x < -20 || screen.x > GAME_W + 20 ||
          screen.y < -20 || screen.y > GAME_H + 20) continue;

      // Calculate alpha
      let alpha = p.alpha;
      if (t < 0.1) alpha *= t * 10; // fade in
      else if (t > 0.7) alpha *= (1 - t) / 0.3; // fade out

      if (alpha < 0.01) continue;

      ctx.globalAlpha = alpha;

      switch (p.type) {
        case "water_splash":
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;

        case "dust":
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, p.size * (1 + t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;

        case "mist":
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          const mistSize = p.size * (1 + t * 0.8);
          const wobble = Math.sin(p.phase + p.age * 0.05) * 3;
          ctx.beginPath();
          ctx.ellipse(screen.x + wobble, screen.y, mistSize, mistSize * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "ember":
          const emberR = Math.max(0, p.r - t * 80);
          const emberG = Math.max(0, p.g - t * 60);
          ctx.fillStyle = `rgb(${Math.round(emberR)},${Math.round(emberG)},${p.b})`;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, p.size * (1 - t * 0.3), 0, Math.PI * 2);
          ctx.fill();
          // Glow
          if (!this._isMobile) {
            ctx.globalAlpha = alpha * 0.3;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, p.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case "pollen":
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          const drift = Math.sin(p.phase + p.age * 0.08) * 4;
          ctx.beginPath();
          ctx.arc(screen.x + drift, screen.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "sparkle":
          const sparkAlpha = Math.sin(p.age * 0.4) * 0.5 + 0.5;
          ctx.globalAlpha = sparkAlpha * 0.6;
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          // 4-point star
          const ss = p.size;
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y - ss);
          ctx.lineTo(screen.x + ss * 0.3, screen.y);
          ctx.lineTo(screen.x, screen.y + ss);
          ctx.lineTo(screen.x - ss * 0.3, screen.y);
          ctx.closePath();
          ctx.fill();
          break;

        case "smoke":
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          const smokeSize = p.size * (1 + t * 1.5);
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, smokeSize, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // Clear all particles (on room transition)
  clear() {
    for (const p of this._pool) p.alive = false;
  }
}

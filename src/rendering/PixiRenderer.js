// PixiRenderer — WebGL-based renderer replacing Canvas2D for characters/projectiles
// Uses PixiJS v8 Application with per-NPC containers + filters

import { Application, Container, Graphics, Text, TextStyle, BlurFilter } from "pixi.js";
import { CharacterSprite } from "./CharacterSprite.js";
import { ProjectileRenderer } from "./ProjectileRenderer.js";
import { CombatParticles } from "./CombatParticles.js";
import { DamageNumbers } from "./DamageNumbers.js";
import { depthFromY, scaleAtDepth, zIndexAtDepth } from "./DepthSystem.js";
import { createDebris, updateDebris, clearDebris, DEBRIS_CONFIG } from "../systems/DebrisSystem.js";
import { createGroundMark, updateGroundMarks, clearGroundMarks, GROUND_MARKS_CONFIG } from "../systems/GroundMarks.js";

export class PixiRenderer {
  constructor() {
    this.app = null;
    this.groundMarkLayer = null; // Container for ground marks (below NPCs)
    this.debrisLayer = null;     // Container for debris fragments (below NPCs)
    this.npcLayer = null;        // Container for all NPC sprites
    this.projectileLayer = null; // Container for projectiles
    this.particleLayer = null;   // Container for particles
    this.uiLayer = null;         // Container for damage numbers
    this.characters = {};        // walkerId → CharacterSprite
    this.projectileRenderer = null;
    this.combatParticles = null;
    this.damageNumbers = null;
    this.W = 0;
    this.H = 0;
    this.GY = 0;
    this.fogVisibility = 0;
    this.ready = false;
    this._shakeX = 0;
    this._shakeY = 0;
    this._shakeDecay = 0;
    this._panOffset = 0;
    // Destruction systems
    this._debris = [];
    this._groundMarks = [];
    this._debrisGfx = null;
    this._groundMarkGfx = null;
  }

  async init(parentElement, width, height) {
    this.W = width;
    this.H = height;
    this.GY = height * 0.25;

    this.app = new Application();
    // Cap resolution on mobile to reduce GPU workload
    const isMobile = ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900;
    const resolution = isMobile ? 1 : (window.devicePixelRatio || 1);
    await this.app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: !isMobile,
      resolution,
      autoDensity: true,
    });

    // Style the canvas
    const canvas = this.app.canvas;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "12";
    parentElement.appendChild(canvas);

    // Create layers (order = render order, bottom to top)
    this.groundMarkLayer = new Container(); // ground scorch/frost/blood marks
    this.debrisLayer = new Container();     // persistent debris fragments
    this.npcLayer = new Container();
    this.npcLayer.sortableChildren = true; // 2.5D depth sorting by Y
    this.projectileLayer = new Container();
    this.particleLayer = new Container();
    this.uiLayer = new Container();

    this._groundMarkGfx = new Graphics();
    this.groundMarkLayer.addChild(this._groundMarkGfx);
    this._debrisGfx = new Graphics();
    this.debrisLayer.addChild(this._debrisGfx);

    this.app.stage.addChild(this.groundMarkLayer);
    this.app.stage.addChild(this.debrisLayer);
    this.app.stage.addChild(this.npcLayer);
    this.app.stage.addChild(this.projectileLayer);
    this.app.stage.addChild(this.particleLayer);
    this.app.stage.addChild(this.uiLayer);

    this.projectileRenderer = new ProjectileRenderer(this.projectileLayer);
    this.combatParticles = new CombatParticles(this.particleLayer);
    this.damageNumbers = new DamageNumbers(this.uiLayer);

    this.ready = true;
    return canvas;
  }

  resize(w, h) {
    if (!this.app) return;
    this.W = w;
    this.H = h;
    this.GY = h * 0.25;
    this.app.renderer.resize(w, h);
    const canvas = this.app.canvas;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  getCanvas() {
    return this.app?.canvas || null;
  }

  // ─── NPC MANAGEMENT ───

  addNpc(walkerId, npcData, friendly) {
    if (this.characters[walkerId]) return;
    const char = new CharacterSprite(npcData, friendly);
    this.characters[walkerId] = char;
    this.npcLayer.addChild(char.container);
  }

  removeNpc(walkerId) {
    const char = this.characters[walkerId];
    if (!char) return;
    this.npcLayer.removeChild(char.container);
    char.destroy();
    delete this.characters[walkerId];
  }

  // Panoramic offset for 360° scrolling
  setPanOffset(offset) {
    this._panOffset = offset || 0;
  }

  // ─── RENDER FRAME ───

  render(bodies, projectiles, fogVisibility, playerSkillshots, mines, areaIndicators) {
    if (!this.ready) return;
    this.fogVisibility = fogVisibility || 0;

    // Screen shake (no panoramic shift on stage — wrapping is per-object)
    if (this._shakeDecay > 0) {
      this._shakeX = (Math.random() - 0.5) * this._shakeDecay;
      this._shakeY = (Math.random() - 0.5) * this._shakeDecay;
      this._shakeDecay *= 0.9;
      if (this._shakeDecay < 0.5) this._shakeDecay = 0;
      this.app.stage.position.set(this._shakeX, this._shakeY);
    } else if (this._shakeX !== 0 || this._shakeY !== 0) {
      this._shakeX = 0;
      this._shakeY = 0;
      this.app.stage.position.set(0, 0);
    }

    // Panoramic wrapping constants
    const worldW = this.W * 3; // PANORAMA_WORLD_W = 3
    const panOff = ((this._panOffset || 0) % worldW + worldW) % worldW;

    // Update NPC sprites
    for (const [id, entry] of Object.entries(bodies)) {
      let char = this.characters[id];
      if (!char) {
        // Auto-create if missing
        char = new CharacterSprite(entry.npcData, entry.friendly);
        this.characters[id] = char;
        this.npcLayer.addChild(char.container);
      }

      // Fading ragdoll
      if (entry.ragdoll) {
        entry.fadeTimer = (entry.fadeTimer || 0) + 1;
        entry.fadeAlpha = Math.max(0, 1 - (entry.fadeTimer - 60) / 90);
        if (entry.fadeAlpha <= 0) {
          // Signal removal
          entry._removeFlag = true;
          continue;
        }
      }
      if (entry.hitFlash > 0) entry.hitFlash--;

      // 2.5D: compute depth from NPC's Y percentage and apply to sprite
      const yPct = entry._yPct ?? 65; // default to mid-ground if not set
      const depth = depthFromY(yPct);
      const depthScale = scaleAtDepth(depth);
      char.container.zIndex = zIndexAtDepth(depth);

      char.update(entry, this.W, this.H, this.GY, this.fogVisibility, depth, depthScale);

      // Panoramic 360° wrapping: NPC exists at 3 virtual positions
      // (physX, physX + viewW, physX + 2*viewW) — show the visible copy
      if (panOff > 0) {
        const physX = char.container.x;
        let bestX = -9999;
        for (let copy = 0; copy < 3; copy++) {
          let sx = (physX + copy * this.W) - panOff;
          if (sx < 0) sx += worldW;
          if (sx >= -80 && sx <= this.W + 80) { bestX = sx; break; }
        }
        char.container.x = bestX;
        char.container.visible = bestX > -9000;
      }
    }

    // Remove dead NPCs
    for (const [id, entry] of Object.entries(bodies)) {
      if (entry._removeFlag) {
        this.removeNpc(parseInt(id));
      }
    }

    // Remove orphaned character sprites
    for (const id of Object.keys(this.characters)) {
      if (!bodies[id]) {
        this.removeNpc(parseInt(id));
      }
    }

    // Update projectiles (NPC + player skillshots)
    this.projectileRenderer.update(projectiles, playerSkillshots, mines, areaIndicators);

    // Update particles
    this.combatParticles.update();

    // Update damage numbers
    this.damageNumbers.update();

    // Update debris
    this._updateDebris();

    // Update ground marks
    this._updateGroundMarks();
  }

  // ─── EFFECTS ───

  screenShake(intensity = 8) {
    this._shakeDecay = Math.max(this._shakeDecay, intensity);
  }

  spawnDamageNumber(x, y, amount, element, isCrit) {
    if (!this.damageNumbers) return;
    this.damageNumbers.spawn(x, y, amount, element, isCrit);
  }

  // ─── COMBAT PARTICLES (delegated) ───

  spawnBlood(x, y, dirX, intensity) { this.combatParticles?.spawnBlood(x, y, dirX, intensity); }
  spawnFire(x, y) { this.combatParticles?.spawnFire(x, y); }
  spawnIceShards(x, y, dirX) { this.combatParticles?.spawnIceShards(x, y, dirX); }
  spawnShadowMist(x, y) { this.combatParticles?.spawnShadowMist(x, y); }
  spawnHolyLight(x, y) { this.combatParticles?.spawnHolyLight(x, y); }
  spawnMeleeSparks(x, y, dirX) { this.combatParticles?.spawnMeleeSparks(x, y, dirX); }
  spawnFireBreath(x, y, dirX) { this.combatParticles?.spawnFireBreath(x, y, dirX); }
  spawnPoisonCloud(x, y) { this.combatParticles?.spawnPoisonCloud(x, y); }
  spawnChainLightning(x1, y1, x2, y2) { this.combatParticles?.spawnChainLightning(x1, y1, x2, y2); }
  spawnArrowTrail(x, y, vx, vy) { this.combatParticles?.spawnArrowTrail(x, y, vx, vy); }
  spawnGoldCoins(x, y, intensity) { this.combatParticles?.spawnGoldCoins(x, y, intensity); }
  spawnSlashBlood(x, y, dirX, intensity) { this.combatParticles?.spawnSlashBlood(x, y, dirX, intensity); }
  spawnCritSlash(x, y, dirX) { this.combatParticles?.spawnCritSlash(x, y, dirX); }
  spawnGoreExplosion(x, y) { this.combatParticles?.spawnGoreExplosion(x, y); }
  spawnShotBlood(x, y, dirX) { this.combatParticles?.spawnShotBlood(x, y, dirX); }

  // ─── OBSTACLE DESTRUCTION PARTICLES (delegated) ───
  spawnWoodSplinters(x, y) { this.combatParticles?.spawnWoodSplinters(x, y); }
  spawnStoneRubble(x, y) { this.combatParticles?.spawnStoneRubble(x, y); }
  spawnIceShatter(x, y) { this.combatParticles?.spawnIceShatter(x, y); }
  spawnCrystalShatter(x, y) { this.combatParticles?.spawnCrystalShatter(x, y); }
  spawnLeafBurst(x, y) { this.combatParticles?.spawnLeafBurst(x, y); }
  spawnMetalSparks(x, y) { this.combatParticles?.spawnMetalSparks(x, y); }
  spawnDustBurst(x, y) { this.combatParticles?.spawnDustBurst(x, y); }
  spawnObstacleHitSpark(x, y, color) { this.combatParticles?.spawnObstacleHitSpark(x, y, color); }

  // ─── DEBRIS SYSTEM ───

  spawnDebris(material, px, py) {
    const newDebris = createDebris(material, px, py);
    this._debris.push(...newDebris);
    // Cap total debris
    while (this._debris.length > DEBRIS_CONFIG.maxDebris) {
      this._debris.shift();
    }
  }

  _updateDebris() {
    if (this._debris.length === 0) return;
    const g = this._debrisGfx;
    g.clear();

    const groundY = this.H - 10;
    const dead = updateDebris(this._debris, groundY);

    // Remove dead debris (reverse order to preserve indices)
    for (let i = dead.length - 1; i >= 0; i--) {
      this._debris.splice(dead[i], 1);
    }

    // Render surviving debris
    for (const d of this._debris) {
      const lifeRatio = d.life / d.maxLife;
      const alpha = lifeRatio < 0.2 ? lifeRatio / 0.2 : 1; // fade out in last 20%

      if (d.shape === "diamond") {
        const s = d.size;
        const pts = [
          d.x, d.y - s,
          d.x + s * 0.6, d.y,
          d.x, d.y + s,
          d.x - s * 0.6, d.y,
        ];
        g.poly(pts);
        g.fill({ color: d.color, alpha: alpha * 0.8 });
      } else if (d.shape === "circle") {
        g.circle(d.x, d.y, d.size);
        g.fill({ color: d.color, alpha: alpha * 0.7 });
      } else {
        // rect with rotation
        const cos = Math.cos(d.rotation), sin = Math.sin(d.rotation);
        const hw = d.size, hh = d.size * 0.4;
        const pts = [
          d.x + (-hw * cos - (-hh) * sin), d.y + (-hw * sin + (-hh) * cos),
          d.x + (hw * cos - (-hh) * sin),  d.y + (hw * sin + (-hh) * cos),
          d.x + (hw * cos - hh * sin),     d.y + (hw * sin + hh * cos),
          d.x + (-hw * cos - hh * sin),    d.y + (-hw * sin + hh * cos),
        ];
        g.poly(pts);
        g.fill({ color: d.color, alpha: alpha * 0.8 });
      }
    }
  }

  // ─── GROUND MARKS ───

  addGroundMark(px, py, element, damage) {
    const mark = createGroundMark(px, py, element, damage);
    this._groundMarks.push(mark);
    while (this._groundMarks.length > GROUND_MARKS_CONFIG.maxMarks) {
      this._groundMarks.shift();
    }
  }

  _updateGroundMarks() {
    if (this._groundMarks.length === 0) return;
    const g = this._groundMarkGfx;
    g.clear();

    const dead = updateGroundMarks(this._groundMarks);

    for (let i = dead.length - 1; i >= 0; i--) {
      this._groundMarks.splice(dead[i], 1);
    }

    for (const m of this._groundMarks) {
      const lifeRatio = m.life / m.maxLife;
      const fadeAlpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
      const color = parseInt(m.style.color.replace(/rgba?\(/, "").split(",").slice(0, 3).map(c => {
        const v = parseInt(c.trim());
        return v.toString(16).padStart(2, "0");
      }).join(""), 16);
      const baseAlpha = m.style.alpha * fadeAlpha;

      // Draw mark as irregular ellipse
      g.ellipse(m.x, m.y, m.radius, m.radius * 0.5);
      g.fill({ color, alpha: baseAlpha * 0.6 });
      // Inner darker core
      g.ellipse(m.x, m.y, m.radius * 0.5, m.radius * 0.25);
      g.fill({ color, alpha: baseAlpha * 0.8 });
    }
  }

  clearDestruction() {
    this._debris = clearDebris();
    this._groundMarks = clearGroundMarks();
    if (this._debrisGfx) this._debrisGfx.clear();
    if (this._groundMarkGfx) this._groundMarkGfx.clear();
  }

  clearNpcs() {
    for (const id of Object.keys(this.characters)) {
      this.removeNpc(parseInt(id));
    }
  }

  destroy() {
    for (const id of Object.keys(this.characters)) {
      this.removeNpc(parseInt(id));
    }
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
    this.ready = false;
  }
}

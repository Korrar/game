// PixiRenderer — WebGL-based renderer replacing Canvas2D for characters/projectiles
// Uses PixiJS v8 Application with per-NPC containers + filters

import { Application, Container, Graphics, Text, TextStyle, BlurFilter } from "pixi.js";
import { CharacterSprite } from "./CharacterSprite.js";
import { ProjectileRenderer } from "./ProjectileRenderer.js";
import { CombatParticles } from "./CombatParticles.js";
import { DamageNumbers } from "./DamageNumbers.js";

export class PixiRenderer {
  constructor() {
    this.app = null;
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

    // Create layers
    this.npcLayer = new Container();
    this.projectileLayer = new Container();
    this.particleLayer = new Container();
    this.uiLayer = new Container();

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

  // ─── RENDER FRAME ───

  render(bodies, projectiles, fogVisibility, playerSkillshots, mines, areaIndicators) {
    if (!this.ready) return;
    this.fogVisibility = fogVisibility || 0;

    // Screen shake
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

      char.update(entry, this.W, this.H, this.GY, this.fogVisibility);
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

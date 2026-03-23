// PixiRenderer — WebGL-based renderer replacing Canvas2D for characters/projectiles
// Uses PixiJS v8 Application with per-NPC containers + filters

import { Application, Container, Graphics, Text, TextStyle, BlurFilter } from "pixi.js";
import { CharacterSprite } from "./CharacterSprite.js";
import { wrapPxToScreen } from "../utils/panoramaWrap.js";
import { worldToScreen, ISO_CONFIG } from "../utils/isometricUtils.js";
import { ProjectileRenderer } from "./ProjectileRenderer.js";
import { CombatParticles } from "./CombatParticles.js";
import { DamageNumbers } from "./DamageNumbers.js";
import { depthFromY, scaleAtDepth, zIndexAtDepth, isoDepthFromWorld, isoZIndex, isoScaleAtDepth } from "./DepthSystem.js";
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
    // Isometric camera
    this._cameraX = 0;
    this._cameraY = 0;
    this._isoMode = true; // enable isometric rendering
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
    this.projectileLayer.sortableChildren = true; // iso depth sorting for projectiles
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

    // Caravan sprite container
    this._caravanGfx = new Graphics();
    this._caravanGfx.visible = false;
    this.npcLayer.addChild(this._caravanGfx);
    this._caravanPos = null; // { wx, wy } world tile coords
    this._caravanHpPct = 1;
    this._caravanLevel = 0;

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

  // Panoramic offset for 360° scrolling (legacy)
  setPanOffset(offset) {
    this._panOffset = offset || 0;
  }

  // ─── CARAVAN MODEL ───
  setCaravan(wx, wy, hpPct, level) {
    this._caravanPos = { wx, wy };
    this._caravanHpPct = Math.max(0, Math.min(1, hpPct));
    this._caravanLevel = level || 0;
  }

  _drawCaravan() {
    const gfx = this._caravanGfx;
    if (!gfx || !this._caravanPos) { if (gfx) gfx.visible = false; return; }
    const { wx, wy } = this._caravanPos;
    const screen = worldToScreen(wx, wy, this._cameraX, this._cameraY);
    if (screen.x < -100 || screen.x > this.W + 100 || screen.y < -100 || screen.y > this.H + 100) { gfx.visible = false; return; }

    gfx.visible = true;
    gfx.clear();
    const cx = screen.x, cy = screen.y;
    const lvl = this._caravanLevel;
    const hp = this._caravanHpPct;

    // Hull colors based on level
    const hullColors = [0x6B4226, 0x7A4F30, 0x5C3A1E, 0x4A4A55, 0x3A3A4A, 0xC8A84A];
    const deckColors = [0x8B6B47, 0x9A7B55, 0x7B5B37, 0x6A6A75, 0x5A5A6A, 0xE8C86A];
    const hullCol = hullColors[Math.min(lvl, 5)];
    const deckCol = deckColors[Math.min(lvl, 5)];

    // Ship hull (isometric diamond boat shape)
    gfx.fill({ color: hullCol });
    gfx.moveTo(cx, cy - 30);       // bow (front)
    gfx.lineTo(cx + 22, cy - 8);   // starboard
    gfx.lineTo(cx + 18, cy + 12);  // stern-right
    gfx.lineTo(cx - 18, cy + 12);  // stern-left
    gfx.lineTo(cx - 22, cy - 8);   // port
    gfx.closePath();
    gfx.fill();

    // Deck
    gfx.fill({ color: deckCol });
    gfx.moveTo(cx, cy - 24);
    gfx.lineTo(cx + 16, cy - 6);
    gfx.lineTo(cx + 12, cy + 8);
    gfx.lineTo(cx - 12, cy + 8);
    gfx.lineTo(cx - 16, cy - 6);
    gfx.closePath();
    gfx.fill();

    // Mast
    gfx.setStrokeStyle({ width: 3, color: 0x4A3520 });
    gfx.moveTo(cx, cy - 8);
    gfx.lineTo(cx, cy - 48);
    gfx.stroke();

    // Sail (triangular, with jolly roger vibe)
    const sailCol = hp > 0.5 ? 0xF5E6C8 : hp > 0.25 ? 0xD4C0A0 : 0xB09878;
    gfx.fill({ color: sailCol, alpha: 0.9 });
    gfx.moveTo(cx + 1, cy - 45);
    gfx.lineTo(cx + 18, cy - 20);
    gfx.lineTo(cx + 1, cy - 15);
    gfx.closePath();
    gfx.fill();

    // Skull on sail (level 2+)
    if (lvl >= 2) {
      gfx.fill({ color: 0x222222, alpha: 0.7 });
      gfx.circle(cx + 8, cy - 30, 3);
      gfx.fill();
    }

    // Second mast (level 3+)
    if (lvl >= 3) {
      gfx.setStrokeStyle({ width: 2, color: 0x4A3520 });
      gfx.moveTo(cx - 6, cy - 4);
      gfx.lineTo(cx - 6, cy - 36);
      gfx.stroke();
      gfx.fill({ color: sailCol, alpha: 0.85 });
      gfx.moveTo(cx - 5, cy - 33);
      gfx.lineTo(cx - 18, cy - 15);
      gfx.lineTo(cx - 5, cy - 10);
      gfx.closePath();
      gfx.fill();
    }

    // Armor plating (level 4+)
    if (lvl >= 4) {
      gfx.setStrokeStyle({ width: 1.5, color: 0x888899 });
      gfx.moveTo(cx + 20, cy - 4); gfx.lineTo(cx + 16, cy + 10); gfx.stroke();
      gfx.moveTo(cx - 20, cy - 4); gfx.lineTo(cx - 16, cy + 10); gfx.stroke();
    }

    // Gold trim (level 5)
    if (lvl >= 5) {
      gfx.setStrokeStyle({ width: 1, color: 0xFFD700 });
      gfx.moveTo(cx, cy - 30);
      gfx.lineTo(cx + 22, cy - 8); gfx.lineTo(cx + 18, cy + 12);
      gfx.lineTo(cx - 18, cy + 12); gfx.lineTo(cx - 22, cy - 8);
      gfx.closePath();
      gfx.stroke();
    }

    // HP bar above ship
    const barW = 40, barH = 4;
    const barX = cx - barW / 2, barY = cy - 55;
    gfx.fill({ color: 0x000000, alpha: 0.6 });
    gfx.roundRect(barX, barY, barW, barH, 2);
    gfx.fill();
    const hpColor = hp > 0.5 ? 0x40C040 : hp > 0.25 ? 0xC0C040 : 0xC04040;
    gfx.fill({ color: hpColor });
    gfx.roundRect(barX, barY, barW * hp, barH, 2);
    gfx.fill();

    // Damage fire particles (low HP)
    if (hp < 0.4 && Math.random() < 0.3) {
      const fx = cx + (Math.random() - 0.5) * 20;
      const fy = cy - 10 + (Math.random() - 0.5) * 15;
      gfx.fill({ color: 0xFF6020, alpha: 0.6 });
      gfx.circle(fx, fy, 2 + Math.random() * 2);
      gfx.fill();
    }

    // Z-ordering: keep caravan slightly below enemies at same depth
    gfx.zIndex = Math.max(0, isoZIndex(wx, wy) - 1);
  }

  // Isometric camera position
  setIsoCamera(cameraX, cameraY) {
    this._cameraX = cameraX || 0;
    this._cameraY = cameraY || 0;
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

      if (this._isoMode) {
        // Isometric: position from world coords
        const wx = entry._wx ?? 20;
        const wy = entry._wy ?? 20;
        const isoDepth = isoDepthFromWorld(wx, wy);
        const depthScale = isoScaleAtDepth(wx, wy);
        char.container.zIndex = isoZIndex(wx, wy);

        const screen = worldToScreen(wx, wy, this._cameraX, this._cameraY);
        char.container.x = 0;
        char.container.y = 0;
        char.update(entry, this.W, this.H, this.GY, this.fogVisibility, isoDepth, depthScale);

        // Offset container so physics-space sprites appear at iso screen position
        const npcWorldPx = entry._px ?? 0;
        // Get torso physics Y to compute Y offset
        const torsoBody = entry.limbBodies?.torso;
        const npcWorldPy = torsoBody ? torsoBody.translation().y : this.GY;
        char.container.x = screen.x - npcWorldPx;
        char.container.y = screen.y - npcWorldPy;
        char.container.visible = (
          screen.x > -100 && screen.x < this.W + 100 &&
          screen.y > -100 && screen.y < this.H + 100
        );
      } else {
        // Legacy 2.5D panoramic mode
        const yPct = entry._yPct ?? 65;
        const depth = depthFromY(yPct);
        const depthScale = scaleAtDepth(depth);
        char.container.zIndex = zIndexAtDepth(depth);

        char.container.x = 0;
        char.update(entry, this.W, this.H, this.GY, this.fogVisibility, depth, depthScale);

        const panOff = this._panOffset || 0;
        const npcWorldX = entry._px ?? 0;
        const screenX = wrapPxToScreen(npcWorldX, panOff, this.W);
        if (screenX !== null) {
          char.container.x = screenX - npcWorldX;
          char.container.visible = true;
        } else {
          char.container.visible = false;
        }
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

    // Update projectiles, particles, damage numbers
    if (this._isoMode) {
      this.projectileRenderer.updateIso(projectiles, playerSkillshots, mines, areaIndicators, this._cameraX, this._cameraY, this.W);
      this.combatParticles.updateIso(this._cameraX, this._cameraY, this.W);
      this.damageNumbers.updateIso(this._cameraX, this._cameraY, this.W);
    } else {
      this.projectileRenderer.update(projectiles, playerSkillshots, mines, areaIndicators, this._panOffset || 0, this.W);
      this.combatParticles.update(this._panOffset || 0, this.W);
      this.damageNumbers.update(this._panOffset || 0, this.W);
    }

    // Draw caravan model
    this._drawCaravan();

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
  spawnEnemyAttackWarn(x, y) { this.combatParticles?.spawnEnemyAttackWarn(x, y); }
  spawnMeleeSlashTrail(x, y, dir) { this.combatParticles?.spawnMeleeSlashTrail(x, y, dir); }
  spawnChargeTrail(x, y) { this.combatParticles?.spawnChargeTrail(x, y); }
  spawnRangedChargeUp(x, y, element) { this.combatParticles?.spawnRangedChargeUp(x, y, element); }
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

    // Render surviving debris (with panoramic wrapping or iso)
    const panOff = this._panOffset || 0;
    for (const d of this._debris) {
      let sx, debrisY = d.y;
      if (this._isoMode) {
        // Convert physics pixel coords to iso world tiles
        const dwx = d.wx ?? (d.x / this.W) * ISO_CONFIG.MAP_COLS;
        const dwy = d.wy ?? (d.y / this.H) * ISO_CONFIG.MAP_ROWS;
        const screen = worldToScreen(dwx, dwy, this._cameraX, this._cameraY);
        sx = screen.x;
        debrisY = screen.y;
      } else {
        sx = panOff ? wrapPxToScreen(d.x, panOff, this.W) : d.x;
      }
      if (sx === null || sx < -50 || sx > this.W + 50) continue;
      const lifeRatio = d.life / d.maxLife;
      const alpha = lifeRatio < 0.2 ? lifeRatio / 0.2 : 1; // fade out in last 20%

      if (d.shape === "diamond") {
        const s = d.size;
        const pts = [
          sx, debrisY - s,
          sx + s * 0.6, debrisY,
          sx, debrisY + s,
          sx - s * 0.6, debrisY,
        ];
        g.poly(pts);
        g.fill({ color: d.color, alpha: alpha * 0.8 });
      } else if (d.shape === "circle") {
        g.circle(sx, debrisY, d.size);
        g.fill({ color: d.color, alpha: alpha * 0.7 });
      } else {
        // rect with rotation
        const cos = Math.cos(d.rotation), sin = Math.sin(d.rotation);
        const hw = d.size, hh = d.size * 0.4;
        const pts = [
          sx + (-hw * cos - (-hh) * sin), debrisY + (-hw * sin + (-hh) * cos),
          sx + (hw * cos - (-hh) * sin),  debrisY + (hw * sin + (-hh) * cos),
          sx + (hw * cos - hh * sin),     debrisY + (hw * sin + hh * cos),
          sx + (-hw * cos - hh * sin),    debrisY + (-hw * sin + hh * cos),
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

    const gmPanOff = this._panOffset || 0;
    for (const m of this._groundMarks) {
      let mx, markY = m.y;
      if (this._isoMode) {
        const mwx = m.wx ?? (m.x / this.W) * ISO_CONFIG.MAP_COLS;
        const mwy = m.wy ?? (m.y / this.H) * ISO_CONFIG.MAP_ROWS;
        const screen = worldToScreen(mwx, mwy, this._cameraX, this._cameraY);
        mx = screen.x;
        markY = screen.y;
      } else {
        mx = gmPanOff ? wrapPxToScreen(m.x, gmPanOff, this.W) : m.x;
      }
      if (mx === null || mx < -50 || mx > this.W + 50) continue;
      const lifeRatio = m.life / m.maxLife;
      const fadeAlpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
      const color = parseInt(m.style.color.replace(/rgba?\(/, "").split(",").slice(0, 3).map(c => {
        const v = parseInt(c.trim());
        return v.toString(16).padStart(2, "0");
      }).join(""), 16);
      const baseAlpha = m.style.alpha * fadeAlpha;

      // Draw mark as irregular ellipse
      g.ellipse(mx, markY, m.radius, m.radius * 0.5);
      g.fill({ color, alpha: baseAlpha * 0.6 });
      // Inner darker core
      g.ellipse(mx, markY, m.radius * 0.5, m.radius * 0.25);
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

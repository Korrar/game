// ProjectileRenderer — PixiJS-based projectile rendering with enhanced glow effects
import { Container, Graphics } from "pixi.js";
import { wrapPxToScreen } from "../utils/panoramaWrap.js";

export class ProjectileRenderer {
  constructor(layer) {
    this.layer = layer;
    this.sprites = new Map(); // projectile ref → Graphics
    this._panOffset = 0;
    this._gameW = 1280;
  }

  update(projectiles, playerSkillshots, mines, areaIndicators, panOffset, gameW) {
    if (panOffset !== undefined) this._panOffset = panOffset;
    if (gameW !== undefined) this._gameW = gameW;
    // Combine all active objects into one set
    const allActive = new Set([
      ...projectiles,
      ...(playerSkillshots || []),
      ...(mines || []),
      ...(areaIndicators || []),
    ]);

    // Remove sprites for objects that no longer exist
    for (const [proj, gfx] of this.sprites) {
      if (!allActive.has(proj)) {
        this.layer.removeChild(gfx);
        gfx.destroy();
        this.sprites.delete(proj);
      }
    }

    const po = this._panOffset;
    const gw = this._gameW;

    // Draw/update each NPC projectile
    for (const proj of projectiles) {
      let gfx = this.sprites.get(proj);
      if (!gfx) {
        gfx = new Graphics();
        this.sprites.set(proj, gfx);
        this.layer.addChild(gfx);
      }
      gfx.clear();
      this._drawProjectile(gfx, proj);
      this._applyPan(gfx, proj.x, po, gw);
    }

    // Draw player skillshot projectiles
    if (playerSkillshots) {
      for (const proj of playerSkillshots) {
        let gfx = this.sprites.get(proj);
        if (!gfx) {
          gfx = new Graphics();
          this.sprites.set(proj, gfx);
          this.layer.addChild(gfx);
        }
        gfx.clear();
        this._drawSkillshot(gfx, proj);
        this._applyPan(gfx, proj.x, po, gw);
      }
    }

    // Draw mines
    if (mines) {
      for (const mine of mines) {
        let gfx = this.sprites.get(mine);
        if (!gfx) {
          gfx = new Graphics();
          this.sprites.set(mine, gfx);
          this.layer.addChild(gfx);
        }
        gfx.clear();
        this._drawMine(gfx, mine);
        this._applyPan(gfx, mine.x, po, gw);
      }
    }

    // Draw area indicators
    if (areaIndicators) {
      for (const ind of areaIndicators) {
        let gfx = this.sprites.get(ind);
        if (!gfx) {
          gfx = new Graphics();
          this.sprites.set(ind, gfx);
          this.layer.addChild(gfx);
        }
        gfx.clear();
        this._drawAreaIndicator(gfx, ind);
        this._applyPan(gfx, ind.x, po, gw);
      }
    }
  }

  // Offset Graphics container so world-space drawing appears at correct screen position
  _applyPan(gfx, worldX, panOffset, gameW) {
    if (!panOffset) {
      gfx.position.x = 0;
      gfx.visible = true;
      return;
    }
    const screenX = wrapPxToScreen(worldX, panOffset, gameW);
    if (screenX !== null) {
      gfx.position.x = screenX - worldX;
      gfx.visible = true;
    } else {
      gfx.visible = false;
    }
  }

  _drawProjectile(g, proj) {
    const vx = proj.vx || 0;
    const vy = proj.vy || 0;
    const projAge = proj.age || 0;
    const angle = Math.atan2(vy, vx);

    switch (proj.type) {
      case "arrow": {
        // Bullet — metallic slug with muzzle flash trail
        const cos = Math.cos(angle), sin = Math.sin(angle);
        // Smoke trail
        g.setStrokeStyle({ width: 3, color: 0x808080, alpha: 0.25 });
        g.moveTo(proj.x - cos * 12, proj.y - sin * 12);
        g.lineTo(proj.x - cos * 6, proj.y - sin * 6);
        g.stroke();
        // Bullet body — metallic
        g.setStrokeStyle({ width: 3.5, color: 0xc0b090, cap: "round" });
        g.moveTo(proj.x - cos * 4, proj.y - sin * 4);
        g.lineTo(proj.x + cos * 4, proj.y + sin * 4);
        g.stroke();
        // Bullet tip — bright
        g.circle(proj.x + cos * 4, proj.y + sin * 4, 1.5);
        g.fill({ color: 0xffe0a0 });
        // Muzzle flash glow
        g.circle(proj.x, proj.y, 5);
        g.fill({ color: 0xffa040, alpha: 0.15 });
        break;
      }
      case "fireball_npc": {
        const r = 5 + Math.sin(projAge * 0.5) * 1.5;
        // Outer glow
        g.circle(proj.x, proj.y, r * 3);
        g.fill({ color: 0xff6414, alpha: 0.1 });
        // Mid glow
        g.circle(proj.x, proj.y, r * 1.8);
        g.fill({ color: 0xffa028, alpha: 0.3 });
        // Core
        g.circle(proj.x, proj.y, r);
        g.fill({ color: 0xffc850, alpha: 0.95 });
        // Hot center
        g.circle(proj.x, proj.y, r * 0.35);
        g.fill({ color: 0xffffc8, alpha: 0.5 });
        break;
      }
      case "iceShard_npc": {
        const cos = Math.cos(angle + projAge * 0.2);
        const sin = Math.sin(angle + projAge * 0.2);
        // Glow
        g.circle(proj.x, proj.y, 8);
        g.fill({ color: 0x80d0ff, alpha: 0.15 });
        // Shard
        g.moveTo(proj.x - sin * 6, proj.y + cos * 6);
        g.lineTo(proj.x + cos * 2, proj.y + sin * 2);
        g.lineTo(proj.x + sin * 6, proj.y - cos * 6);
        g.lineTo(proj.x - cos * 2, proj.y - sin * 2);
        g.closePath();
        g.fill({ color: 0x8cdcff, alpha: 0.85 });
        break;
      }
      case "poisonSpit": {
        // Glow
        g.circle(proj.x, proj.y, 10);
        g.fill({ color: 0x3cb428, alpha: 0.15 });
        // Core
        g.circle(proj.x, proj.y, 5);
        g.fill({ color: 0x50c83c, alpha: 0.8 });
        // Droplets
        for (let i = 0; i < 3; i++) {
          const a = Date.now() * 0.003 + i * 2.1;
          g.circle(proj.x + Math.cos(a) * 6, proj.y + Math.sin(a) * 6, 1.5);
          g.fill({ color: 0x3cb428, alpha: 0.5 });
        }
        break;
      }
      case "shadowBolt_npc": {
        // Glow
        g.circle(proj.x, proj.y, 14);
        g.fill({ color: 0x641eb4, alpha: 0.15 });
        // Mid
        g.circle(proj.x, proj.y, 7);
        g.fill({ color: 0x8232c8, alpha: 0.35 });
        // Core
        g.circle(proj.x, proj.y, 4);
        g.fill({ color: 0x8232c8, alpha: 0.85 });
        // Center
        g.circle(proj.x, proj.y, 1.5);
        g.fill({ color: 0xc880ff, alpha: 0.6 });
        break;
      }
      case "mageSpell": {
        // Bomb / alchemist grenade
        const r = 5 + Math.sin(projAge * 0.4) * 1.5;
        // Outer glow — orange for explosive
        g.circle(proj.x, proj.y, r * 4);
        g.fill({ color: 0xff8040, alpha: 0.1 });
        // Inner glow
        g.circle(proj.x, proj.y, r * 2.2);
        g.fill({ color: 0xffa050, alpha: 0.25 });
        // Core — dark bomb shape
        g.circle(proj.x, proj.y, r);
        g.fill({ color: 0x3a3a3a, alpha: 0.95 });
        // Fuse spark
        g.circle(proj.x, proj.y - r * 0.8, 2);
        g.fill({ color: 0xffe040, alpha: 0.7 + Math.sin(projAge * 0.8) * 0.3 });
        // Orbiting sparks
        for (let i = 0; i < 3; i++) {
          const a = Date.now() * 0.005 + i * Math.PI * 0.67;
          const sx = proj.x + Math.cos(a) * (r * 1.3);
          const sy = proj.y + Math.sin(a) * (r * 1.3);
          g.circle(sx, sy, 1);
          g.fill({ color: 0xffa020, alpha: 0.5 });
        }
        break;
      }
    }
  }

  // ─── PLAYER SKILLSHOT RENDERING ───

  _drawSkillshot(g, proj) {
    const vx = proj.vx || 0;
    const vy = proj.vy || 0;
    const age = proj.age || 0;
    const angle = Math.atan2(vy, vx);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const size = proj.size || 8;

    switch (proj.spellId) {
      case "fireball": {
        // Dynamite — arc trajectory with lit fuse, spinning sparks, smoke trail
        const r = size + Math.sin(age * 0.6) * 2;
        const spin = age * 0.15;
        // Smoke trail — fading puffs behind
        for (let i = 0; i < 3; i++) {
          const d = (i + 1) * 8;
          g.circle(proj.x - cos * d, proj.y - sin * d, 3 - i * 0.7);
          g.fill({ color: 0x808080, alpha: 0.12 - i * 0.03 });
        }
        // Spark trail — bright orange
        g.setStrokeStyle({ width: 2, color: 0xff8020, alpha: 0.5 });
        g.moveTo(proj.x - cos * r * 2.5, proj.y - sin * r * 2.5);
        g.lineTo(proj.x - cos * r * 1.2, proj.y - sin * r * 1.2);
        g.stroke();
        // Outer glow — pulsing danger
        g.circle(proj.x, proj.y, r * 2.8);
        g.fill({ color: 0xff4010, alpha: 0.08 + Math.sin(age * 0.5) * 0.04 });
        // Red stick body
        g.circle(proj.x, proj.y, r);
        g.fill({ color: 0x8b2010, alpha: 0.95 });
        // Paper wrap lines
        g.setStrokeStyle({ width: 1, color: 0xc06040, alpha: 0.4 });
        g.moveTo(proj.x - r * 0.6, proj.y - r * 0.3);
        g.lineTo(proj.x + r * 0.6, proj.y + r * 0.3);
        g.stroke();
        // Fuse spark — bright flickering
        const fuseX = proj.x - cos * r * 0.9;
        const fuseY = proj.y - sin * r * 0.9;
        g.circle(fuseX, fuseY, 3.5);
        g.fill({ color: 0xffe040, alpha: 0.9 + Math.sin(age * 1.5) * 0.1 });
        g.circle(fuseX, fuseY, 1.5);
        g.fill({ color: 0xffffff, alpha: 0.7 });
        // Flying sparks around fuse
        for (let i = 0; i < 4; i++) {
          const a = spin + i * 1.57;
          const sr = 5 + Math.sin(age * 0.3 + i) * 2;
          g.circle(fuseX + Math.cos(a) * sr, fuseY + Math.sin(a) * sr, 1.2);
          g.fill({ color: 0xffa020, alpha: 0.6 });
        }
        break;
      }
      case "lightning": {
        // Sniper shot — fast thin beam
        const len = 16;
        // Bright beam trail
        g.setStrokeStyle({ width: 1.5, color: 0xffff80, alpha: 0.6 });
        g.moveTo(proj.x - cos * len * 2, proj.y - sin * len * 2);
        g.lineTo(proj.x - cos * len, proj.y - sin * len);
        g.stroke();
        // Bullet line
        g.setStrokeStyle({ width: 2.5, color: 0xf0e060, cap: "round" });
        g.moveTo(proj.x - cos * len * 0.5, proj.y - sin * len * 0.5);
        g.lineTo(proj.x + cos * len * 0.5, proj.y + sin * len * 0.5);
        g.stroke();
        // Tip flash
        g.circle(proj.x + cos * len * 0.5, proj.y + sin * len * 0.5, 2);
        g.fill({ color: 0xffffff, alpha: 0.8 });
        // Glow
        g.circle(proj.x, proj.y, 6);
        g.fill({ color: 0xf0e060, alpha: 0.15 });
        break;
      }
      case "icelance": {
        // Harpoon — long barbed spear with rope trail
        const len = 16;
        // Rope trail — wavy line behind
        g.setStrokeStyle({ width: 1.5, color: 0x8a7040, alpha: 0.35 });
        const ropeLen = 25;
        let rx = proj.x - cos * len;
        let ry = proj.y - sin * len;
        g.moveTo(rx, ry);
        for (let i = 1; i <= 4; i++) {
          const waveOff = Math.sin(age * 0.12 + i * 1.5) * 3;
          rx -= cos * (ropeLen / 4);
          ry -= sin * (ropeLen / 4);
          g.lineTo(rx - sin * waveOff, ry + cos * waveOff);
        }
        g.stroke();
        // Wooden shaft
        g.setStrokeStyle({ width: 3.5, color: 0x7a5a2a, cap: "round" });
        g.moveTo(proj.x - cos * len, proj.y - sin * len);
        g.lineTo(proj.x + cos * 2, proj.y + sin * 2);
        g.stroke();
        // Shaft highlight
        g.setStrokeStyle({ width: 1, color: 0xa08040, alpha: 0.4 });
        g.moveTo(proj.x - cos * len * 0.8, proj.y - sin * len * 0.8 - 1);
        g.lineTo(proj.x, proj.y - 1);
        g.stroke();
        // Metal head — barbed triangle
        const tipX = proj.x + cos * len * 0.9;
        const tipY = proj.y + sin * len * 0.9;
        g.moveTo(tipX, tipY);
        g.lineTo(proj.x + cos * 2 - sin * 4, proj.y + sin * 2 + cos * 4);
        g.lineTo(proj.x + cos * 2 + sin * 4, proj.y + sin * 2 - cos * 4);
        g.closePath();
        g.fill({ color: 0xc8d8e8, alpha: 0.95 });
        // Barbs
        const barbX = proj.x + cos * 4;
        const barbY = proj.y + sin * 4;
        g.moveTo(barbX, barbY);
        g.lineTo(barbX - sin * 5 - cos * 3, barbY + cos * 5 - sin * 3);
        g.lineTo(barbX - cos * 2, barbY - sin * 2);
        g.closePath();
        g.fill({ color: 0xa0b0c0, alpha: 0.7 });
        // Metallic glint on tip
        g.circle(tipX, tipY, 2);
        g.fill({ color: 0xffffff, alpha: 0.5 + Math.sin(age * 0.3) * 0.2 });
        // Subtle ice glow
        g.circle(proj.x, proj.y, 10);
        g.fill({ color: 0x40c0ff, alpha: 0.08 });
        break;
      }
      case "meteor": {
        // Salwa Armatnia — fiery cannonball with blazing trail
        const r = size;
        // Fire trail — multiple fading circles behind
        for (let i = 0; i < 4; i++) {
          const d = (i + 1) * 7;
          const trailR = (4 - i) * 1.2;
          g.circle(proj.x - cos * d, proj.y - sin * d, trailR);
          g.fill({ color: 0xff6020, alpha: 0.2 - i * 0.04 });
        }
        // Smoke trail
        for (let i = 0; i < 3; i++) {
          const d = (i + 1) * 10 + 8;
          g.circle(proj.x - cos * d, proj.y - sin * d, 3 - i * 0.6);
          g.fill({ color: 0x606060, alpha: 0.12 - i * 0.03 });
        }
        // Outer heat glow
        g.circle(proj.x, proj.y, r * 2.5);
        g.fill({ color: 0xff4010, alpha: 0.12 });
        // Mid glow
        g.circle(proj.x, proj.y, r * 1.6);
        g.fill({ color: 0xff8030, alpha: 0.2 });
        // Iron ball core
        g.circle(proj.x, proj.y, r);
        g.fill({ color: 0x2a2a2a, alpha: 0.95 });
        // Metallic highlight
        g.circle(proj.x - r * 0.2, proj.y - r * 0.3, r * 0.35);
        g.fill({ color: 0x606060, alpha: 0.4 });
        // Hot glow on front
        g.circle(proj.x + cos * r * 0.3, proj.y + sin * r * 0.3, r * 0.5);
        g.fill({ color: 0xff6020, alpha: 0.3 + Math.sin(age * 0.8) * 0.1 });
        break;
      }
      case "drain": {
        // Piracki Haracz — skull-shaped shadow bolt with draining tendrils
        const r = size;
        // Outer shadow aura — pulsing
        g.circle(proj.x, proj.y, r * 2.5);
        g.fill({ color: 0x800040, alpha: 0.08 + Math.sin(age * 0.4) * 0.04 });
        // Swirling tendrils — draining energy
        for (let i = 0; i < 5; i++) {
          const a = age * 0.1 + i * 1.26;
          const tr = r * 1.5 + Math.sin(age * 0.15 + i) * 3;
          g.circle(proj.x + Math.cos(a) * tr, proj.y + Math.sin(a) * tr, 2);
          g.fill({ color: 0xc02060, alpha: 0.4 });
          // Connecting tendril line
          g.setStrokeStyle({ width: 1, color: 0xc02060, alpha: 0.2 });
          g.moveTo(proj.x, proj.y);
          g.lineTo(proj.x + Math.cos(a) * tr, proj.y + Math.sin(a) * tr);
          g.stroke();
        }
        // Dark core
        g.circle(proj.x, proj.y, r * 1.2);
        g.fill({ color: 0x601030, alpha: 0.7 });
        // Inner crimson
        g.circle(proj.x, proj.y, r * 0.7);
        g.fill({ color: 0xc02060, alpha: 0.85 });
        // Bright center
        g.circle(proj.x, proj.y, r * 0.3);
        g.fill({ color: 0xff80a0, alpha: 0.6 });
        // Gold coin sparkle (pirate theme)
        const sparkAngle = age * 0.2;
        g.circle(proj.x + Math.cos(sparkAngle) * r * 0.4, proj.y + Math.sin(sparkAngle) * r * 0.4, 1.5);
        g.fill({ color: 0xffd700, alpha: 0.5 + Math.sin(age * 0.6) * 0.3 });
        break;
      }
      case "chainlightning": {
        // Rykoszet — spinning chain-link bullet with electric arcs
        const r = size;
        // Electric outer glow
        g.circle(proj.x, proj.y, r * 3.5);
        g.fill({ color: 0xe0e040, alpha: 0.08 + Math.sin(age * 0.6) * 0.04 });
        // Chain links orbiting — visual chain effect
        for (let i = 0; i < 3; i++) {
          const a = age * 0.25 + i * 2.09;
          const cr = r * 1.5;
          const cx = proj.x + Math.cos(a) * cr;
          const cy = proj.y + Math.sin(a) * cr;
          // Link shape (small oval)
          g.setStrokeStyle({ width: 1.5, color: 0xc0b080, alpha: 0.6 });
          g.circle(cx, cy, 2);
          g.stroke();
        }
        // Lightning arcs — jagged lines
        for (let i = 0; i < 3; i++) {
          const a = age * 0.18 + i * 2.09;
          const ex = proj.x + Math.cos(a) * r * 2.5;
          const ey = proj.y + Math.sin(a) * r * 2.5;
          g.setStrokeStyle({ width: 1.2, color: 0xffff40, alpha: 0.35 });
          const midX = (proj.x + ex) / 2 + (Math.random() - 0.5) * 4;
          const midY = (proj.y + ey) / 2 + (Math.random() - 0.5) * 4;
          g.moveTo(proj.x, proj.y);
          g.lineTo(midX, midY);
          g.lineTo(ex, ey);
          g.stroke();
        }
        // Metallic core
        g.circle(proj.x, proj.y, r);
        g.fill({ color: 0xd0c060, alpha: 0.9 });
        // White hot center
        g.circle(proj.x, proj.y, r * 0.4);
        g.fill({ color: 0xffffff, alpha: 0.7 });
        break;
      }
      default: {
        // Generic projectile
        g.circle(proj.x, proj.y, size);
        g.fill({ color: 0xffffff, alpha: 0.8 });
        break;
      }
    }
  }

  // ─── MINE RENDERING ───

  _drawMine(g, mine) {
    const armed = mine.armed;
    const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;

    // Mine base
    g.circle(mine.x, mine.y, 10);
    g.fill({ color: armed ? 0x8a6030 : 0x4a3020, alpha: 0.9 });

    // Warning ring
    if (armed) {
      g.circle(mine.x, mine.y, mine.triggerRadius);
      g.fill({ color: 0xff4020, alpha: 0.05 * pulse });
      g.setStrokeStyle({ width: 1, color: 0xff4020, alpha: 0.2 * pulse });
      g.circle(mine.x, mine.y, mine.triggerRadius);
      g.stroke();
    }

    // Blinking light
    g.circle(mine.x, mine.y - 2, 2);
    g.fill({ color: armed ? 0xff2020 : 0x806020, alpha: armed ? pulse : 0.5 });

    // Cross pattern on top
    g.setStrokeStyle({ width: 1.5, color: 0xc0a060, alpha: 0.6 });
    g.moveTo(mine.x - 4, mine.y);
    g.lineTo(mine.x + 4, mine.y);
    g.stroke();
    g.moveTo(mine.x, mine.y - 4);
    g.lineTo(mine.x, mine.y + 4);
    g.stroke();
  }

  // ─── AREA INDICATOR RENDERING ───

  _drawAreaIndicator(g, ind) {
    const now = Date.now();
    const elapsed = now - ind.createdAt;
    const progress = Math.min(1, elapsed / ind.delay);

    // Pulsing danger zone
    const pulse = Math.sin(now * 0.015) * 0.3 + 0.7;

    // Outer danger ring — shrinks as impact approaches
    const outerR = ind.radius * (1.5 - progress * 0.5);
    g.circle(ind.x, ind.y, outerR);
    g.fill({ color: 0xff2020, alpha: 0.05 * pulse });
    g.setStrokeStyle({ width: 2, color: 0xff4020, alpha: 0.3 * pulse });
    g.circle(ind.x, ind.y, outerR);
    g.stroke();

    // Inner fill — grows as impact approaches
    const innerR = ind.radius * progress;
    g.circle(ind.x, ind.y, innerR);
    g.fill({ color: 0xff4020, alpha: 0.08 * progress });

    // Center crosshair
    const cSize = 8;
    g.setStrokeStyle({ width: 1.5, color: 0xff6020, alpha: 0.5 + progress * 0.5 });
    g.moveTo(ind.x - cSize, ind.y);
    g.lineTo(ind.x + cSize, ind.y);
    g.stroke();
    g.moveTo(ind.x, ind.y - cSize);
    g.lineTo(ind.x, ind.y + cSize);
    g.stroke();

    // Impact countdown pulsing
    if (progress > 0.7) {
      const flashAlpha = Math.sin(now * 0.03) * 0.15 + 0.15;
      g.circle(ind.x, ind.y, ind.radius);
      g.fill({ color: 0xff2020, alpha: flashAlpha });
    }
  }
}

// ProjectileRenderer — PixiJS-based projectile rendering with enhanced glow effects
import { Container, Graphics } from "pixi.js";

export class ProjectileRenderer {
  constructor(layer) {
    this.layer = layer;
    this.sprites = new Map(); // projectile ref → Graphics
  }

  update(projectiles) {
    // Remove sprites for projectiles that no longer exist
    const activeSet = new Set(projectiles);
    for (const [proj, gfx] of this.sprites) {
      if (!activeSet.has(proj)) {
        this.layer.removeChild(gfx);
        gfx.destroy();
        this.sprites.delete(proj);
      }
    }

    // Draw/update each projectile
    for (const proj of projectiles) {
      let gfx = this.sprites.get(proj);
      if (!gfx) {
        gfx = new Graphics();
        this.sprites.set(proj, gfx);
        this.layer.addChild(gfx);
      }
      gfx.clear();
      this._drawProjectile(gfx, proj);
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
}

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
    const angle = Math.atan2(proj.vy, proj.vx);

    switch (proj.type) {
      case "arrow": {
        // Shaft
        const cos = Math.cos(angle), sin = Math.sin(angle);
        g.setStrokeStyle({ width: 2, color: 0x8a6a40, cap: "round" });
        g.moveTo(proj.x - cos * 10, proj.y - sin * 10);
        g.lineTo(proj.x + cos * 6, proj.y + sin * 6);
        g.stroke();
        // Arrowhead
        g.moveTo(proj.x + cos * 8, proj.y + sin * 8);
        g.lineTo(proj.x + cos * 4 - sin * 3, proj.y + sin * 4 + cos * 3);
        g.lineTo(proj.x + cos * 4 + sin * 3, proj.y + sin * 4 - cos * 3);
        g.closePath();
        g.fill({ color: 0xb0b8c0 });
        // Fletching
        g.setStrokeStyle({ width: 1, color: 0xc0a060 });
        g.moveTo(proj.x - cos * 10, proj.y - sin * 10);
        g.lineTo(proj.x - cos * 12 - sin * 3, proj.y - sin * 12 + cos * 3);
        g.moveTo(proj.x - cos * 10, proj.y - sin * 10);
        g.lineTo(proj.x - cos * 12 + sin * 3, proj.y - sin * 12 - cos * 3);
        g.stroke();
        break;
      }
      case "fireball_npc": {
        const r = 5 + Math.sin(proj.age * 0.5) * 1.5;
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
        const cos = Math.cos(angle + proj.age * 0.2);
        const sin = Math.sin(angle + proj.age * 0.2);
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
        const r = 5 + Math.sin(proj.age * 0.4) * 1.5;
        // Outer glow
        g.circle(proj.x, proj.y, r * 4);
        g.fill({ color: 0x8c50dc, alpha: 0.1 });
        // Inner glow
        g.circle(proj.x, proj.y, r * 2.2);
        g.fill({ color: 0xa064f0, alpha: 0.25 });
        // Core
        g.circle(proj.x, proj.y, r);
        g.fill({ color: 0xb482ff, alpha: 0.95 });
        // Hot center
        g.circle(proj.x, proj.y, r * 0.4);
        g.fill({ color: 0xffffff, alpha: 0.35 });
        // Orbiting sparkles
        for (let i = 0; i < 4; i++) {
          const a = Date.now() * 0.005 + i * Math.PI * 0.5;
          const sx = proj.x + Math.cos(a) * (r * 1.5);
          const sy = proj.y + Math.sin(a) * (r * 1.5);
          g.circle(sx, sy, 1);
          g.fill({ color: 0xd0b0ff, alpha: 0.5 });
        }
        break;
      }
    }
  }
}

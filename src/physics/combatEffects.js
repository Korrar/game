// Combat visual effects – blood, fire, ice, shadow, holy, melee sparks
// Pool-based particle system rendered on the physics canvas

const _isMobile = ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900;
const MAX_PARTICLES = _isMobile ? 100 : 250;

class Particle {
  constructor() { this.alive = false; }
}

export class CombatEffects {
  constructor() {
    this.particles = [];
    this.mobile = _isMobile;
    for (let i = 0; i < MAX_PARTICLES; i++) this.particles.push(new Particle());
  }

  // Scale particle counts for mobile
  _c(count) {
    return this.mobile ? Math.ceil(count * 0.5) : count;
  }

  _spawn(props) {
    for (const p of this.particles) {
      if (!p.alive) {
        p.alive = true;
        p.age = 0;
        Object.assign(p, props);
        return p;
      }
    }
    return null;
  }

  // ─── BLOOD ───
  spawnBlood(x, y, dirX, intensity = 1) {
    const count = this._c(Math.floor(12 + intensity * 18));
    for (let i = 0; i < count; i++) {
      const angle = (dirX > 0 ? 0.3 : Math.PI - 0.3) + (Math.random() - 0.5) * 1.5;
      const speed = 2 + Math.random() * 5 * intensity;
      this._spawn({
        type: "blood",
        x, y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2 - Math.random() * 3,
        size: 1 + Math.random() * 2.5,
        maxAge: 80 + Math.floor(Math.random() * 60),
        bounced: false,
        r: 140 + Math.floor(Math.random() * 80),
        g: Math.floor(Math.random() * 20),
        b: Math.floor(Math.random() * 20),
      });
    }
  }

  // ─── FIRE ───
  spawnFire(x, y) {
    const count = this._c(20);
    for (let i = 0; i < count; i++) {
      this._spawn({
        type: "fire",
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 3,
        vy: -(1.5 + Math.random() * 4),
        size: 2 + Math.random() * 4,
        maxAge: 40 + Math.floor(Math.random() * 30),
        hue: 15 + Math.random() * 30,
      });
    }
  }

  // ─── ICE SHARDS ───
  spawnIceShards(x, y, dirX) {
    const count = this._c(14);
    for (let i = 0; i < count; i++) {
      const angle = (dirX > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 2;
      const speed = 2 + Math.random() * 4;
      this._spawn({
        type: "ice",
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        size: 2 + Math.random() * 4,
        maxAge: 50 + Math.floor(Math.random() * 30),
      });
    }
  }

  // ─── SHADOW MIST ───
  spawnShadowMist(x, y) {
    const count = this._c(16);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this._spawn({
        type: "shadow",
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: -(0.5 + Math.random() * 2),
        size: 3 + Math.random() * 6,
        maxAge: 60 + Math.floor(Math.random() * 40),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // ─── HOLY LIGHT ───
  spawnHolyLight(x, y) {
    const count = this._c(12);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this._spawn({
        type: "holy",
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        maxAge: 35 + Math.floor(Math.random() * 20),
      });
    }
  }

  // ─── MELEE SPARKS ───
  spawnMeleeSparks(x, y, dirX) {
    const count = this._c(10);
    for (let i = 0; i < count; i++) {
      const angle = (dirX > 0 ? -0.3 : Math.PI + 0.3) + (Math.random() - 0.5) * 1.8;
      const speed = 3 + Math.random() * 5;
      this._spawn({
        type: "spark",
        x, y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 1 + Math.random() * 2,
        maxAge: 20 + Math.floor(Math.random() * 15),
      });
    }
  }

  // ─── FIRE BREATH (cone of fire) ───
  spawnFireBreath(x, y, dirX) {
    const count = this._c(18);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const speed = 3 + Math.random() * 5;
      this._spawn({
        type: "fire",
        x: x + dirX * 8,
        y: y + (Math.random() - 0.5) * 12,
        vx: dirX * speed + Math.sin(spread) * 2,
        vy: spread * 2 - 1,
        size: 2 + Math.random() * 4,
        maxAge: 25 + Math.floor(Math.random() * 20),
        hue: 10 + Math.random() * 35,
      });
    }
  }

  // ─── POISON CLOUD ───
  spawnPoisonCloud(x, y) {
    const count = this._c(12);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.5;
      this._spawn({
        type: "poison",
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: -(0.3 + Math.random() * 1.5),
        size: 3 + Math.random() * 5,
        maxAge: 50 + Math.floor(Math.random() * 30),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // ─── ARROW TRAIL ───
  spawnArrowTrail(x, y, vx, vy) {
    const count = this.mobile ? 2 : 4;
    for (let i = 0; i < count; i++) {
      this._spawn({
        type: "arrowTrail",
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 3,
        vx: -vx * 0.05 + (Math.random() - 0.5) * 0.5,
        vy: -vy * 0.05 + (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 1.5,
        maxAge: 15 + Math.floor(Math.random() * 10),
      });
    }
  }

  // ─── WATER/ICE SPLASH (ocean biome) ───
  spawnWaterSplash(x, y) {
    const count = this._c(10);
    for (let i = 0; i < count; i++) {
      this._spawn({
        type: "water",
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -(2 + Math.random() * 4),
        size: 1.5 + Math.random() * 2.5,
        maxAge: 40 + Math.floor(Math.random() * 20),
      });
    }
  }

  // ─── UPDATE + RENDER ───
  update(ctx, groundY) {
    const GRAVITY = 0.15;

    for (const p of this.particles) {
      if (!p.alive) continue;
      p.age++;
      if (p.age > p.maxAge) { p.alive = false; continue; }

      const t = p.age / p.maxAge;
      const alpha = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;

      switch (p.type) {
        case "blood": {
          p.vy += GRAVITY;
          p.vx *= 0.98;
          p.x += p.vx;
          p.y += p.vy;
          // Bounce on ground
          if (p.y > groundY && !p.bounced) {
            p.vy = -Math.abs(p.vy) * 0.3;
            p.vx *= 0.5;
            p.y = groundY;
            p.bounced = true;
          }
          // Pool on ground
          if (p.bounced && p.y >= groundY - 1) {
            p.y = groundY;
            p.vy = 0;
            p.vx *= 0.9;
          }
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.bounced ? 1.3 : 1), 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case "fire": {
          p.vy -= 0.05; // rise
          p.vx *= 0.96;
          p.vy *= 0.97;
          p.x += p.vx + Math.sin(p.age * 0.2) * 0.5;
          p.y += p.vy;
          p.size *= 0.98;
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          glow.addColorStop(0, `hsla(${p.hue},100%,60%,${alpha * 0.5})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
          ctx.fillStyle = `hsla(${p.hue},100%,70%,${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case "ice": {
          p.vy += GRAVITY * 0.7;
          p.vx *= 0.97;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.rotSpeed;
          if (p.y > groundY) { p.alive = false; continue; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(140,220,255,${alpha * 0.8})`;
          ctx.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 2);
          ctx.restore();
          // Glow
          ctx.fillStyle = `rgba(100,200,255,${alpha * 0.15})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case "shadow": {
          p.x += p.vx + Math.sin(p.age * 0.08 + p.phase) * 0.8;
          p.y += p.vy;
          p.vx *= 0.98;
          p.vy *= 0.99;
          p.size *= 0.995;
          const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          sg.addColorStop(0, `rgba(100,30,180,${alpha * 0.4})`);
          sg.addColorStop(1, "transparent");
          ctx.fillStyle = sg;
          ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
          break;
        }

        case "holy": {
          p.x += p.vx * (1 - t * 0.5);
          p.y += p.vy * (1 - t * 0.5);
          // Cross shape
          ctx.fillStyle = `rgba(255,240,180,${alpha * 0.8})`;
          ctx.fillRect(p.x - p.size, p.y - 0.5, p.size * 2, 1);
          ctx.fillRect(p.x - 0.5, p.y - p.size, 1, p.size * 2);
          // Glow
          const hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          hg.addColorStop(0, `rgba(255,240,150,${alpha * 0.25})`);
          hg.addColorStop(1, "transparent");
          ctx.fillStyle = hg;
          ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
          break;
        }

        case "spark": {
          p.vy += GRAVITY * 0.5;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          const brightness = 0.6 + Math.random() * 0.4;
          ctx.fillStyle = `rgba(255,${180 + Math.floor(Math.random() * 60)},60,${alpha * brightness})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Trail
          ctx.strokeStyle = `rgba(255,200,80,${alpha * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.stroke();
          break;
        }

        case "water": {
          p.vy += GRAVITY;
          p.x += p.vx;
          p.y += p.vy;
          if (p.y > groundY) { p.alive = false; continue; }
          ctx.fillStyle = `rgba(100,180,255,${alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case "poison": {
          p.x += p.vx + Math.sin(p.age * 0.1 + p.phase) * 0.6;
          p.y += p.vy;
          p.vx *= 0.98;
          p.vy *= 0.99;
          p.size *= 0.995;
          const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          pg.addColorStop(0, `rgba(60,180,40,${alpha * 0.45})`);
          pg.addColorStop(1, "transparent");
          ctx.fillStyle = pg;
          ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
          break;
        }

        case "arrowTrail": {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.9;
          p.vy *= 0.9;
          ctx.fillStyle = `rgba(160,120,60,${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
  }
}

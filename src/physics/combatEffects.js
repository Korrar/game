// Combat visual effects – blood, fire, ice, shadow, holy, melee sparks
// Pool-based particle system rendered on the physics canvas

const _isMobile = ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900;
const MAX_PARTICLES = _isMobile ? 100 : 250;

class Particle {
  constructor() {
    this.alive = false;
    this.age = 0;
    this.maxAge = 0;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.size = 0;
    this.type = "";
  }
}

// Pre-computed TWO_PI to avoid repeated Math.PI * 2
const TWO_PI = Math.PI * 2;

export class CombatEffects {
  constructor() {
    this.particles = [];
    this.mobile = _isMobile;
    this._nextFree = 0; // track next likely free slot for faster allocation
    for (let i = 0; i < MAX_PARTICLES; i++) this.particles.push(new Particle());
  }

  // Scale particle counts for mobile
  _c(count) {
    return this.mobile ? Math.ceil(count * 0.5) : count;
  }

  _spawn(props) {
    const len = this.particles.length;
    // Start search from last known free slot for O(1) amortized allocation
    for (let i = 0; i < len; i++) {
      const idx = (this._nextFree + i) % len;
      const p = this.particles[idx];
      if (!p.alive) {
        p.alive = true;
        p.age = 0;
        p.type = props.type;
        p.x = props.x; p.y = props.y;
        p.vx = props.vx; p.vy = props.vy;
        p.size = props.size;
        p.maxAge = props.maxAge;
        // Copy optional props directly instead of Object.assign
        if (props.bounced !== undefined) p.bounced = props.bounced;
        if (props.r !== undefined) { p.r = props.r; p.g = props.g; p.b = props.b; }
        if (props.hue !== undefined) p.hue = props.hue;
        if (props.rot !== undefined) { p.rot = props.rot; p.rotSpeed = props.rotSpeed; }
        if (props.phase !== undefined) p.phase = props.phase;
        if (props.gravity !== undefined) p.gravity = props.gravity;
        this._nextFree = (idx + 1) % len;
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
    const count = this._c(10);
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
    const count = this._c(8);
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
    const count = this._c(6);
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
    const count = this._c(6);
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
  // Optimized: batch by type to reduce ctx state changes, avoid per-particle gradients
  update(ctx, groundY) {
    const GRAVITY = 0.15;
    const particles = this.particles;
    const len = particles.length;

    // Count alive particles to skip empty loop iterations
    let aliveCount = 0;

    for (let i = 0; i < len; i++) {
      const p = particles[i];
      if (!p.alive) continue;
      aliveCount++;
      p.age++;
      if (p.age > p.maxAge) { p.alive = false; aliveCount--; continue; }

      const t = p.age / p.maxAge;
      // Optimized alpha: avoid branch with clamp math
      const alpha = t < 0.1 ? t * 10 : (1 - t) / 0.9;

      switch (p.type) {
        case "blood": {
          p.vy += GRAVITY;
          p.vx *= 0.98;
          p.x += p.vx;
          p.y += p.vy;
          if (p.y > groundY && !p.bounced) {
            p.vy = -Math.abs(p.vy) * 0.3;
            p.vx *= 0.5;
            p.y = groundY;
            p.bounced = true;
          }
          if (p.bounced && p.y >= groundY - 1) {
            p.y = groundY;
            p.vy = 0;
            p.vx *= 0.9;
          }
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.bounced ? 1.3 : 1), 0, TWO_PI);
          ctx.fill();
          break;
        }

        case "fire": {
          p.vy -= 0.05;
          p.vx *= 0.96;
          p.vy *= 0.97;
          p.x += p.vx + Math.sin(p.age * 0.2) * 0.5;
          p.y += p.vy;
          p.size *= 0.98;
          // Optimized: use simple filled circles with globalAlpha instead of per-particle radial gradient
          const fireAlpha = alpha * 0.5;
          if (fireAlpha > 0.02) {
            ctx.globalAlpha = fireAlpha;
            ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.5, 0, TWO_PI);
            ctx.fill();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${p.hue},100%,70%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
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
          ctx.globalAlpha = alpha * 0.8;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = "rgb(140,220,255)";
          ctx.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 2);
          ctx.restore();
          // Simplified glow: filled circle instead of separate arc
          ctx.globalAlpha = alpha * 0.15;
          ctx.fillStyle = "rgb(100,200,255)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, TWO_PI);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        case "shadow": {
          p.x += p.vx + Math.sin(p.age * 0.08 + p.phase) * 0.8;
          p.y += p.vy;
          p.vx *= 0.98;
          p.vy *= 0.99;
          p.size *= 0.995;
          // Optimized: use simple circle with alpha instead of per-particle radial gradient
          const shadowAlpha = alpha * 0.4;
          if (shadowAlpha > 0.02) {
            ctx.globalAlpha = shadowAlpha;
            ctx.fillStyle = "rgb(100,30,180)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.8, 0, TWO_PI);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          break;
        }

        case "holy": {
          p.x += p.vx * (1 - t * 0.5);
          p.y += p.vy * (1 - t * 0.5);
          // Cross shape
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillStyle = "rgb(255,240,180)";
          ctx.fillRect(p.x - p.size, p.y - 0.5, p.size * 2, 1);
          ctx.fillRect(p.x - 0.5, p.y - p.size, 1, p.size * 2);
          // Simplified glow: circle instead of per-particle radial gradient
          ctx.globalAlpha = alpha * 0.25;
          ctx.fillStyle = "rgb(255,240,150)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, TWO_PI);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        case "spark": {
          p.vy += GRAVITY * 0.5;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(255,${180 + ((p.age * 37) & 63)},60)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
          ctx.fill();
          // Trail
          ctx.globalAlpha = alpha * 0.3;
          ctx.strokeStyle = "rgb(255,200,80)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }

        case "water": {
          p.vy += GRAVITY;
          p.x += p.vx;
          p.y += p.vy;
          if (p.y > groundY) { p.alive = false; continue; }
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillStyle = "rgb(100,180,255)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        case "poison": {
          p.x += p.vx + Math.sin(p.age * 0.1 + p.phase) * 0.6;
          p.y += p.vy;
          p.vx *= 0.98;
          p.vy *= 0.99;
          p.size *= 0.995;
          // Optimized: simple circle instead of per-particle radial gradient
          const poisonAlpha = alpha * 0.45;
          if (poisonAlpha > 0.02) {
            ctx.globalAlpha = poisonAlpha;
            ctx.fillStyle = "rgb(60,180,40)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.8, 0, TWO_PI);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          break;
        }

        case "arrowTrail": {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.9;
          p.vy *= 0.9;
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillStyle = "rgb(160,120,60)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
  }
}

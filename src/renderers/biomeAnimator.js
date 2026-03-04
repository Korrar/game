// Particle-based biome animation system
// Runs on an overlay canvas with requestAnimationFrame
import { getIconImage } from "../rendering/icons.js";

const _isMobile = ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900;
const MAX_PARTICLES = _isMobile ? 120 : 300;

class Particle {
  constructor() { this.alive = false; }
}

export class BiomeAnimator {
  constructor() {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) this.particles.push(new Particle());
    this.time = 0;
    this.biome = null;
    this.W = 0;
    this.H = 0;
    this.GY = 0;
    this.frameId = null;
    this.ctx = null;
    // Spell effects queue
    this.spellEffects = [];
  }

  start(canvas, biome, isNight, weather) {
    this.stop();
    if (!canvas || !biome) return;
    this.ctx = canvas.getContext("2d");
    this.biome = biome;
    this.isNight = !!isNight;
    this.weather = weather || null;
    this.W = canvas.width;
    this.H = canvas.height;
    this.GY = this.H * 0.25;
    this.time = 0;
    this.particles.forEach(p => { p.alive = false; });
    this._loop();
  }

  stop() {
    if (this.frameId) { cancelAnimationFrame(this.frameId); this.frameId = null; }
  }

  resize(w, h) {
    this.W = w; this.H = h; this.GY = h * 0.25;
  }

  _spawn(type, props) {
    for (const p of this.particles) {
      if (!p.alive) {
        p.alive = true;
        p.type = type;
        p.age = 0;
        p.maxAge = props.maxAge || 300;
        Object.assign(p, props);
        return p;
      }
    }
    return null;
  }

  _loop = () => {
    this.frameId = requestAnimationFrame(this._loop);
    this.time++;
    const { ctx, W, H, GY } = this;
    if (!ctx || !W) return;

    ctx.clearRect(0, 0, W, H);
    let fx = this.biome.fx || {};
    if (this.weather && this.weather.fxOverride) fx = { ...fx, ...this.weather.fxOverride };

    // Spawn new particles
    if (fx.rain) this._spawnRain(fx.rain);
    if (fx.snow) this._spawnSnow();
    if (fx.sand) this._spawnSand();
    if (fx.embers) this._spawnEmbers();
    if (fx.leaves) this._spawnLeaves();
    if (fx.waves) this._drawWaves();
    if (fx.bubbles) this._spawnBubbles();
    if (fx.twinkle) this._drawTwinkle();
    if (fx.spores) this._spawnSpores();
    if (fx.fireflies) this._spawnFireflies();
    if (fx.fog) this._drawFog();
    if (fx.sunsetGlow) this._drawSunsetGlow();
    if (fx.waterfall) this._drawWaterfall();
    if (fx.aurora) this._drawAurora();
    if (fx.lightning) this._spawnLightningFlash();
    if (fx.jellyfish) this._spawnJellyfish();
    if (fx.ash) this._spawnAsh();
    if (fx.petals) this._spawnPetals();
    if (fx.seagulls) this._spawnSeagulls();
    if (fx.dolphins) this._spawnDolphins();
    if (fx.comets) this._spawnComets();
    if (fx.dustDevil) this._drawDustDevil();
    if (fx.heatShimmer) this._drawHeatShimmer();
    if (fx.lanterns) this._spawnLanterns();
    if (fx.ripples) this._drawRipples();

    // Weather-specific visuals
    if (this.weather) {
      if (this.weather.id === "storm" && Math.random() < 0.003) {
        ctx.fillStyle = `rgba(255,255,240,${0.1 + Math.random() * 0.12})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.weather.id === "gale" && this.time % 3 === 0) {
        for (let i = 0; i < 3; i++) {
          this._spawn("galeDebris", {
            x: -10, y: 20 + Math.random() * (GY - 20),
            speed: 6 + Math.random() * 4, size: 1 + Math.random() * 2,
            opacity: 0.3 + Math.random() * 0.3, wobble: Math.random() * Math.PI * 2,
            maxAge: 150,
          });
        }
      }
      if (this.weather.id === "fog" && fx.fogIntensity > 2) {
        ctx.fillStyle = `rgba(80,80,60,${0.06 * (fx.fogIntensity - 1)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Ambient birds
    this._spawnBirds();

    // Night effects: twinkle stars + shooting stars
    if (this.isNight) {
      this._drawTwinkle();
      this._spawnShootingStar();
    }

    // Wind effect on all biomes
    const wind = fx.wind || 0;

    // Update & draw particles
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.age++;
      if (p.age > p.maxAge) { p.alive = false; continue; }

      switch (p.type) {
        case "rain": this._updateRain(p, wind); break;
        case "snow": this._updateSnow(p, wind); break;
        case "sand": this._updateSand(p, wind); break;
        case "ember": this._updateEmber(p, wind); break;
        case "leaf": this._updateLeaf(p, wind); break;
        case "bubble": this._updateBubble(p); break;
        case "spore": this._updateSpore(p, wind); break;
        case "firefly": this._updateFirefly(p); break;
        case "bird": this._updateBird(p); break;
        case "shootingstar": this._updateShootingStar(p); break;
        case "galeDebris": this._updateGaleDebris(p, wind); break;
        case "sunsetSparkle": this._updateSunsetSparkle(p); break;
        case "waterfallDrop": this._updateWaterfallDrop(p); break;
        case "waterfallMist": this._updateWaterfallMist(p); break;
        case "jellyfish": this._updateJellyfish(p); break;
        case "ash": this._updateAsh(p, wind); break;
        case "petal": this._updatePetal(p, wind); break;
        case "seagull": this._updateSeagull(p); break;
        case "dolphin": this._updateDolphin(p); break;
        case "comet": this._updateComet(p); break;
        case "lantern": this._updateLantern(p, wind); break;
      }
    }

    // Draw spell effects
    this._drawSpellEffects();
  }

  // ─── SPELL EFFECTS ───

  playSpell(spellId, targetX, targetY, color, colorLight) {
    // targetX, targetY in pixel coordinates on canvas
    const sx = this.W * 0.5, sy = this.H * 0.35; // cast from center-ish
    this.spellEffects.push({
      id: spellId, frame: 0, maxFrames: 60,
      sx, sy, tx: targetX, ty: targetY,
      color, colorLight,
    });
  }

  // AoE spells – unique full-screen effects
  playAoeSpell(spellId, color, colorLight, enemyPositions) {
    const maxFrames = spellId === "earthquake" ? 80 : spellId === "meteor" ? 90 : spellId === "blizzard" ? 100 : 70;
    this.spellEffects.push({
      id: "aoe_" + spellId, frame: 0, maxFrames,
      sx: this.W * 0.5, sy: this.H * 0.35,
      tx: this.W * 0.5, ty: this.GY,
      color, colorLight,
      enemies: enemyPositions || [],
      // Pre-generate random meteor positions
      meteorPositions: spellId === "meteor" ? Array.from({ length: 8 }, () => ({
        x: 100 + Math.random() * (this.W - 200),
        delay: Math.random() * 0.5,
      })) : null,
    });
  }

  _drawSpellEffects() {
    const { ctx, W, H } = this;
    this.spellEffects = this.spellEffects.filter(eff => {
      eff.frame++;
      if (eff.frame > eff.maxFrames) return false;
      const t = eff.frame / eff.maxFrames;

      switch (eff.id) {
        case "fireball": this._drawFireball(ctx, eff, t); break;
        case "lightning": this._drawLightningEffect(ctx, eff, t); break;
        case "icelance": this._drawIceLance(ctx, eff, t); break;
        case "drain": this._drawShadowBolt(ctx, eff, t); break;
        case "holybeam": this._drawHolyBeam(ctx, eff, t); break;
        case "summon": this._drawSummonEffect(ctx, eff, t); break;
        case "melee": this._drawMeleeClash(ctx, eff, t); break;
        case "meteorImpact": this._drawMeteorImpact(ctx, eff, t); break;
        case "meteorTrail": this._drawMeteorTrail(ctx, eff, t); break;
        // AoE unique effects
        case "aoe_earthquake": this._drawEarthquake(ctx, eff, t); break;
        case "aoe_meteor": this._drawMeteorRain(ctx, eff, t); break;
        case "aoe_blizzard": this._drawBlizzard(ctx, eff, t); break;
        case "aoe_chainlightning": this._drawChainLightning(ctx, eff, t); break;
      }
      return true;
    });
  }

  // Melee clash – short burst of sparks at contact point
  playMeleeClash(x, y, color) {
    this.spellEffects.push({
      id: "melee", frame: 0, maxFrames: 15,
      sx: x, sy: y, tx: x, ty: y,
      color: color || "#ffa040", colorLight: "#ffe0a0",
    });
  }

  _drawMeleeClash(ctx, eff, t) {
    const { tx, ty, color } = eff;
    const alpha = 1 - t;
    const r = 12 + t * 18;
    // Central flash
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 0.5);
    g.addColorStop(0, `rgba(255,240,180,${alpha * 0.6})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(tx - r, ty - r, r * 2, r * 2);
    // Sparks
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 8;
      const d = r * 0.8 * t;
      const px = tx + Math.cos(a) * d;
      const py = ty + Math.sin(a) * d;
      ctx.fillStyle = `rgba(255,200,80,${alpha * 0.8})`;
      ctx.beginPath(); ctx.arc(px, py, 1.5 + (1 - t) * 2, 0, Math.PI * 2); ctx.fill();
    }
    // Cross slash marks
    ctx.strokeStyle = `rgba(255,255,200,${alpha * 0.5})`;
    ctx.lineWidth = 1.5;
    const sl = 8 + t * 6;
    ctx.beginPath(); ctx.moveTo(tx - sl, ty - sl); ctx.lineTo(tx + sl, ty + sl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx + sl, ty - sl); ctx.lineTo(tx - sl, ty + sl); ctx.stroke();
  }

  // Meteor falling trail – fire particles during descent
  playMeteorTrail(x, startY, endY, durationFrames) {
    this.spellEffects.push({
      id: "meteorTrail", frame: 0, maxFrames: durationFrames || 60,
      sx: x, sy: startY, tx: x, ty: endY,
      color: "#ff6020", colorLight: "#ffcc40",
    });
  }

  _drawMeteorTrail(ctx, eff, t) {
    const { sx, sy, tx, ty } = eff;
    const curY = sy + (ty - sy) * t;
    const curX = tx + Math.sin(t * 12) * 3;

    // Bright glow around current meteor position
    const r = 40 + Math.sin(t * 20) * 10;
    const alpha = 0.4 + Math.sin(t * 15) * 0.15;
    const g = ctx.createRadialGradient(curX, curY, 0, curX, curY, r);
    g.addColorStop(0, `rgba(255,200,80,${alpha})`);
    g.addColorStop(0.3, `rgba(255,100,20,${alpha * 0.5})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(curX - r, curY - r, r * 2, r * 2);

    // Fire trail particles behind
    for (let i = 0; i < 8; i++) {
      const trailT = Math.max(0, t - i * 0.02);
      const py = sy + (ty - sy) * trailT;
      const px = tx + Math.sin(trailT * 12) * 3 + (Math.random() - 0.5) * 12;
      const trailAlpha = (1 - i / 8) * 0.5 * (0.5 + t);
      const size = (3 + Math.random() * 4) * (1 - i / 8);
      ctx.fillStyle = `rgba(255,${80 + i * 20},20,${trailAlpha})`;
      ctx.beginPath(); ctx.arc(px, py - i * 4, size, 0, Math.PI * 2); ctx.fill();
    }

    // Smoke trail
    for (let i = 0; i < 5; i++) {
      const trailT = Math.max(0, t - i * 0.04);
      const py = sy + (ty - sy) * trailT - 10 - i * 8;
      const px = tx + (Math.random() - 0.5) * 20;
      const smokeAlpha = (1 - i / 5) * 0.15 * (0.3 + t);
      const smokeR = 6 + i * 3;
      ctx.fillStyle = `rgba(60,40,20,${smokeAlpha})`;
      ctx.beginPath(); ctx.arc(px, py, smokeR, 0, Math.PI * 2); ctx.fill();
    }

    // Ambient light on ground during fall
    if (t > 0.3) {
      const glowAlpha = (t - 0.3) * 0.3;
      const groundGlow = ctx.createRadialGradient(tx, ty + 20, 0, tx, ty + 20, 120);
      groundGlow.addColorStop(0, `rgba(255,100,20,${glowAlpha})`);
      groundGlow.addColorStop(1, "transparent");
      ctx.fillStyle = groundGlow;
      ctx.fillRect(tx - 120, ty - 100, 240, 140);
    }
  }

  // Meteor impact – big flash + expanding rings + debris
  playMeteorImpact(x, y) {
    this.spellEffects.push({
      id: "meteorImpact", frame: 0, maxFrames: 45,
      sx: x, sy: y - 200, tx: x, ty: y,
      color: "#ff6020", colorLight: "#ffcc40",
    });
  }

  _drawMeteorImpact(ctx, eff, t) {
    const { tx, ty, color } = eff;
    // Phase 1: bright flash (first 30%)
    if (t < 0.3) {
      const ft = t / 0.3;
      const r = 60 * ft;
      const alpha = 0.8 * (1 - ft);
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
      g.addColorStop(0, `rgba(255,240,180,${alpha})`);
      g.addColorStop(0.5, `rgba(255,100,20,${alpha * 0.5})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(tx - r, ty - r, r * 2, r * 2);
    }
    // Phase 2: expanding rings
    const alpha = 1 - t;
    for (let ring = 0; ring < 3; ring++) {
      const rt = Math.max(0, t - ring * 0.1);
      if (rt <= 0) continue;
      const r = 20 + rt * 120;
      ctx.strokeStyle = `rgba(255,${100 + ring * 50},20,${alpha * 0.4 * (1 - ring * 0.25)})`;
      ctx.lineWidth = 3 - ring;
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Debris particles
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 3;
      const d = 15 + t * 80 * (0.5 + (i % 3) * 0.25);
      const px = tx + Math.cos(a) * d;
      const py = ty + Math.sin(a) * d - t * 30 * Math.sin(i);
      ctx.fillStyle = `rgba(255,${150 + i * 8},40,${alpha * 0.7})`;
      ctx.beginPath(); ctx.arc(px, py, 2 + (1 - t) * 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawSummonEffect(ctx, eff, t) {
    const { tx, ty } = eff;
    if (t < 0.6) {
      const pt = t / 0.6;
      const r = 30 * Math.sin(pt * Math.PI);
      const alpha = 0.5 * (1 - pt * 0.3);
      // Green portal ellipse at ground
      ctx.strokeStyle = `rgba(64,224,96,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(tx, ty + 20, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Rising sparkles
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + pt * 6;
        const d = r * 0.8;
        const px = tx + Math.cos(a) * d * (1 - pt * 0.5);
        const py = ty + 20 - pt * 60 + Math.sin(a) * d * 0.3;
        ctx.fillStyle = `rgba(100,255,120,${alpha * 0.6})`;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
      }
      // Center glow
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 0.8);
      g.addColorStop(0, `rgba(100,255,120,${alpha * 0.3})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(tx - r, ty - r, r * 2, r * 2);
    } else {
      // Fade out glow
      const ft = (t - 0.6) / 0.4;
      const alpha = 0.3 * (1 - ft);
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 25);
      g.addColorStop(0, `rgba(100,255,120,${alpha})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(tx - 25, ty - 25, 50, 50);
    }
  }

  _drawFireball(ctx, eff, t) {
    const { sx, sy, tx, ty } = eff;
    if (t < 0.45) {
      // Tumbling dynamite stick flying toward target
      const pt = t / 0.45;
      const x = sx + (tx - sx) * pt;
      const y = sy + (ty - sy) * pt - Math.sin(pt * Math.PI) * 50;
      const rot = pt * Math.PI * 4; // tumble rotation
      // Fuse spark trail
      for (let i = 0; i < 6; i++) {
        const tt = Math.max(0, pt - i * 0.035);
        const px = sx + (tx - sx) * tt + (Math.random() - 0.5) * 4;
        const py = sy + (ty - sy) * tt - Math.sin(tt * Math.PI) * 50 + (Math.random() - 0.5) * 4;
        ctx.fillStyle = `rgba(255,${180 + i * 10},40,${0.4 - i * 0.06})`;
        ctx.beginPath(); ctx.arc(px, py, 2.5 - i * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      // Dynamite stick body
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = "#c03020";
      ctx.fillRect(-4, -10, 8, 20);
      ctx.fillStyle = "#8a2010";
      ctx.fillRect(-4.5, -3, 9, 3);
      ctx.fillRect(-4.5, 5, 9, 3);
      // Fuse
      ctx.strokeStyle = "#5a4a30";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(3, -14); ctx.stroke();
      // Spark at fuse tip
      ctx.fillStyle = "#ffe040";
      ctx.beginPath(); ctx.arc(3, -14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      // Big explosion with smoke clouds
      const et = (t - 0.45) / 0.55;
      const maxR = 70;
      const r = maxR * Math.sin(et * Math.PI * 0.5);
      const alpha = 1 - et;
      // Flash
      if (et < 0.15) {
        ctx.fillStyle = `rgba(255,240,200,${0.3 * (1 - et / 0.15)})`;
        ctx.fillRect(tx - r * 2, ty - r * 2, r * 4, r * 4);
      }
      // Fireball core
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
      g.addColorStop(0, `rgba(255,220,80,${alpha * 0.7})`);
      g.addColorStop(0.3, `rgba(255,100,20,${alpha * 0.5})`);
      g.addColorStop(0.6, `rgba(160,40,10,${alpha * 0.3})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(tx - r * 1.5, ty - r * 1.5, r * 3, r * 3);
      // Smoke puffs
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + et;
        const d = r * 0.6 * et;
        const px = tx + Math.cos(a) * d;
        const py = ty + Math.sin(a) * d - et * 20;
        const sr = 8 + et * 12;
        ctx.fillStyle = `rgba(80,60,40,${alpha * 0.35})`;
        ctx.beginPath(); ctx.arc(px, py, sr, 0, Math.PI * 2); ctx.fill();
      }
      // Debris sparks
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + et * 3;
        const d = r * 1.1 * et;
        const px = tx + Math.cos(a) * d;
        const py = ty + Math.sin(a) * d;
        ctx.fillStyle = `rgba(255,180,40,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(px, py, 1.5 + (1 - et) * 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  _drawLightningEffect(ctx, eff, t) {
    const { tx, ty } = eff;
    const sx = 0; // bullet comes from left side
    const sy = ty - 10 + Math.sin(tx) * 5;
    // Muzzle flash at origin
    if (t < 0.1) {
      const fa = 1 - t / 0.1;
      const fr = 15 + fa * 10;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, fr);
      g.addColorStop(0, `rgba(255,240,180,${fa})`);
      g.addColorStop(0.4, `rgba(255,200,60,${fa * 0.6})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(sx - fr, sy - fr, fr * 2, fr * 2);
    }
    // Bullet tracer from left to target
    if (t < 0.2) {
      const pt = t / 0.2;
      const headX = sx + (tx - sx) * pt;
      const headY = sy + (ty - sy) * pt;
      const tailX = sx + (tx - sx) * Math.max(0, pt - 0.4);
      const tailY = sy + (ty - sy) * Math.max(0, pt - 0.4);
      ctx.strokeStyle = `rgba(255,240,180,${1 - pt * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();
      // Tracer glow
      ctx.strokeStyle = `rgba(255,200,60,${0.4 - pt * 0.2})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();
    }
    // Impact spark burst at target
    if (t > 0.15 && t < 0.6) {
      const it = (t - 0.15) / 0.45;
      const sparkCount = 8;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (i / sparkCount) * Math.PI * 2 + it * 0.5;
        const dist = 5 + it * 30;
        const sx2 = tx + Math.cos(angle) * dist;
        const sy2 = ty + Math.sin(angle) * dist;
        const alpha = 0.8 * (1 - it);
        ctx.fillStyle = `rgba(255,220,100,${alpha})`;
        ctx.fillRect(sx2 - 1.5, sy2 - 1.5, 3, 3);
      }
      // Central impact flash
      if (it < 0.3) {
        const r = 12 + it * 20;
        const alpha = 0.6 * (1 - it / 0.3);
        const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
        g.addColorStop(0, `rgba(255,240,200,${alpha})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(tx - r, ty - r, r * 2, r * 2);
      }
    }
  }

  _drawIceLance(ctx, eff, t) {
    const { sx, sy, tx, ty } = eff;
    if (t < 0.35) {
      // Flying harpoon with rope trail
      const pt = t / 0.35;
      const x = sx + (tx - sx) * pt;
      const y = sy + (ty - sy) * pt;
      const angle = Math.atan2(ty - sy, tx - sx);
      // Rope trail
      ctx.strokeStyle = `rgba(140,110,60,${0.5 - pt * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (let i = 1; i <= 8; i++) {
        const rpt = pt * (i / 8);
        const rx = sx + (tx - sx) * rpt;
        const ry = sy + (ty - sy) * rpt + Math.sin(rpt * Math.PI * 4) * 4;
        ctx.lineTo(rx, ry);
      }
      ctx.stroke();
      // Harpoon head
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Shaft
      ctx.fillStyle = "#6a5030";
      ctx.fillRect(-18, -1.5, 22, 3);
      // Metal head with barbs
      ctx.fillStyle = "#a0b0c0";
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(2, -4); ctx.lineTo(4, 0); ctx.lineTo(2, 4);
      ctx.closePath(); ctx.fill();
      // Barbs
      ctx.fillStyle = "#8090a0";
      ctx.beginPath(); ctx.moveTo(3, -3); ctx.lineTo(0, -6); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(0, 6); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
      ctx.restore();
      // Water splash particles along trail
      for (let i = 0; i < 3; i++) {
        const tt = Math.max(0, pt - i * 0.08);
        const px = sx + (tx - sx) * tt + (Math.random() - 0.5) * 6;
        const py = sy + (ty - sy) * tt + (Math.random() - 0.5) * 6;
        ctx.fillStyle = `rgba(100,200,255,${0.25 - i * 0.06})`;
        ctx.beginPath(); ctx.arc(px, py, 2 - i * 0.4, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Metal impact with sparks
      const ft = (t - 0.35) / 0.65;
      const alpha = 1 - ft;
      const r = 25 * Math.min(1, ft * 3);
      // Impact flash
      if (ft < 0.2) {
        const flashAlpha = 0.4 * (1 - ft / 0.2);
        ctx.fillStyle = `rgba(200,220,255,${flashAlpha})`;
        ctx.beginPath(); ctx.arc(tx, ty, 15, 0, Math.PI * 2); ctx.fill();
      }
      // Metal sparks flying outward
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + ft * 2;
        const d = r * 1.2 * ft;
        const px = tx + Math.cos(a) * d;
        const py = ty + Math.sin(a) * d;
        ctx.fillStyle = `rgba(220,200,160,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(px, py, 1.5 + (1 - ft) * 2, 0, Math.PI * 2); ctx.fill();
      }
      // Embedded harpoon silhouette
      if (ft < 0.6) {
        const hAlpha = alpha * 0.4;
        ctx.fillStyle = `rgba(100,120,140,${hAlpha})`;
        ctx.fillRect(tx - 12, ty - 1, 16, 2);
        ctx.fillStyle = `rgba(160,180,200,${hAlpha})`;
        ctx.beginPath(); ctx.moveTo(tx + 6, ty); ctx.lineTo(tx + 2, ty - 3); ctx.lineTo(tx + 2, ty + 3); ctx.closePath(); ctx.fill();
      }
    }
  }

  _drawShadowBolt(ctx, eff, t) {
    const { sx, sy, tx, ty, color, colorLight } = eff;
    if (t < 0.4) {
      const pt = t / 0.4;
      const x = sx + (tx - sx) * pt;
      const y = sy + (ty - sy) * pt;
      // Dark trail
      for (let i = 0; i < 6; i++) {
        const tt = Math.max(0, pt - i * 0.04);
        const px = sx + (tx - sx) * tt;
        const py = sy + (ty - sy) * tt;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 10 - i);
        g.addColorStop(0, `rgba(100,30,180,${0.3 - i * 0.04})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(px - 12, py - 12, 24, 24);
      }
      // Core
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, "rgba(180,80,255,0.7)");
      g.addColorStop(0.5, "rgba(80,20,140,0.4)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(x - 14, y - 14, 28, 28);
      // Skull hint
      ctx.globalAlpha = 0.4 + Math.sin(pt * 20) * 0.2;
      const skullImg = getIconImage("skull", 14);
      if (skullImg) ctx.drawImage(skullImg, x - 7, y - 3, 14, 14);
      ctx.globalAlpha = 1;
    } else {
      const et = (t - 0.4) / 0.6;
      const alpha = 1 - et;
      const r = 40 * Math.min(1, et * 2.5);
      // Dark vortex
      ctx.fillStyle = `rgba(20,0,40,${alpha * 0.4})`;
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill();
      // Purple tendrils
      ctx.strokeStyle = `rgba(140,40,220,${alpha * 0.5})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + et * 4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(
          tx + Math.cos(a) * r * 0.5, ty + Math.sin(a) * r * 0.5,
          tx + Math.cos(a + 0.5) * r, ty + Math.sin(a + 0.5) * r
        );
        ctx.stroke();
      }
    }
  }

  _drawHolyBeam(ctx, eff, t) {
    const { tx, ty } = eff;
    // Cannonball arc trajectory from off-screen left
    const sx = 0, sy = 0; // cannon fires from top-left
    if (t < 0.45) {
      const pt = t / 0.45;
      const x = sx + (tx - sx) * pt;
      const y = sy + (ty - sy) * pt - Math.sin(pt * Math.PI) * 80; // high arc
      // Muzzle flash at start
      if (pt < 0.15) {
        const mAlpha = 0.7 * (1 - pt / 0.15);
        ctx.fillStyle = `rgba(255,200,60,${mAlpha})`;
        ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 20 * (1 - pt / 0.15), 0, Math.PI * 2); ctx.fill();
        // Smoke puff
        ctx.fillStyle = `rgba(180,160,140,${mAlpha * 0.5})`;
        ctx.beginPath(); ctx.arc(sx + 20, sy + 5, 15, 0, Math.PI * 2); ctx.fill();
      }
      // Smoke trail
      for (let i = 0; i < 4; i++) {
        const tt = Math.max(0, pt - i * 0.05);
        const px = sx + (tx - sx) * tt;
        const py = sy + (ty - sy) * tt - Math.sin(tt * Math.PI) * 80;
        ctx.fillStyle = `rgba(120,110,100,${0.2 - i * 0.04})`;
        ctx.beginPath(); ctx.arc(px, py, 4 + i * 2, 0, Math.PI * 2); ctx.fill();
      }
      // Cannonball
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      // Metal sheen
      ctx.fillStyle = "rgba(160,160,170,0.4)";
      ctx.beginPath(); ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // Impact — debris explosion + dust cloud
      const et = (t - 0.45) / 0.55;
      const alpha = 1 - et;
      const r = 55 * Math.sin(et * Math.PI * 0.5);
      // Impact flash
      if (et < 0.1) {
        const fAlpha = 0.5 * (1 - et / 0.1);
        ctx.fillStyle = `rgba(255,220,120,${fAlpha})`;
        ctx.beginPath(); ctx.arc(tx, ty, 25, 0, Math.PI * 2); ctx.fill();
      }
      // Dust/debris cloud
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
      g.addColorStop(0, `rgba(180,140,80,${alpha * 0.5})`);
      g.addColorStop(0.4, `rgba(140,110,60,${alpha * 0.3})`);
      g.addColorStop(0.7, `rgba(100,80,50,${alpha * 0.15})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(tx - r * 1.5, ty - r * 1.5, r * 3, r * 3);
      // Rock debris chunks
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + et * 1.5;
        const d = r * 0.9 * et;
        const px = tx + Math.cos(a) * d;
        const py = ty + Math.sin(a) * d - et * 10;
        const chunkR = 2 + (1 - et) * 3;
        ctx.fillStyle = `rgba(${100 + i * 15},${80 + i * 10},${50 + i * 8},${alpha * 0.7})`;
        ctx.fillRect(px - chunkR, py - chunkR, chunkR * 2, chunkR * 1.5);
      }
      // Ground crack lines
      if (et < 0.7) {
        ctx.strokeStyle = `rgba(60,40,20,${alpha * 0.4})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.3;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + Math.cos(a) * r * 0.8, ty + Math.sin(a) * r * 0.8);
          ctx.stroke();
        }
      }
    }
  }

  // ─── AoE: EARTHQUAKE – ground cracks, dust, brown shockwave ───
  _drawEarthquake(ctx, eff, t) {
    const { W, H } = this;
    const gy = this.GY;

    // Phase 1: ground shockwave ripple (0-0.4)
    if (t < 0.5) {
      const pt = t / 0.5;
      // Brown dust wave expanding from center along ground
      const waveW = W * pt;
      const alpha = 0.6 * (1 - pt);
      const g = ctx.createRadialGradient(W * 0.5, gy, 0, W * 0.5, gy, waveW * 0.6);
      g.addColorStop(0, `rgba(160,120,60,${alpha * 0.3})`);
      g.addColorStop(0.6, `rgba(120,80,30,${alpha * 0.2})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, gy - 80, W, 160);
    }

    // Phase 2: crack lines across ground (0.1-0.8)
    if (t > 0.05 && t < 0.85) {
      const ct = Math.min(1, (t - 0.05) / 0.4);
      const alpha = t < 0.6 ? 0.8 : 0.8 * (1 - (t - 0.6) / 0.25);
      ctx.strokeStyle = `rgba(80,40,10,${Math.max(0, alpha)})`;
      ctx.lineWidth = 2.5;
      // Pre-seeded crack lines
      const seed = [0.15, 0.32, 0.5, 0.68, 0.85];
      for (let i = 0; i < seed.length; i++) {
        const sx = W * seed[i];
        const reach = ct * 120;
        ctx.beginPath();
        ctx.moveTo(sx, gy - 2);
        let cx = sx, cy = gy - 2;
        for (let j = 0; j < 6; j++) {
          cx += (Math.sin(i * 7 + j * 3) * 15);
          cy += reach / 6;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        // Glow along crack
        ctx.strokeStyle = `rgba(200,140,40,${Math.max(0, alpha * 0.3)})`;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(80,40,10,${Math.max(0, alpha)})`;
      }
    }

    // Phase 3: dust/debris particles flying up (0.1-1.0)
    if (t > 0.1) {
      const dt = (t - 0.1) / 0.9;
      const alpha = dt < 0.3 ? dt / 0.3 : 1 - (dt - 0.3) / 0.7;
      for (let i = 0; i < 25; i++) {
        const px = (W * 0.1) + (i / 25) * W * 0.8 + Math.sin(i * 5 + t * 10) * 20;
        const py = gy - dt * (40 + (i % 5) * 30) + Math.sin(i * 3) * 10;
        const size = 2 + (i % 3) * 1.5;
        ctx.fillStyle = `rgba(${140 + (i % 3) * 30},${100 + (i % 4) * 15},${50 + (i % 2) * 20},${Math.max(0, alpha * 0.6)})`;
        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Full-screen brown tint flash
    if (t < 0.15) {
      const alpha = 0.25 * (1 - t / 0.15);
      ctx.fillStyle = `rgba(120,80,20,${alpha})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ─── AoE: METEOR RAIN – multiple meteors fall at random positions ───
  _drawMeteorRain(ctx, eff, t) {
    const { W } = this;
    const gy = this.GY;
    const meteors = eff.meteorPositions;

    for (let i = 0; i < meteors.length; i++) {
      const m = meteors[i];
      const mt = (t - m.delay) / (1 - m.delay); // local time for this meteor
      if (mt < 0 || mt > 1) continue;

      const mx = m.x;
      const startY = -40;
      const endY = gy;
      const curY = startY + (endY - startY) * Math.min(1, mt * 1.8);
      const arrived = mt > 0.55;

      if (!arrived) {
        // Falling meteor
        const wobble = Math.sin(mt * 20 + i * 4) * 3;
        const r = 12 + Math.sin(mt * 15) * 3;

        // Glow
        const g = ctx.createRadialGradient(mx + wobble, curY, 0, mx + wobble, curY, r * 2);
        g.addColorStop(0, `rgba(255,200,80,0.5)`);
        g.addColorStop(0.4, `rgba(255,80,20,0.3)`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(mx - r * 2 + wobble, curY - r * 2, r * 4, r * 4);

        // Core
        ctx.fillStyle = "#ffe080";
        ctx.beginPath(); ctx.arc(mx + wobble, curY, 5, 0, Math.PI * 2); ctx.fill();

        // Trail
        for (let j = 1; j < 6; j++) {
          const ty = curY - j * 15;
          if (ty < startY) break;
          const ta = 0.3 * (1 - j / 6);
          ctx.fillStyle = `rgba(255,${100 + j * 25},20,${ta})`;
          ctx.beginPath(); ctx.arc(mx + wobble + (Math.random() - 0.5) * 6, ty, 4 - j * 0.5, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        // Impact explosion
        const et = (mt - 0.55) / 0.45;
        const alpha = 1 - et;
        const r = 40 * Math.sin(et * Math.PI * 0.5);

        // Flash
        if (et < 0.2) {
          const fa = 0.6 * (1 - et / 0.2);
          const g = ctx.createRadialGradient(mx, gy, 0, mx, gy, 50);
          g.addColorStop(0, `rgba(255,240,180,${fa})`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.fillRect(mx - 50, gy - 50, 100, 100);
        }

        // Expanding ring
        ctx.strokeStyle = `rgba(255,100,20,${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(mx, gy, r, 0, Math.PI * 2); ctx.stroke();

        // Debris sparks
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2 + et * 3;
          const d = r * 0.7 * et;
          const px = mx + Math.cos(a) * d;
          const py = gy + Math.sin(a) * d * 0.5 - et * 20;
          ctx.fillStyle = `rgba(255,${160 + j * 15},40,${alpha * 0.6})`;
          ctx.beginPath(); ctx.arc(px, py, 2 + (1 - et) * 2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // Red-orange screen tint during impacts
    if (t > 0.3 && t < 0.7) {
      const alpha = 0.12 * Math.sin((t - 0.3) / 0.4 * Math.PI);
      ctx.fillStyle = `rgba(255,60,0,${alpha})`;
      ctx.fillRect(0, 0, W, this.H);
    }
  }

  // ─── AoE: BLIZZARD – snowstorm with ice wind ───
  _drawBlizzard(ctx, eff, t) {
    const { W, H } = this;
    const gy = this.GY;

    // Phase intensity: ramp up then sustain then fade
    const intensity = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;

    // Blue-white screen tint
    ctx.fillStyle = `rgba(160,200,255,${0.08 * intensity})`;
    ctx.fillRect(0, 0, W, H);

    // Snowflakes blowing diagonally
    const snowCount = Math.floor(50 * intensity);
    for (let i = 0; i < snowCount; i++) {
      const seed = i * 137.5 + eff.frame * 7;
      const sx = ((seed * 1.3) % W);
      const sy = ((seed * 0.7 + eff.frame * 4) % (gy + 30));
      const windOffset = Math.sin(seed * 0.02 + t * 8) * 15;
      const size = 1.5 + (i % 4) * 1;
      const alpha = (0.3 + (i % 3) * 0.2) * intensity;
      ctx.fillStyle = `rgba(220,240,255,${alpha})`;
      ctx.beginPath(); ctx.arc(sx + windOffset, sy, size, 0, Math.PI * 2); ctx.fill();
    }

    // Horizontal wind streaks
    const streakCount = Math.floor(12 * intensity);
    for (let i = 0; i < streakCount; i++) {
      const sy = 30 + (i / streakCount) * (gy - 30);
      const sx = ((eff.frame * 12 + i * 180) % (W + 200)) - 100;
      const len = 40 + (i % 3) * 25;
      const alpha = 0.15 * intensity;
      ctx.strokeStyle = `rgba(200,230,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + len, sy - 3); ctx.stroke();
    }

    // Ice crystals forming at ground
    if (t > 0.2 && t < 0.9) {
      const ct = (t - 0.2) / 0.7;
      const alpha = ct < 0.5 ? ct / 0.5 : (1 - ct) / 0.5;
      for (let i = 0; i < 8; i++) {
        const ix = W * 0.1 + (i / 8) * W * 0.8;
        const iy = gy + 5;
        const sz = 4 + ct * 6;
        ctx.strokeStyle = `rgba(180,230,255,${alpha * 0.5})`;
        ctx.lineWidth = 1.5;
        // 6-pointed star
        for (let j = 0; j < 3; j++) {
          const a = (j / 3) * Math.PI + i * 0.5;
          ctx.beginPath();
          ctx.moveTo(ix + Math.cos(a) * sz, iy + Math.sin(a) * sz);
          ctx.lineTo(ix - Math.cos(a) * sz, iy - Math.sin(a) * sz);
          ctx.stroke();
        }
      }
    }

    // Central vortex glow
    const cx = W * 0.5, cy = gy * 0.6;
    const r = 120 * intensity;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(100,180,255,${0.08 * intensity})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // ─── AoE: CHAIN LIGHTNING – bolt jumps between enemies ───
  _drawChainLightning(ctx, eff, t) {
    const { W, H } = this;
    const enemies = eff.enemies;

    // Initial flash
    if (t < 0.1) {
      const alpha = 0.3 * (1 - t / 0.1);
      ctx.fillStyle = `rgba(255,255,200,${alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (enemies.length === 0) {
      // No enemies – just a wild lightning show
      if (t < 0.6) {
        const alpha = 0.7 * (1 - t / 0.6);
        for (let b = 0; b < 3; b++) {
          const sx = W * (0.2 + b * 0.3);
          ctx.strokeStyle = `rgba(240,230,80,${alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          let bx = sx, by = 0;
          for (let s = 0; s < 8; s++) {
            bx += (Math.random() - 0.5) * 60;
            by += this.GY / 8;
            ctx.lineTo(bx, by);
          }
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,180,${alpha * 0.3})`;
          ctx.lineWidth = 10;
          ctx.stroke();
        }
      }
      return;
    }

    // Chain sequence: bolt jumps from sky to enemy1, then enemy1→2, 2→3...
    const chainCount = enemies.length;
    const timePerChain = 0.7 / chainCount;

    // Draw from sky to first enemy
    const firstT = Math.min(1, t / timePerChain);
    if (firstT > 0 && t < 0.85) {
      const fadeAlpha = t > 0.6 ? (0.85 - t) / 0.25 : 1;
      this._drawBolt(ctx, enemies[0].x, -10, enemies[0].x, enemies[0].y, firstT, fadeAlpha);
      // Impact glow on first target
      if (firstT > 0.5) {
        const r = 20 + (firstT - 0.5) * 30;
        const g = ctx.createRadialGradient(enemies[0].x, enemies[0].y, 0, enemies[0].x, enemies[0].y, r);
        g.addColorStop(0, `rgba(255,255,100,${0.4 * fadeAlpha})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(enemies[0].x - r, enemies[0].y - r, r * 2, r * 2);
      }
    }

    // Chain bolts between enemies
    for (let i = 1; i < chainCount; i++) {
      const chainStart = timePerChain * i;
      if (t < chainStart) continue;
      const ct = Math.min(1, (t - chainStart) / timePerChain);
      const fadeAlpha = t > 0.6 ? Math.max(0, (0.85 - t) / 0.25) : 1;
      const from = enemies[i - 1];
      const to = enemies[i];
      this._drawBolt(ctx, from.x, from.y, to.x, to.y, ct, fadeAlpha);
      // Impact glow
      if (ct > 0.3) {
        const r = 15 + ct * 20;
        const g = ctx.createRadialGradient(to.x, to.y, 0, to.x, to.y, r);
        g.addColorStop(0, `rgba(255,255,80,${0.35 * fadeAlpha})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(to.x - r, to.y - r, r * 2, r * 2);
      }
    }

    // Ambient electric sparks around all enemies
    if (t > 0.2 && t < 0.9) {
      const alpha = t < 0.5 ? 0.6 : 0.6 * (1 - (t - 0.5) / 0.4);
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        for (let j = 0; j < 3; j++) {
          const a = (j / 3) * Math.PI * 2 + eff.frame * 0.3 + i * 2;
          const d = 12 + Math.sin(eff.frame * 0.2 + j) * 6;
          const px = e.x + Math.cos(a) * d;
          const py = e.y + Math.sin(a) * d;
          ctx.fillStyle = `rgba(255,255,100,${alpha})`;
          ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  // Helper: draw a jagged lightning bolt between two points
  _drawBolt(ctx, x1, y1, x2, y2, progress, alpha) {
    const dx = x2 - x1, dy = y2 - y1;
    const endX = x1 + dx * progress, endY = y1 + dy * progress;
    const segments = 8;

    ctx.strokeStyle = `rgba(255,255,200,${0.8 * alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    let bx = x1, by = y1;
    for (let i = 1; i <= segments; i++) {
      const segT = i / segments;
      if (segT > progress) break;
      bx = x1 + dx * segT + (Math.random() - 0.5) * 30 * (1 - segT);
      by = y1 + dy * segT + (Math.random() - 0.5) * 20;
      ctx.lineTo(bx, by);
    }
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Glow
    ctx.strokeStyle = `rgba(240,230,80,${0.25 * alpha})`;
    ctx.lineWidth = 10;
    ctx.stroke();
  }

  // ─── RAIN ───

  _spawnRain(intensity) {
    const count = Math.floor(intensity * 6);
    for (let i = 0; i < count; i++) {
      this._spawn("rain", {
        x: Math.random() * (this.W + 100) - 50,
        y: -10,
        speed: 8 + Math.random() * 6,
        len: 12 + Math.random() * 18,
        opacity: 0.15 + Math.random() * 0.25,
        maxAge: 200,
      });
    }
  }

  _updateRain(p, wind) {
    p.x += wind * 2;
    p.y += p.speed;
    if (p.y > this.H) { p.alive = false; return; }

    const { ctx } = this;
    ctx.strokeStyle = `rgba(180,210,255,${p.opacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + wind * 2, p.y + p.len);
    ctx.stroke();

    // Splash on ground
    if (p.y + p.len > this.GY + 20 && p.age > 5 && Math.random() < 0.02) {
      ctx.fillStyle = `rgba(180,210,255,${p.opacity * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(p.x, this.GY + 20 + Math.random() * 20, 3, 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── SNOW ───

  _spawnSnow() {
    if (this.time % 2 !== 0) return;
    for (let i = 0; i < 2; i++) {
      this._spawn("snow", {
        x: Math.random() * (this.W + 60) - 30,
        y: -5,
        size: 1.5 + Math.random() * 3,
        speed: 0.8 + Math.random() * 1.5,
        drift: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.4 + Math.random() * 0.5,
        maxAge: 600,
      });
    }
  }

  _updateSnow(p, wind) {
    p.x += Math.sin(p.age * 0.02 + p.phase) * 0.8 + wind * 0.5 + p.drift * p.age;
    p.y += p.speed;
    if (p.y > this.H) { p.alive = false; return; }

    const { ctx } = this;
    ctx.fillStyle = `rgba(240,248,255,${p.opacity})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── SAND/DUST ───

  _spawnSand() {
    for (let i = 0; i < 3; i++) {
      this._spawn("sand", {
        x: -10,
        y: this.GY - 30 + Math.random() * (this.H - this.GY + 30),
        size: 1 + Math.random() * 2,
        speed: 3 + Math.random() * 5,
        opacity: 0.15 + Math.random() * 0.3,
        drift: (Math.random() - 0.5) * 0.5,
        maxAge: 300,
      });
    }
  }

  _updateSand(p, wind) {
    p.x += p.speed + wind * 3;
    p.y += p.drift + Math.sin(p.age * 0.05) * 0.5;
    if (p.x > this.W + 10) { p.alive = false; return; }

    const { ctx } = this;
    const fade = Math.min(1, (this.W - p.x) / 100) * Math.min(1, p.x / 100);
    ctx.fillStyle = `rgba(200,170,100,${p.opacity * fade})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── EMBERS ───

  _spawnEmbers() {
    if (this.time % 4 !== 0) return;
    for (let i = 0; i < 2; i++) {
      this._spawn("ember", {
        x: Math.random() * this.W,
        y: this.H + 5,
        size: 1 + Math.random() * 2.5,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: -(1.5 + Math.random() * 3),
        opacity: 0.5 + Math.random() * 0.5,
        hue: 15 + Math.random() * 30,
        maxAge: 200,
      });
    }
  }

  _updateEmber(p, wind) {
    p.x += p.speedX + wind * 0.5 + Math.sin(p.age * 0.08) * 0.3;
    p.y += p.speedY;
    p.opacity *= 0.995;
    if (p.y < -10 || p.opacity < 0.01) { p.alive = false; return; }

    const { ctx } = this;
    // Glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    g.addColorStop(0, `hsla(${p.hue},100%,60%,${p.opacity * 0.3})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
    // Core
    ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.opacity})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── LEAVES ───

  _spawnLeaves() {
    if (this.time % 20 !== 0) return;
    this._spawn("leaf", {
      x: Math.random() * this.W,
      y: this.GY * 0.3 + Math.random() * this.GY * 0.3,
      size: 3 + Math.random() * 4,
      speedY: 0.3 + Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      phase: Math.random() * Math.PI * 2,
      hue: 90 + Math.random() * 50,
      opacity: 0.4 + Math.random() * 0.4,
      maxAge: 500,
    });
  }

  _updateLeaf(p, wind) {
    p.x += Math.sin(p.age * 0.015 + p.phase) * 1.2 + wind * 1.5;
    p.y += p.speedY;
    p.rot += p.rotSpeed;
    if (p.y > this.H || p.x > this.W + 20 || p.x < -20) { p.alive = false; return; }

    const { ctx } = this;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `hsla(${p.hue},50%,30%,${p.opacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─── WAVES (drawn directly, not particles) ───

  _drawWaves() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.02;
    const waterY = H * 0.82;
    const baseY = waterY;

    for (let layer = 0; layer < 5; layer++) {
      const ly = baseY + layer * 12;
      const alpha = 0.08 + layer * 0.02;
      ctx.strokeStyle = `rgba(150,220,255,${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < W; x += 3) {
        const y = ly + Math.sin(x * 0.015 + t + layer * 1.2) * (4 + layer)
                     + Math.sin(x * 0.008 - t * 0.7 + layer) * 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Foam/spray
    if (this.time % 3 === 0) {
      ctx.fillStyle = "rgba(200,240,255,0.12)";
      for (let i = 0; i < 3; i++) {
        const fx = Math.random() * W;
        const fy = baseY + Math.random() * 15;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 8 + Math.random() * 12, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ─── BUBBLES ───

  _spawnBubbles() {
    if (this.time % 8 !== 0) return;
    this._spawn("bubble", {
      x: Math.random() * this.W,
      y: this.H,
      size: 2 + Math.random() * 5,
      speed: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.15 + Math.random() * 0.25,
      maxAge: 400,
    });
  }

  _updateBubble(p) {
    p.x += Math.sin(p.age * 0.03 + p.phase) * 0.5;
    p.y -= p.speed;
    if (p.y < this.GY * 0.5) { p.alive = false; return; }

    const { ctx } = this;
    ctx.strokeStyle = `rgba(150,210,255,${p.opacity})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = `rgba(200,240,255,${p.opacity * 0.5})`;
    ctx.beginPath();
    ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── TWINKLING STARS ───

  _drawTwinkle() {
    const { ctx, W, H } = this;
    const t = this.time * 0.01;
    // ~30 twinkling stars at fixed pseudo-random positions
    for (let i = 0; i < 30; i++) {
      const sx = (Math.sin(i * 73.37) * 0.5 + 0.5) * W;
      const sy = (Math.sin(i * 137.92) * 0.5 + 0.5) * H * 0.7;
      const brightness = 0.2 + Math.sin(t * (1.5 + i * 0.3) + i * 2.1) * 0.3
                        + Math.sin(t * (0.7 + i * 0.1) + i * 5.3) * 0.2;
      if (brightness < 0.1) continue;
      const size = 1 + brightness * 2;

      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
      g.addColorStop(0, `rgba(255,255,255,${brightness})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(sx - size * 3, sy - size * 3, size * 6, size * 6);

      ctx.fillStyle = `rgba(255,255,255,${brightness + 0.1})`;
      ctx.fillRect(sx - size * 0.5, sy - 0.5, size, 1);
      ctx.fillRect(sx - 0.5, sy - size * 0.5, 1, size);
    }
  }

  // ─── SPORES ───

  _spawnSpores() {
    if (this.time % 10 !== 0) return;
    this._spawn("spore", {
      x: Math.random() * this.W,
      y: this.GY + Math.random() * (this.H - this.GY) * 0.5,
      size: 1.5 + Math.random() * 2.5,
      speedY: -(0.2 + Math.random() * 0.5),
      phase: Math.random() * Math.PI * 2,
      hue: 260 + Math.random() * 80,
      opacity: 0.3 + Math.random() * 0.4,
      maxAge: 400,
    });
  }

  _updateSpore(p, wind) {
    p.x += Math.sin(p.age * 0.02 + p.phase) * 0.6 + wind * 0.3;
    p.y += p.speedY;
    const fade = 1 - (p.age / p.maxAge);
    if (fade <= 0) { p.alive = false; return; }

    const { ctx } = this;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    g.addColorStop(0, `hsla(${p.hue},70%,60%,${p.opacity * fade})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
    ctx.fillStyle = `hsla(${p.hue},80%,70%,${p.opacity * fade})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── FIREFLIES ───

  _spawnFireflies() {
    if (this.time % 30 !== 0) return;
    this._spawn("firefly", {
      x: Math.random() * this.W,
      y: this.GY - 30 + Math.random() * (this.H - this.GY + 30),
      baseX: 0, baseY: 0,
      phase: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.01,
      radius: 20 + Math.random() * 40,
      opacity: 0,
      maxOpacity: 0.5 + Math.random() * 0.5,
      hue: 55 + Math.random() * 30,
      maxAge: 300 + Math.floor(Math.random() * 200),
    });
    // Save initial position
    const last = this.particles.find(p => p.alive && p.type === "firefly" && p.baseX === 0);
    if (last) { last.baseX = last.x; last.baseY = last.y; }
  }

  _updateFirefly(p) {
    const lifeRatio = p.age / p.maxAge;
    // Fade in and out
    if (lifeRatio < 0.15) p.opacity = p.maxOpacity * (lifeRatio / 0.15);
    else if (lifeRatio > 0.8) p.opacity = p.maxOpacity * (1 - (lifeRatio - 0.8) / 0.2);
    else p.opacity = p.maxOpacity * (0.7 + Math.sin(p.age * 0.1) * 0.3);

    p.x = p.baseX + Math.sin(p.age * p.speed + p.phase) * p.radius;
    p.y = p.baseY + Math.cos(p.age * p.speed * 0.7 + p.phaseY) * p.radius * 0.5;

    if (p.opacity < 0.01) return;

    const { ctx } = this;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
    g.addColorStop(0, `hsla(${p.hue},100%,70%,${p.opacity * 0.4})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 12, p.y - 12, 24, 24);
    ctx.fillStyle = `hsla(${p.hue},100%,85%,${p.opacity})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── BIRDS (ambient flying) ───

  _spawnBirds() {
    // No birds in volcano
    if (this.biome.id === "volcano") return;
    if (this.time % 90 !== 0) return;
    if (Math.random() > 0.35) return;
    const flockSize = 1 + Math.floor(Math.random() * 3);
    const baseY = this.GY * (0.12 + Math.random() * 0.35);
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < flockSize; i++) {
      this._spawn("bird", {
        x: dir === 1 ? -20 - i * 18 : this.W + 20 + i * 18,
        y: baseY + (Math.random() - 0.5) * 25,
        speedX: (1.2 + Math.random() * 1.5) * dir,
        phase: Math.random() * Math.PI * 2,
        wingPhase: Math.random() * Math.PI * 2,
        size: 3 + Math.random() * 3,
        maxAge: 700,
      });
    }
  }

  _updateBird(p) {
    p.x += p.speedX;
    p.y += Math.sin(p.age * 0.018 + p.phase) * 0.25;
    p.wingPhase += 0.13;
    if (p.x > this.W + 40 || p.x < -40) { p.alive = false; return; }

    const { ctx } = this;
    const wingY = Math.sin(p.wingPhase) * p.size * 0.7;
    const dir = p.speedX > 0 ? 1 : -1;

    ctx.strokeStyle = this.isNight ? "rgba(160,160,180,0.5)" : "rgba(30,25,15,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x - p.size * 1.2 * dir, p.y + wingY);
    ctx.quadraticCurveTo(p.x - p.size * 0.4 * dir, p.y + wingY * 0.3, p.x, p.y);
    ctx.quadraticCurveTo(p.x + p.size * 0.4 * dir, p.y + wingY * 0.3, p.x + p.size * 1.2 * dir, p.y + wingY);
    ctx.stroke();
    // Body dot
    ctx.fillStyle = this.isNight ? "rgba(140,140,160,0.6)" : "rgba(30,25,15,0.7)";
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // ─── SHOOTING STARS ───

  _spawnShootingStar() {
    if (this.time % 250 !== 0) return;
    if (Math.random() > 0.35) return;
    this._spawn("shootingstar", {
      x: Math.random() * this.W * 0.6,
      y: Math.random() * this.GY * 0.25,
      speedX: 5 + Math.random() * 7,
      speedY: 2 + Math.random() * 3,
      size: 1.5 + Math.random() * 1.5,
      opacity: 0.8 + Math.random() * 0.2,
      tailLen: 35 + Math.random() * 55,
      maxAge: 55,
    });
  }

  _updateShootingStar(p) {
    p.x += p.speedX;
    p.y += p.speedY;
    const fade = p.age < 8 ? p.age / 8 : p.age > p.maxAge - 12 ? (p.maxAge - p.age) / 12 : 1;
    if (p.x > this.W + 30 || p.y > this.GY) { p.alive = false; return; }

    const { ctx } = this;
    const angle = Math.atan2(p.speedY, p.speedX);
    const tailX = p.x - Math.cos(angle) * p.tailLen;
    const tailY = p.y - Math.sin(angle) * p.tailLen;

    // Tail gradient
    const grad = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.6, `rgba(255,255,200,${fade * 0.2})`);
    grad.addColorStop(1, `rgba(255,255,255,${fade * p.opacity})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = p.size;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Head glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    g.addColorStop(0, `rgba(255,255,255,${fade * 0.7})`);
    g.addColorStop(0.5, `rgba(200,220,255,${fade * 0.2})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
  }

  // ─── GALE DEBRIS ───

  _updateGaleDebris(p, wind) {
    p.x += p.speed + (wind || 0) * 3;
    p.y += Math.sin(p.wobble + p.age * 0.1) * 1.5;
    if (p.x > this.W + 20) { p.alive = false; return; }
    const { ctx } = this;
    const alpha = p.opacity * (1 - p.age / p.maxAge);
    ctx.strokeStyle = `rgba(200,200,180,${alpha})`;
    ctx.lineWidth = p.size * 0.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 8 - p.speed, p.y - Math.sin(p.wobble + p.age * 0.1));
    ctx.stroke();
  }

  // ─── FOG (drawn directly) ───

  _drawFog() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.003;
    const intensity = this.weather?.fxOverride?.fogIntensity || 1;
    const layers = Math.floor(4 * Math.min(intensity, 3));
    for (let i = 0; i < layers; i++) {
      const fx = (Math.sin(t + i * 2.5) * 0.3 + 0.5) * W;
      const fy = intensity > 2 ? GY - 40 + i * 30 : GY + 10 + i * 25;
      const radius = (120 + i * 20) * (1 + (intensity - 1) * 0.4);
      const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, radius);
      g.addColorStop(0, `rgba(60,80,40,${(0.06 + Math.sin(t * 2 + i) * 0.02) * intensity})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(fx - radius - 30, fy - 50, (radius + 30) * 2, 100);
    }
  }

  // ─── SUNSET GLOW (warm pulsating light for sunset beach) ───

  _drawSunsetGlow() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.008;

    // Pulsating warm horizon glow
    const intensity = 0.04 + Math.sin(t) * 0.015 + Math.sin(t * 1.7) * 0.01;
    const sunX = W * 0.55;
    const g = ctx.createRadialGradient(sunX, GY, 10, sunX, GY, W * 0.5);
    g.addColorStop(0, `rgba(255,180,60,${intensity * 1.5})`);
    g.addColorStop(0.4, `rgba(255,120,40,${intensity})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.6);

    // Sun shimmer on water surface
    const waterY = H * 0.78;
    const shimmerIntensity = 0.06 + Math.sin(t * 2.3) * 0.03;
    for (let i = 0; i < 8; i++) {
      const sx = sunX + Math.sin(t * 1.5 + i * 1.2) * 30 + (Math.sin(i * 73.37) * 0.5) * 60;
      const sy = waterY + 5 + i * 7 + Math.sin(t * 0.8 + i) * 3;
      const sw = 12 + Math.sin(t * 3 + i * 2) * 6;
      ctx.fillStyle = `rgba(255,220,100,${shimmerIntensity * (1 - i * 0.1)})`;
      ctx.fillRect(sx - sw / 2, sy, sw, 2);
    }

    // Spawn golden sparkles in air
    if (this.time % 12 === 0) {
      this._spawn("sunsetSparkle", {
        x: Math.random() * W,
        y: GY * 0.3 + Math.random() * GY * 0.6,
        size: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        opacity: 0,
        maxOpacity: 0.3 + Math.random() * 0.4,
        hue: 30 + Math.random() * 30,
        maxAge: 200 + Math.floor(Math.random() * 150),
      });
    }

    // Gentle warm color wash (overall atmosphere)
    ctx.fillStyle = `rgba(255,160,60,${0.015 + Math.sin(t * 0.5) * 0.005})`;
    ctx.fillRect(0, 0, W, H);
  }

  _updateSunsetSparkle(p) {
    const lifeRatio = p.age / p.maxAge;
    // Fade in and out with twinkle
    if (lifeRatio < 0.2) p.opacity = p.maxOpacity * (lifeRatio / 0.2);
    else if (lifeRatio > 0.7) p.opacity = p.maxOpacity * (1 - (lifeRatio - 0.7) / 0.3);
    else p.opacity = p.maxOpacity * (0.6 + Math.sin(p.age * 0.15 + p.phase) * 0.4);

    p.x += Math.sin(p.age * 0.01 + p.phase) * 0.3;
    p.y -= p.speed * 0.3;

    if (p.opacity < 0.01) return;

    const { ctx } = this;
    // Glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    g.addColorStop(0, `hsla(${p.hue},100%,80%,${p.opacity * 0.3})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
    // Core
    ctx.fillStyle = `hsla(${p.hue},100%,90%,${p.opacity})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
    // Cross sparkle
    ctx.strokeStyle = `hsla(${p.hue},100%,85%,${p.opacity * 0.6})`;
    ctx.lineWidth = 0.5;
    const sl = p.size * 1.5;
    ctx.beginPath(); ctx.moveTo(p.x - sl, p.y); ctx.lineTo(p.x + sl, p.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x, p.y - sl); ctx.lineTo(p.x, p.y + sl); ctx.stroke();
  }

  // ─── WATERFALL ANIMATION (flowing water for bamboo falls) ───

  _drawWaterfall() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.015;

    const fallX = W * 0.65;
    const fallW = 45;
    const fallTop = GY * 0.35;
    const fallBot = GY + (H - GY) * 0.52;

    // Animated water streaks
    ctx.strokeStyle = "rgba(180,255,240,0.08)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const offset = (t * 60 + i * 40) % (fallBot - fallTop);
      const sx = fallX + (Math.sin(i * 2.3) * 0.5) * fallW * 0.5;
      const sy = fallTop + offset;
      const streakLen = 15 + Math.sin(i + t) * 8;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.sin(t + i) * 3, sy + streakLen);
      ctx.stroke();
    }

    // Splash particles at base
    if (this.time % 4 === 0) {
      this._spawn("waterfallDrop", {
        x: fallX + (Math.random() - 0.5) * fallW * 1.2,
        y: fallBot,
        vx: (Math.random() - 0.5) * 2,
        vy: -(1.5 + Math.random() * 2.5),
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.3 + Math.random() * 0.3,
        maxAge: 40 + Math.floor(Math.random() * 30),
      });
    }

    // Rising mist at base
    if (this.time % 10 === 0) {
      this._spawn("waterfallMist", {
        x: fallX + (Math.random() - 0.5) * fallW * 2,
        y: fallBot + 5 + Math.random() * 10,
        size: 15 + Math.random() * 25,
        speedY: -(0.15 + Math.random() * 0.25),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: 0.06 + Math.random() * 0.06,
        maxAge: 200 + Math.floor(Math.random() * 100),
      });
    }

    // Pool surface ripples
    const poolY = fallBot;
    const poolCenterX = fallX;
    ctx.strokeStyle = "rgba(150,255,220,0.06)";
    ctx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring++) {
      const rt = ((t * 0.8 + ring * 1.5) % 4) / 4;
      const r = 8 + rt * 60;
      const alpha = (1 - rt) * 0.08;
      ctx.strokeStyle = `rgba(150,255,220,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(poolCenterX, poolY + 8, r, r * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _updateWaterfallDrop(p) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravity
    const fade = 1 - p.age / p.maxAge;
    if (fade <= 0) { p.alive = false; return; }

    const { ctx } = this;
    ctx.fillStyle = `rgba(180,255,240,${p.opacity * fade})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2); ctx.fill();
    // Small glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
    g.addColorStop(0, `rgba(200,255,240,${p.opacity * fade * 0.3})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
  }

  _updateWaterfallMist(p) {
    p.x += p.speedX + Math.sin(p.age * 0.015) * 0.2;
    p.y += p.speedY;
    p.size += 0.05; // slowly expand
    const fade = 1 - p.age / p.maxAge;
    if (fade <= 0) { p.alive = false; return; }

    const { ctx } = this;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    g.addColorStop(0, `rgba(180,240,220,${p.opacity * fade})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
  }

  // ─── AURORA BOREALIS ───
  _drawAurora() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.004;
    const bandCount = 4;
    for (let b = 0; b < bandCount; b++) {
      const yBase = GY * 0.05 + b * (GY * 0.12);
      const hue = (120 + b * 40 + this.time * 0.3) % 360;
      ctx.beginPath();
      ctx.moveTo(0, yBase);
      for (let x = 0; x <= W; x += 8) {
        const wave = Math.sin(x * 0.005 + t + b * 1.5) * 18 + Math.sin(x * 0.012 + t * 1.3 + b) * 10;
        ctx.lineTo(x, yBase + wave);
      }
      ctx.lineTo(W, yBase + 40);
      ctx.lineTo(0, yBase + 40);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, yBase, 0, yBase + 40);
      const alpha = 0.06 + Math.sin(t * 2 + b) * 0.02;
      grad.addColorStop(0, `hsla(${hue},80%,60%,${alpha})`);
      grad.addColorStop(0.5, `hsla(${hue + 20},70%,50%,${alpha * 1.5})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // ─── LIGHTNING FLASH (ambient, not weather) ───
  _spawnLightningFlash() {
    if (Math.random() > 0.002) return;
    const { ctx, W, H } = this;
    // Brief white flash
    ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
    ctx.fillRect(0, 0, W, H);
    // Draw a quick bolt
    const x = W * 0.2 + Math.random() * W * 0.6;
    const y = 0;
    ctx.strokeStyle = `rgba(200,220,255,${0.15 + Math.random() * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x, cy = y;
    const segments = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < segments; i++) {
      cx += (Math.random() - 0.5) * 30;
      cy += 15 + Math.random() * 25;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    // Glow around bolt
    ctx.strokeStyle = `rgba(160,180,255,0.06)`;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  // ─── JELLYFISH (underwater biome) ───
  _spawnJellyfish() {
    if (this.time % 80 !== 0) return;
    this._spawn("jellyfish", {
      x: Math.random() * this.W,
      y: this.H + 20,
      size: 8 + Math.random() * 12,
      speed: -(0.2 + Math.random() * 0.3),
      wobble: Math.random() * Math.PI * 2,
      hue: 200 + Math.random() * 120,
      opacity: 0.15 + Math.random() * 0.15,
      maxAge: 600 + Math.floor(Math.random() * 300),
      tentaclePhase: Math.random() * Math.PI * 2,
    });
  }

  _updateJellyfish(p) {
    p.y += p.speed;
    p.x += Math.sin(p.age * 0.01 + p.wobble) * 0.4;
    p.tentaclePhase += 0.03;
    const fade = Math.min(1, p.age / 60) * Math.max(0, 1 - p.age / p.maxAge);
    if (fade <= 0) { p.alive = false; return; }

    const { ctx } = this;
    const a = p.opacity * fade;
    // Bell (dome)
    ctx.fillStyle = `hsla(${p.hue},70%,65%,${a})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.size, p.size * 0.65, 0, Math.PI, 0);
    ctx.fill();
    // Inner glow
    const g = ctx.createRadialGradient(p.x, p.y - p.size * 0.2, 0, p.x, p.y, p.size);
    g.addColorStop(0, `hsla(${p.hue},90%,80%,${a * 0.5})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    // Tentacles
    ctx.strokeStyle = `hsla(${p.hue},60%,60%,${a * 0.6})`;
    ctx.lineWidth = 0.8;
    for (let t = 0; t < 5; t++) {
      const tx = p.x + (t - 2) * (p.size * 0.35);
      ctx.beginPath();
      ctx.moveTo(tx, p.y);
      for (let s = 1; s <= 4; s++) {
        const sy = p.y + s * p.size * 0.4;
        const sx = tx + Math.sin(p.tentaclePhase + t + s * 0.8) * 3;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  }

  // ─── ASH / VOLCANIC ASH ───
  _spawnAsh() {
    if (this.time % 3 !== 0) return;
    this._spawn("ash", {
      x: Math.random() * this.W,
      y: -5,
      speed: 0.5 + Math.random() * 1,
      drift: (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2.5,
      opacity: 0.2 + Math.random() * 0.3,
      maxAge: 250 + Math.floor(Math.random() * 100),
      rot: Math.random() * Math.PI * 2,
    });
  }

  _updateAsh(p, wind) {
    p.y += p.speed;
    p.x += p.drift + wind * 0.3 + Math.sin(p.age * 0.02 + p.rot) * 0.3;
    p.rot += 0.02;
    const fade = 1 - p.age / p.maxAge;
    if (fade <= 0 || p.y > this.H) { p.alive = false; return; }

    const { ctx } = this;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `rgba(80,70,60,${p.opacity * fade})`;
    ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
    ctx.restore();
  }

  // ─── FLOWER PETALS ───
  _spawnPetals() {
    if (this.time % 25 !== 0) return;
    const colors = ["255,180,200", "255,200,220", "255,160,180", "240,200,210"];
    this._spawn("petal", {
      x: -10 + Math.random() * (this.W + 20),
      y: -10,
      speed: 0.4 + Math.random() * 0.6,
      drift: 0.3 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      wobble: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      rot: Math.random() * Math.PI * 2,
      maxAge: 400 + Math.floor(Math.random() * 200),
    });
  }

  _updatePetal(p, wind) {
    p.y += p.speed;
    p.x += p.drift + wind * 0.4 + Math.sin(p.age * 0.015 + p.wobble) * 0.8;
    p.rot += p.spin;
    const fade = 1 - p.age / p.maxAge;
    if (fade <= 0 || p.y > this.H) { p.alive = false; return; }

    const { ctx } = this;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `rgba(${p.color},${p.opacity * fade})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─── SEAGULLS (flocking, circling) ───
  _spawnSeagulls() {
    if (this.time % 200 !== 0 || Math.random() > 0.5) return;
    const cx = Math.random() * this.W;
    const cy = this.GY * 0.2 + Math.random() * this.GY * 0.3;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this._spawn("seagull", {
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        centerX: cx,
        centerY: cy,
        angle: Math.random() * Math.PI * 2,
        radius: 20 + Math.random() * 40,
        speed: 0.008 + Math.random() * 0.006,
        wingPhase: Math.random() * Math.PI * 2,
        size: 4 + Math.random() * 3,
        maxAge: 500 + Math.floor(Math.random() * 300),
      });
    }
  }

  _updateSeagull(p) {
    p.angle += p.speed;
    p.wingPhase += 0.08;
    p.centerX += 0.15; // drift right
    p.x = p.centerX + Math.cos(p.angle) * p.radius;
    p.y = p.centerY + Math.sin(p.angle) * p.radius * 0.4;
    const fade = Math.min(1, p.age / 40) * Math.max(0, 1 - (p.age - p.maxAge + 60) / 60);
    if (p.age > p.maxAge) { p.alive = false; return; }

    const { ctx } = this;
    const wing = Math.sin(p.wingPhase) * p.size * 0.6;
    ctx.strokeStyle = `rgba(220,220,220,${0.5 * Math.min(1, fade)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x - p.size, p.y + wing);
    ctx.quadraticCurveTo(p.x - p.size * 0.3, p.y - wing * 0.5, p.x, p.y);
    ctx.quadraticCurveTo(p.x + p.size * 0.3, p.y - wing * 0.5, p.x + p.size, p.y + wing);
    ctx.stroke();
    // Body dot
    ctx.fillStyle = `rgba(240,240,240,${0.4 * Math.min(1, fade)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // ─── DOLPHINS (jumping arcs) ───
  _spawnDolphins() {
    if (this.time % 300 !== 0 || Math.random() > 0.4) return;
    const startX = -30 + Math.random() * this.W * 0.3;
    const waterY = this.H - this.GY * 0.3;
    this._spawn("dolphin", {
      x: startX,
      y: waterY,
      startX: startX,
      waterY: waterY,
      speed: 1.5 + Math.random() * 1,
      jumpHeight: 30 + Math.random() * 25,
      jumpWidth: 80 + Math.random() * 40,
      phase: 0,
      size: 6 + Math.random() * 4,
      maxAge: 120,
    });
  }

  _updateDolphin(p) {
    p.phase += 0.03;
    const progress = p.phase / Math.PI;
    p.x = p.startX + progress * p.jumpWidth;
    p.y = p.waterY - Math.sin(p.phase) * p.jumpHeight;
    if (p.phase > Math.PI) { p.alive = false; return; }

    const { ctx } = this;
    const alpha = Math.sin(p.phase) * 0.6;
    // Body arc
    ctx.fillStyle = `rgba(100,130,160,${alpha})`;
    ctx.beginPath();
    const angle = Math.atan2(-Math.cos(p.phase) * p.jumpHeight, p.jumpWidth / Math.PI);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fin
    ctx.fillStyle = `rgba(80,110,140,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-p.size * 0.3, -p.size * 0.4);
    ctx.lineTo(0, -p.size);
    ctx.lineTo(p.size * 0.3, -p.size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Splash at entry/exit
    if (p.phase < 0.3 || p.phase > Math.PI - 0.3) {
      ctx.fillStyle = `rgba(180,220,255,${0.3 * alpha})`;
      for (let i = 0; i < 3; i++) {
        const sx = p.x + (Math.random() - 0.5) * p.size * 2;
        const sy = p.waterY + Math.random() * 5;
        ctx.beginPath(); ctx.arc(sx, sy, 1 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ─── COMETS (slow streaks across sky) ───
  _spawnComets() {
    if (this.time % 400 !== 0 || Math.random() > 0.35) return;
    this._spawn("comet", {
      x: -20,
      y: 10 + Math.random() * this.GY * 0.3,
      speed: 1.5 + Math.random() * 2,
      angle: -0.15 + Math.random() * 0.3,
      size: 2 + Math.random() * 2,
      tailLen: 30 + Math.random() * 40,
      hue: Math.random() < 0.5 ? 30 : 200,
      opacity: 0.3 + Math.random() * 0.3,
      maxAge: 250,
    });
  }

  _updateComet(p) {
    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed;
    if (p.x > this.W + 50) { p.alive = false; return; }
    const fade = Math.min(1, p.age / 20) * Math.max(0, 1 - p.age / p.maxAge);
    if (fade <= 0) { p.alive = false; return; }

    const { ctx } = this;
    // Tail gradient
    const tailX = p.x - Math.cos(p.angle) * p.tailLen;
    const tailY = p.y - Math.sin(p.angle) * p.tailLen;
    const grad = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, `hsla(${p.hue},80%,70%,${p.opacity * fade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = p.size * 0.8;
    ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(p.x, p.y); ctx.stroke();
    // Head glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    g.addColorStop(0, `hsla(${p.hue},90%,85%,${p.opacity * fade * 0.5})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
    // Core
    ctx.fillStyle = `hsla(${p.hue},60%,95%,${p.opacity * fade})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }

  // ─── DUST DEVIL (rotating column) ───
  _drawDustDevil() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.005;
    const cx = W * 0.3 + Math.sin(t * 0.7) * W * 0.2;
    const baseY = GY + (H - GY) * 0.6;

    for (let i = 0; i < 12; i++) {
      const yOff = i * 8;
      const angle = t * 3 + i * 0.5;
      const radius = 5 + i * 2 + Math.sin(t + i) * 3;
      const px = cx + Math.cos(angle) * radius;
      const py = baseY - yOff;
      const alpha = 0.05 + (1 - i / 12) * 0.08;
      ctx.fillStyle = `rgba(180,160,120,${alpha})`;
      ctx.beginPath(); ctx.arc(px, py, 2 + i * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    // Ground dust ring
    ctx.strokeStyle = "rgba(180,160,120,0.06)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 15 + Math.sin(t) * 5, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ─── HEAT SHIMMER (desert mirage) ───
  _drawHeatShimmer() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.01;
    const shimmerY = GY + (H - GY) * 0.3;
    // Distortion lines
    ctx.strokeStyle = "rgba(255,240,200,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = shimmerY + i * 12;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const dy = Math.sin(x * 0.02 + t * 2 + i) * 3;
        if (x === 0) ctx.moveTo(x, yy + dy);
        else ctx.lineTo(x, yy + dy);
      }
      ctx.stroke();
    }
    // Mirage glow at horizon
    const grad = ctx.createLinearGradient(0, shimmerY - 20, 0, shimmerY + 30);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, `rgba(255,240,200,${0.03 + Math.sin(t) * 0.01})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, shimmerY - 20, W, 50);
  }

  // ─── FLOATING LANTERNS ───
  _spawnLanterns() {
    if (this.time % 120 !== 0 || Math.random() > 0.6) return;
    this._spawn("lantern", {
      x: this.W * 0.1 + Math.random() * this.W * 0.8,
      y: this.H * 0.8,
      speed: -(0.15 + Math.random() * 0.2),
      drift: (Math.random() - 0.5) * 0.2,
      size: 4 + Math.random() * 4,
      flicker: Math.random() * Math.PI * 2,
      hue: 20 + Math.random() * 30,
      opacity: 0.25 + Math.random() * 0.2,
      maxAge: 600 + Math.floor(Math.random() * 400),
    });
  }

  _updateLantern(p, wind) {
    p.y += p.speed;
    p.x += p.drift + wind * 0.1 + Math.sin(p.age * 0.008) * 0.3;
    p.flicker += 0.1;
    const fade = Math.min(1, p.age / 80) * Math.max(0, 1 - p.age / p.maxAge);
    if (fade <= 0 || p.y < -20) { p.alive = false; return; }

    const { ctx } = this;
    const flick = 0.8 + Math.sin(p.flicker) * 0.2;
    const a = p.opacity * fade * flick;
    // Outer glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    g.addColorStop(0, `hsla(${p.hue},80%,60%,${a * 0.3})`);
    g.addColorStop(0.5, `hsla(${p.hue},70%,50%,${a * 0.1})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
    // Lantern body
    ctx.fillStyle = `hsla(${p.hue},70%,40%,${a * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(p.x - p.size * 0.6, p.y + p.size);
    ctx.quadraticCurveTo(p.x - p.size, p.y, p.x, p.y - p.size * 0.8);
    ctx.quadraticCurveTo(p.x + p.size, p.y, p.x + p.size * 0.6, p.y + p.size);
    ctx.closePath();
    ctx.fill();
    // Inner flame
    ctx.fillStyle = `hsla(${p.hue},90%,70%,${a})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.35 * flick, 0, Math.PI * 2); ctx.fill();
  }

  // ─── WATER RIPPLES (for ocean/lagoon) ───
  _drawRipples() {
    const { ctx, W, H, GY } = this;
    const t = this.time * 0.008;
    const waterY = GY + (H - GY) * 0.4;
    ctx.strokeStyle = "rgba(160,220,255,0.04)";
    ctx.lineWidth = 1;
    for (let r = 0; r < 6; r++) {
      const rt = ((t + r * 0.8) % 3) / 3;
      const radius = 10 + rt * 80;
      const alpha = (1 - rt) * 0.06;
      const cx = W * (0.2 + r * 0.12);
      const cy = waterY + Math.sin(t + r) * 8;
      ctx.strokeStyle = `rgba(160,220,255,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, radius * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

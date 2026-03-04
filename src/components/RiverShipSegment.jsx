import React, { useRef, useEffect, useCallback, useState } from "react";
import { RIVER_OBSTACLES, RIVER_WAVE_PATTERNS, getRiverSegmentConfig, getRiverRewards } from "../data/riverSegment";
import GameIcon from "./GameIcon";

// Ship river mini-game: player sails upward, dodges obstacles, shoots cannon
// Self-contained component — uses its own canvas + game loop

const CANVAS_W = 1280;
const CANVAS_H = 720;
const SHIP_W = 80;
const SHIP_H = 100;
const BULLET_R = 6;
const BULLET_SPEED = 10;

let obstacleIdCounter = 0;

function pickObstacleType(progress) {
  const pattern = RIVER_WAVE_PATTERNS.find(p => progress >= p.minDist && progress < p.maxDist)
    || RIVER_WAVE_PATTERNS[RIVER_WAVE_PATTERNS.length - 1];
  const typeId = pattern.types[Math.floor(Math.random() * pattern.types.length)];
  return RIVER_OBSTACLES.find(o => o.id === typeId) || RIVER_OBSTACLES[0];
}

// Deterministic pseudo-random for consistent wave shapes
function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

export default function RiverShipSegment({ roomNumber, onComplete, isMobile, shipUpgrades = [] }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [phase, setPhase] = useState("playing"); // playing | complete | failed
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, score: 0, time: 0, maxTime: 15 });
  const keysRef = useRef({ left: false, right: false, up: false, down: false, shoot: false });
  const touchRef = useRef({ active: false, x: 0, y: 0 });
  const lastShotRef = useRef(0);

  // Initialize game state
  useEffect(() => {
    const cfg = getRiverSegmentConfig(roomNumber);
    const hasHull1 = shipUpgrades.includes("hull_1");
    const hasHull2 = shipUpgrades.includes("hull_2");
    const hasSails1 = shipUpgrades.includes("sails_1");
    const hasSails2 = shipUpgrades.includes("sails_2");
    const hasCannons1 = shipUpgrades.includes("cannons_1");
    const hasCannons2 = shipUpgrades.includes("cannons_2");
    const hpBonus = (hasHull1 ? 15 : 0) + (hasHull2 ? 30 : 0);
    const speedBonus = (hasSails1 ? 0.8 : 0) + (hasSails2 ? 1.2 : 0);
    const dmgBonus = (hasCannons1 ? 1 : 0) + (hasCannons2 ? 2 : 0);

    const maxHp = cfg.shipHp + hpBonus;
    stateRef.current = {
      shipX: CANVAS_W / 2,
      shipY: CANVAS_H - 130,
      shipHp: maxHp,
      shipMaxHp: maxHp,
      shipSpeed: cfg.shipSpeed + speedBonus,
      cannonDamage: cfg.cannonDamage + dmgBonus,
      cannonCooldown: cfg.cannonCooldown,
      scrollSpeed: cfg.scrollSpeed,
      scrollOffset: 0,
      obstacles: [],
      bullets: [],
      particles: [],
      wakes: [], // ship wake trail
      score: 0,
      elapsed: 0,
      segmentLength: cfg.segmentLength,
      spawnTimer: 0,
      spawnRate: cfg.obstacleSpawnRate,
      difficulty: cfg.difficulty,
      invulnTimer: 0,
      done: false,
      waterOffset: 0,
      shipTilt: 0, // visual tilt from movement
    };
    setHud({ hp: maxHp, maxHp, score: 0, time: 0, maxTime: cfg.segmentLength });
  }, [roomNumber, shipUpgrades]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e, down) => {
      const k = keysRef.current;
      switch (e.key) {
        case "ArrowLeft": case "a": case "A": k.left = down; break;
        case "ArrowRight": case "d": case "D": k.right = down; break;
        case "ArrowUp": case "w": case "W": k.up = down; break;
        case "ArrowDown": case "s": case "S": k.down = down; break;
        case " ": case "Enter": k.shoot = down; break;
      }
    };
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  // Touch controls
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current = { active: true, x: t.clientX - rect.left, y: t.clientY - rect.top };
  }, []);
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current = { active: true, x: t.clientX - rect.left, y: t.clientY - rect.top };
  }, []);
  const handleTouchEnd = useCallback(() => { touchRef.current.active = false; }, []);

  // Mouse click = shoot toward cursor
  const handleClick = useCallback((e) => {
    const s = stateRef.current;
    if (!s || s.done) return;
    const now = performance.now();
    if (now - lastShotRef.current < s.cannonCooldown) return;
    lastShotRef.current = now;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const dx = clickX - s.shipX;
    const dy = clickY - s.shipY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    s.bullets.push({
      x: s.shipX, y: s.shipY - SHIP_H / 2,
      vx: (dx / dist) * BULLET_SPEED,
      vy: (dy / dist) * BULLET_SPEED,
      damage: s.cannonDamage, trail: [],
    });
  }, []);

  // Main game loop
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (now) => {
      const s = stateRef.current;
      if (!s || s.done) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      s.elapsed += dt;
      const progress = s.elapsed / s.segmentLength;

      // Completion
      if (s.elapsed >= s.segmentLength) {
        s.done = true;
        setPhase("complete");
        const rewards = getRiverRewards(roomNumber, s.shipHp, s.shipMaxHp, s.score);
        setHud(h => ({ ...h, hp: s.shipHp, score: s.score, time: s.segmentLength }));
        setTimeout(() => onComplete({ success: true, rewards, hpRemaining: s.shipHp, maxHp: s.shipMaxHp, score: s.score }), 2000);
        return;
      }

      // Ship movement
      const k = keysRef.current;
      const spd = s.shipSpeed * 60 * dt;
      let moveX = 0;
      if (k.left) { s.shipX -= spd; moveX = -1; }
      if (k.right) { s.shipX += spd; moveX = 1; }
      if (k.up) s.shipY -= spd * 0.7;
      if (k.down) s.shipY += spd * 0.7;

      // Ship tilt from horizontal movement
      const targetTilt = moveX * 0.15;
      s.shipTilt += (targetTilt - s.shipTilt) * 0.1;

      // Auto-shoot when holding space
      if (k.shoot) {
        const shootNow = performance.now();
        if (shootNow - lastShotRef.current >= s.cannonCooldown) {
          lastShotRef.current = shootNow;
          s.bullets.push({
            x: s.shipX, y: s.shipY - SHIP_H / 2,
            vx: 0, vy: -BULLET_SPEED, damage: s.cannonDamage, trail: [],
          });
        }
      }

      // Touch movement
      if (touchRef.current.active && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const tx = touchRef.current.x * scaleX;
        const ty = touchRef.current.y * scaleY;
        const dx = tx - s.shipX;
        const dy = ty - s.shipY;
        s.shipX += dx * 0.12;
        s.shipY += dy * 0.12;
        s.shipTilt += ((dx > 5 ? 0.12 : dx < -5 ? -0.12 : 0) - s.shipTilt) * 0.08;
        const shootNow = performance.now();
        if (shootNow - lastShotRef.current >= s.cannonCooldown) {
          lastShotRef.current = shootNow;
          s.bullets.push({
            x: s.shipX, y: s.shipY - SHIP_H / 2,
            vx: 0, vy: -BULLET_SPEED, damage: s.cannonDamage, trail: [],
          });
        }
      }

      // Clamp ship
      s.shipX = Math.max(SHIP_W / 2 + 40, Math.min(CANVAS_W - SHIP_W / 2 - 40, s.shipX));
      s.shipY = Math.max(SHIP_H + 10, Math.min(CANVAS_H - 50, s.shipY));

      // Wake trail
      if (Math.random() < 0.6) {
        s.wakes.push({
          x: s.shipX + (Math.random() - 0.5) * 20,
          y: s.shipY + SHIP_H * 0.4,
          life: 1.0, size: 6 + Math.random() * 8,
        });
      }
      for (let i = s.wakes.length - 1; i >= 0; i--) {
        s.wakes[i].y += s.scrollSpeed * 30 * dt;
        s.wakes[i].life -= dt * 0.8;
        s.wakes[i].size += dt * 8;
        if (s.wakes[i].life <= 0) s.wakes.splice(i, 1);
      }

      // Scroll water
      s.waterOffset = (s.waterOffset + s.scrollSpeed * 60 * dt) % 80;

      // Spawn obstacles
      s.spawnTimer -= dt * 1000;
      if (s.spawnTimer <= 0) {
        const template = pickObstacleType(progress);
        const ob = {
          ...template,
          uid: ++obstacleIdCounter,
          x: 60 + Math.random() * (CANVAS_W - 120),
          y: -template.height,
          currentHp: template.hp,
          rotation: template.pulls ? Math.random() * Math.PI * 2 : 0,
          hitFlash: 0,
          rockSeed: Math.floor(Math.random() * 10000),
        };
        s.obstacles.push(ob);
        s.spawnTimer = s.spawnRate * (0.7 + Math.random() * 0.6);
      }

      // Update obstacles
      const scrollDy = s.scrollSpeed * 60 * dt;
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const ob = s.obstacles[i];
        ob.y += scrollDy;
        if (ob.pulls) ob.rotation += dt * 2.5;
        if (ob.hitFlash > 0) ob.hitFlash -= dt * 5;

        // Whirlpool pull
        if (ob.pulls) {
          const dx = ob.x - s.shipX;
          const dy = ob.y - s.shipY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150 && dist > 10) {
            const pullForce = ob.pullStrength * (1 - dist / 150) * 60 * dt;
            s.shipX += (dx / dist) * pullForce;
            s.shipY += (dy / dist) * pullForce;
          }
        }

        if (ob.y > CANVAS_H + 100) { s.obstacles.splice(i, 1); continue; }

        // Ship collision
        if (s.invulnTimer <= 0) {
          const dx = ob.x - s.shipX;
          const dy = ob.y - s.shipY;
          const collideR = (ob.width + SHIP_W) * 0.3;
          if (dx * dx + dy * dy < collideR * collideR && ob.damage > 0) {
            s.shipHp -= ob.damage;
            s.invulnTimer = 0.8;
            for (let p = 0; p < 12; p++) {
              s.particles.push({
                x: s.shipX + (Math.random() - 0.5) * 30, y: s.shipY + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                life: 0.6 + Math.random() * 0.4,
                color: ob.explodes ? "#ff6020" : "#8ac8ff",
                size: 3 + Math.random() * 5, type: ob.explodes ? "fire" : "splash",
              });
            }
            if (ob.explodes) { s.obstacles.splice(i, 1); continue; }
            if (s.shipHp <= 0) {
              s.shipHp = 0; s.done = true;
              setPhase("failed");
              setHud(h => ({ ...h, hp: 0, score: s.score, time: s.elapsed }));
              setTimeout(() => onComplete({ success: false, rewards: { copper: Math.round(s.score * 0.5) }, hpRemaining: 0, maxHp: s.shipMaxHp, score: s.score }), 2000);
              return;
            }
          }
        }
      }

      if (s.invulnTimer > 0) s.invulnTimer -= dt;

      // Update bullets
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.x += b.vx * 60 * dt;
        b.y += b.vy * 60 * dt;
        // Store trail positions
        b.trail.push({ x: b.x, y: b.y, life: 0.3 });
        if (b.trail.length > 8) b.trail.shift();
        for (let t = b.trail.length - 1; t >= 0; t--) {
          b.trail[t].life -= dt * 2;
          if (b.trail[t].life <= 0) b.trail.splice(t, 1);
        }
        if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
          s.bullets.splice(i, 1); continue;
        }
        let hitOb = false;
        for (let j = s.obstacles.length - 1; j >= 0; j--) {
          const ob = s.obstacles[j];
          if (!ob.destroyable) continue;
          const dx = b.x - ob.x;
          const dy = b.y - ob.y;
          const hitR = ob.width * 0.4;
          if (dx * dx + dy * dy < hitR * hitR) {
            ob.currentHp -= b.damage;
            ob.hitFlash = 1;
            hitOb = true;
            if (ob.currentHp <= 0) {
              s.score += ob.score;
              for (let p = 0; p < 10; p++) {
                s.particles.push({
                  x: ob.x + (Math.random() - 0.5) * ob.width * 0.5,
                  y: ob.y + (Math.random() - 0.5) * ob.height * 0.5,
                  vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2,
                  life: 0.5 + Math.random() * 0.4,
                  color: ob.loot ? "#ffd700" : ob.explodes ? "#ff4020" : "#7a7a7a",
                  size: 4 + Math.random() * 6,
                  type: ob.loot ? "sparkle" : ob.explodes ? "fire" : "debris",
                });
              }
              if (ob.loot) s.score += 20;
              s.obstacles.splice(j, 1);
            }
            break;
          }
        }
        if (hitOb) s.bullets.splice(i, 1);
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        if (p.type === "fire") p.vy -= dt * 2;
        if (p.type === "splash") p.vy += dt * 3;
        p.life -= dt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      setHud({
        hp: s.shipHp, maxHp: s.shipMaxHp, score: s.score,
        time: Math.round(s.elapsed), maxTime: s.segmentLength,
      });

      render(s, progress);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [roomNumber, onComplete]);

  // ── RENDERING ──────────────────────────────────────────────────────────
  const render = useCallback((s, progress) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ── OCEAN BACKGROUND ──
    // Deep water gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#04203a");
    grad.addColorStop(0.3, "#083050");
    grad.addColorStop(0.7, "#0a2848");
    grad.addColorStop(1, "#061828");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Caustic light patterns (underwater light reflections)
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 12; i++) {
      const cx = (i * 137 + s.elapsed * 20) % (CANVAS_W + 200) - 100;
      const cy = (i * 193 + s.waterOffset * 2 + Math.sin(s.elapsed + i) * 40) % (CANVAS_H + 100) - 50;
      const r = 40 + Math.sin(s.elapsed * 0.7 + i * 2.3) * 20;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      cg.addColorStop(0, "#60c0ff");
      cg.addColorStop(1, "transparent");
      ctx.fillStyle = cg;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;

    // Ocean wave layers (multiple sine waves for realism)
    for (let layer = 0; layer < 3; layer++) {
      const alpha = [0.08, 0.06, 0.04][layer];
      const freq = [0.008, 0.012, 0.018][layer];
      const amp = [10, 6, 4][layer];
      const speed = [40, 60, 80][layer];
      const lw = [3, 2, 1.5][layer];
      ctx.strokeStyle = `rgba(100, 180, 240, ${alpha})`;
      ctx.lineWidth = lw;
      for (let y = -40 + (s.waterOffset * (layer + 1) * 0.5 % 50); y < CANVAS_H + 40; y += 35 + layer * 10) {
        ctx.beginPath();
        for (let x = 0; x <= CANVAS_W; x += 8) {
          const wy = y + Math.sin((x + s.elapsed * speed) * freq) * amp
                       + Math.sin((x * 0.7 + s.elapsed * speed * 0.6) * freq * 1.5) * amp * 0.5;
          x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
    }

    // Foam/sparkle on wave crests
    ctx.fillStyle = "rgba(200,230,255,0.3)";
    for (let y = -20 + (s.waterOffset % 70); y < CANVAS_H + 20; y += 70) {
      for (let x = 0; x < CANVAS_W; x += 50) {
        const wy = y + Math.sin((x + s.elapsed * 50) * 0.01) * 8;
        const sparkle = Math.sin(s.elapsed * 3 + x * 0.05 + y * 0.03);
        if (sparkle > 0.7) {
          ctx.globalAlpha = (sparkle - 0.7) * 2;
          ctx.beginPath();
          ctx.arc(x + Math.sin(y) * 10, wy, 1.5 + sparkle, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // ── RIVER BANKS ──
    const bankBase = 35;
    // Left bank
    ctx.fillStyle = "#1a3a10";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let y = 0; y <= CANVAS_H; y += 20) {
      const bx = bankBase + Math.sin((y + s.waterOffset) * 0.04) * 12 + Math.sin((y + s.waterOffset) * 0.09) * 5;
      ctx.lineTo(bx, y);
    }
    ctx.lineTo(0, CANVAS_H);
    ctx.closePath();
    ctx.fill();
    // Left bank vegetation
    ctx.fillStyle = "#2a5a18";
    for (let y = -30 + (s.waterOffset % 45); y < CANVAS_H + 30; y += 45) {
      const bx = bankBase + Math.sin((y + s.waterOffset) * 0.04) * 12;
      ctx.beginPath();
      ctx.arc(bx + 2, y, 14 + Math.sin(y * 0.3) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Left bank foam
    ctx.strokeStyle = "rgba(180,220,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y <= CANVAS_H; y += 4) {
      const bx = bankBase + Math.sin((y + s.waterOffset) * 0.04) * 12 + Math.sin((y + s.waterOffset) * 0.09) * 5 + 3;
      y === 0 ? ctx.moveTo(bx, y) : ctx.lineTo(bx, y);
    }
    ctx.stroke();

    // Right bank
    ctx.fillStyle = "#1a3a10";
    ctx.beginPath();
    ctx.moveTo(CANVAS_W, 0);
    for (let y = 0; y <= CANVAS_H; y += 20) {
      const bx = CANVAS_W - bankBase - Math.sin((y + s.waterOffset + 100) * 0.035) * 12 - Math.sin((y + s.waterOffset) * 0.08) * 6;
      ctx.lineTo(bx, y);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a5a18";
    for (let y = -10 + (s.waterOffset % 50); y < CANVAS_H + 30; y += 50) {
      const bx = CANVAS_W - bankBase - Math.sin((y + s.waterOffset + 100) * 0.035) * 12;
      ctx.beginPath();
      ctx.arc(bx - 2, y, 13 + Math.sin(y * 0.4) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(180,220,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y <= CANVAS_H; y += 4) {
      const bx = CANVAS_W - bankBase - Math.sin((y + s.waterOffset + 100) * 0.035) * 12 - Math.sin((y + s.waterOffset) * 0.08) * 6 - 3;
      y === 0 ? ctx.moveTo(bx, y) : ctx.lineTo(bx, y);
    }
    ctx.stroke();

    // ── WAKE TRAIL ──
    for (const w of s.wakes) {
      ctx.globalAlpha = w.life * 0.35;
      ctx.strokeStyle = "rgba(180,220,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── OBSTACLES ──
    for (const ob of s.obstacles) {
      ctx.save();
      ctx.translate(ob.x, ob.y);

      if (ob.pulls) {
        // Whirlpool — concentric animated rings
        ctx.rotate(ob.rotation);
        const r = ob.width * 0.45;
        for (let ring = 0; ring < 5; ring++) {
          const rr = r * (ring + 1) / 5;
          ctx.strokeStyle = `rgba(40, 120, 200, ${0.5 - ring * 0.08})`;
          ctx.lineWidth = 2.5 - ring * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Spiral arms
        ctx.strokeStyle = "rgba(60,160,220,0.4)";
        ctx.lineWidth = 2;
        for (let arm = 0; arm < 3; arm++) {
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 3; a += 0.15) {
            const sr = 4 + a * (r / (Math.PI * 3));
            const angle = a + (arm * Math.PI * 2 / 3);
            const px = Math.cos(angle) * sr;
            const py = Math.sin(angle) * sr;
            a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        // Center dark
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        cg.addColorStop(0, "rgba(5,15,30,0.8)");
        cg.addColorStop(1, "transparent");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (ob.id.startsWith("island")) {
        // Island — sand base + vegetation + water shadow
        // Water shadow
        ctx.fillStyle = "rgba(0,20,40,0.3)";
        ctx.beginPath();
        ctx.ellipse(4, 4, ob.width * 0.48, ob.height * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sand/shore
        ctx.fillStyle = ob.hitFlash > 0 ? "#fff" : "#c8b070";
        ctx.beginPath();
        ctx.ellipse(0, 0, ob.width * 0.45, ob.height * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        // Beach edge foam
        ctx.strokeStyle = "rgba(220,240,255,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, ob.width * 0.47, ob.height * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Green vegetation
        const treeCount = ob.id === "island_large" ? 5 : 3;
        const rng = seededRand(ob.rockSeed);
        for (let t = 0; t < treeCount; t++) {
          const tx = (rng() - 0.5) * ob.width * 0.5;
          const ty = (rng() - 0.5) * ob.height * 0.4;
          const ts = 8 + rng() * 10;
          // Trunk
          ctx.fillStyle = "#5a3a1a";
          ctx.fillRect(tx - 1.5, ty, 3, ts * 0.6);
          // Foliage
          ctx.fillStyle = `rgb(${30 + rng() * 40}, ${80 + rng() * 60}, ${20 + rng() * 30})`;
          ctx.beginPath();
          ctx.arc(tx, ty - 2, ts * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(${20 + rng() * 30}, ${100 + rng() * 50}, ${15 + rng() * 20}, 0.7)`;
          ctx.beginPath();
          ctx.arc(tx + 3, ty + 2, ts * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (ob.id === "mine") {
        // Sea mine — spherical with horns
        const flash = ob.hitFlash > 0;
        // Chain below
        ctx.strokeStyle = "#3a3a3a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ob.height * 0.3);
        ctx.lineTo(0, ob.height * 0.5);
        ctx.stroke();
        // Body
        ctx.fillStyle = flash ? "#fff" : "#2a2a2a";
        ctx.beginPath();
        ctx.arc(0, 0, ob.width * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4a4a4a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Metal bands
        ctx.strokeStyle = flash ? "#fff" : "#555";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, ob.width * 0.38, ob.width * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Horns
        for (let h = 0; h < 6; h++) {
          const angle = (h / 6) * Math.PI * 2;
          const hx = Math.cos(angle) * ob.width * 0.38;
          const hy = Math.sin(angle) * ob.width * 0.38;
          ctx.fillStyle = flash ? "#ff8040" : "#5a5a5a";
          ctx.beginPath();
          ctx.arc(hx, hy, 4, 0, Math.PI * 2);
          ctx.fill();
          // Horn tip
          const tipX = Math.cos(angle) * (ob.width * 0.38 + 7);
          const tipY = Math.sin(angle) * (ob.width * 0.38 + 7);
          ctx.beginPath();
          ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Red indicator light
        ctx.fillStyle = "#ff2020";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = Math.sin(s.elapsed * 6) > 0 ? 10 : 3;
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (ob.id === "barrel" || ob.id === "wreck") {
        // Barrel or wreck
        const flash = ob.hitFlash > 0;
        if (ob.id === "wreck") {
          // Wreck — broken hull pieces
          ctx.fillStyle = flash ? "#fff" : "#4a3020";
          // Main hull
          ctx.beginPath();
          ctx.moveTo(-ob.width * 0.4, -ob.height * 0.1);
          ctx.quadraticCurveTo(-ob.width * 0.35, ob.height * 0.35, 0, ob.height * 0.3);
          ctx.quadraticCurveTo(ob.width * 0.35, ob.height * 0.25, ob.width * 0.3, -ob.height * 0.15);
          ctx.lineTo(ob.width * 0.15, -ob.height * 0.35);
          ctx.lineTo(-ob.width * 0.2, -ob.height * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#2a1810";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Broken mast
          ctx.strokeStyle = flash ? "#fff" : "#5a4030";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-5, -ob.height * 0.1);
          ctx.lineTo(8, -ob.height * 0.45);
          ctx.stroke();
          // Torn sail fragment
          ctx.fillStyle = "rgba(200,190,170,0.5)";
          ctx.beginPath();
          ctx.moveTo(8, -ob.height * 0.45);
          ctx.quadraticCurveTo(20, -ob.height * 0.3, 15, -ob.height * 0.15);
          ctx.lineTo(5, -ob.height * 0.2);
          ctx.closePath();
          ctx.fill();
        } else {
          // Barrel — rounded with planks
          ctx.fillStyle = flash ? "#fff" : "#7a5a28";
          ctx.beginPath();
          ctx.ellipse(0, 0, ob.width * 0.38, ob.height * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          // Plank lines
          ctx.strokeStyle = flash ? "#ddd" : "#5a4018";
          ctx.lineWidth = 1;
          for (let pl = -2; pl <= 2; pl++) {
            ctx.beginPath();
            ctx.moveTo(pl * 4, -ob.height * 0.4);
            ctx.lineTo(pl * 4, ob.height * 0.4);
            ctx.stroke();
          }
          // Metal bands
          ctx.strokeStyle = flash ? "#fff" : "#aaa";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, -ob.height * 0.2, ob.width * 0.36, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, ob.height * 0.15, ob.width * 0.36, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
          // Gold sparkle for loot
          if (ob.loot) {
            ctx.fillStyle = "#ffd700";
            ctx.globalAlpha = 0.5 + Math.sin(s.elapsed * 5) * 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      } else {
        // Rock — jagged realistic shape with depth
        const flash = ob.hitFlash > 0;
        const rng = seededRand(ob.rockSeed);
        // Shadow
        ctx.fillStyle = "rgba(0,15,30,0.4)";
        ctx.beginPath();
        const pts = 9;
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const r = ob.width * 0.38 + rng() * ob.width * 0.1;
          const px = Math.cos(a) * r + 5;
          const py = Math.sin(a) * r * 0.8 + 5;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Main rock body
        const rng2 = seededRand(ob.rockSeed);
        ctx.fillStyle = flash ? "#fff" : ob.id === "rock_large" ? "#4a4848" : "#5e5c5a";
        ctx.beginPath();
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const r = ob.width * 0.38 + rng2() * ob.width * 0.1;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r * 0.8;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Rock texture/highlight
        if (!flash) {
          const rng3 = seededRand(ob.rockSeed + 1);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.ellipse(-ob.width * 0.08, -ob.height * 0.1, ob.width * 0.18, ob.height * 0.12, -0.4, 0, Math.PI * 2);
          ctx.fill();
          // Cracks
          ctx.strokeStyle = "rgba(0,0,0,0.15)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          const cx1 = rng3() * 10 - 5;
          const cy1 = rng3() * 10 - 5;
          ctx.moveTo(cx1, cy1);
          ctx.lineTo(cx1 + rng3() * 12 - 6, cy1 + rng3() * 12 - 6);
          ctx.lineTo(cx1 + rng3() * 8 - 4, cy1 + rng3() * 15 - 7);
          ctx.stroke();
        }
        // Water foam around rock base
        ctx.strokeStyle = "rgba(200,230,255,0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const foamPhase = s.elapsed * 2 + ob.rockSeed;
        for (let a = -0.8; a < 0.8; a += 0.15) {
          const fx = Math.cos(a + Math.PI * 0.5) * (ob.width * 0.42 + Math.sin(foamPhase + a * 3) * 3);
          const fy = Math.sin(a + Math.PI * 0.5) * (ob.height * 0.38 + Math.sin(foamPhase + a * 3) * 3);
          a === -0.8 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
        }
        ctx.stroke();
      }

      // HP bar for multi-hit destroyables
      if (ob.destroyable && ob.hp > 1) {
        const barW = ob.width * 0.6;
        const hpFrac = ob.currentHp / ob.hp;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(-barW / 2, -ob.height * 0.5 - 10, barW, 5);
        ctx.fillStyle = hpFrac > 0.5 ? "#40cc40" : "#cc4040";
        ctx.fillRect(-barW / 2, -ob.height * 0.5 - 10, barW * hpFrac, 5);
      }
      ctx.restore();
    }

    // ── BULLETS with trails ──
    for (const b of s.bullets) {
      // Trail
      for (const t of b.trail) {
        ctx.globalAlpha = t.life;
        ctx.fillStyle = "#ffa030";
        ctx.beginPath();
        ctx.arc(t.x, t.y, BULLET_R * t.life * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Cannonball
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.fillStyle = "rgba(255,160,40,0.5)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_R + 3, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(b.x - 2, b.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── PARTICLES ──
    for (const p of s.particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      if (p.type === "sparkle") {
        // Star shape for loot
        const sz = p.size * p.life;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 5);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? sz : sz * 0.4;
          i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.min(1, p.life * 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ── SHIP ──
    const blink = s.invulnTimer > 0 && Math.sin(s.invulnTimer * 20) > 0;
    if (!blink) drawShip(ctx, s.shipX, s.shipY, s.shipTilt, s.elapsed);

    // ── DESTINATION ──
    const destAlpha = Math.min(1, Math.max(0, progress - 0.7) / 0.3);
    if (destAlpha > 0) {
      // Approaching shore
      ctx.globalAlpha = destAlpha * 0.8;
      // Sandy shore gradient
      const shoreGrad = ctx.createLinearGradient(0, 0, 0, 50);
      shoreGrad.addColorStop(0, "#c8b070");
      shoreGrad.addColorStop(1, "rgba(200,176,112,0)");
      ctx.fillStyle = shoreGrad;
      ctx.fillRect(40, 0, CANVAS_W - 80, 50);
      // Shore line with foam
      ctx.strokeStyle = "rgba(230,240,255,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 40; x <= CANVAS_W - 40; x += 6) {
        const fy = 45 + Math.sin((x + s.elapsed * 60) * 0.03) * 4;
        x === 40 ? ctx.moveTo(x, fy) : ctx.lineTo(x, fy);
      }
      ctx.stroke();
      ctx.globalAlpha = destAlpha;
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText("LĄD NA HORYZONCIE!", CANVAS_W / 2, 30);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // ── PROGRESS BAR ──
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, CANVAS_W, 6);
    const progGrad = ctx.createLinearGradient(0, 0, CANVAS_W * progress, 0);
    progGrad.addColorStop(0, "#2080c0");
    progGrad.addColorStop(1, "#40c0ff");
    ctx.fillStyle = progGrad;
    ctx.fillRect(0, 0, CANVAS_W * progress, 6);
  }, []);

  // ── DRAW SHIP ──
  function drawShip(ctx, x, y, tilt, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    const W = SHIP_W;
    const H = SHIP_H;

    // Water splash at bow
    ctx.strokeStyle = "rgba(180,220,255,0.3)";
    ctx.lineWidth = 1.5;
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(side * W * 0.15, -H * 0.42);
      ctx.quadraticCurveTo(side * W * 0.4, -H * 0.5 + Math.sin(time * 6 + side) * 3, side * W * 0.5, -H * 0.35);
      ctx.stroke();
    }

    // Hull shadow in water
    ctx.fillStyle = "rgba(0,20,40,0.3)";
    ctx.beginPath();
    ctx.ellipse(3, H * 0.15, W * 0.48, H * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main hull
    ctx.fillStyle = "#5a3018";
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.45);                    // bow point
    ctx.quadraticCurveTo(-W * 0.2, -H * 0.35, -W * 0.45, -H * 0.1);  // port bow curve
    ctx.quadraticCurveTo(-W * 0.5, H * 0.1, -W * 0.42, H * 0.35);    // port side
    ctx.quadraticCurveTo(-W * 0.3, H * 0.48, 0, H * 0.5);            // stern port
    ctx.quadraticCurveTo(W * 0.3, H * 0.48, W * 0.42, H * 0.35);     // stern starboard
    ctx.quadraticCurveTo(W * 0.5, H * 0.1, W * 0.45, -H * 0.1);     // starboard side
    ctx.quadraticCurveTo(W * 0.2, -H * 0.35, 0, -H * 0.45);         // starboard bow
    ctx.closePath();
    ctx.fill();

    // Hull planks
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 1;
    for (let py = -H * 0.3; py < H * 0.4; py += H * 0.12) {
      ctx.beginPath();
      const halfW = W * 0.42 * (1 - Math.abs(py) / (H * 0.55));
      ctx.moveTo(-halfW, py);
      ctx.lineTo(halfW, py);
      ctx.stroke();
    }

    // Hull gunwale (top edge)
    ctx.strokeStyle = "#7a5028";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.45);
    ctx.quadraticCurveTo(-W * 0.2, -H * 0.35, -W * 0.45, -H * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.45);
    ctx.quadraticCurveTo(W * 0.2, -H * 0.35, W * 0.45, -H * 0.1);
    ctx.stroke();

    // Bow figurehead
    ctx.fillStyle = "#d4a030";
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.48);
    ctx.lineTo(-4, -H * 0.42);
    ctx.lineTo(4, -H * 0.42);
    ctx.closePath();
    ctx.fill();

    // Stern castle (raised back)
    ctx.fillStyle = "#4a2818";
    ctx.fillRect(-W * 0.28, H * 0.2, W * 0.56, H * 0.2);
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 1;
    ctx.strokeRect(-W * 0.28, H * 0.2, W * 0.56, H * 0.2);
    // Stern windows
    ctx.fillStyle = "#ffc850";
    ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.2;
    for (let wx = -1; wx <= 1; wx++) {
      ctx.beginPath();
      ctx.arc(wx * 12, H * 0.32, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Mast
    ctx.fillStyle = "#3a2518";
    ctx.fillRect(-2.5, -H * 0.7, 5, H * 0.85);

    // Main sail
    const sailBillow = 6 + Math.sin(time * 1.5) * 3;
    ctx.fillStyle = "#e8dcc8";
    ctx.beginPath();
    ctx.moveTo(-W * 0.32, -H * 0.65);
    ctx.quadraticCurveTo(-W * 0.15, -H * 0.4 + sailBillow, -W * 0.3, -H * 0.2);
    ctx.lineTo(W * 0.3, -H * 0.2);
    ctx.quadraticCurveTo(W * 0.15, -H * 0.4 + sailBillow, W * 0.32, -H * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a09080";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Sail cross-lines
    ctx.strokeStyle = "rgba(120,100,80,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.65);
    ctx.lineTo(0, -H * 0.2);
    ctx.stroke();

    // Cross spar
    ctx.strokeStyle = "#3a2518";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-W * 0.34, -H * 0.65);
    ctx.lineTo(W * 0.34, -H * 0.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-W * 0.32, -H * 0.2);
    ctx.lineTo(W * 0.32, -H * 0.2);
    ctx.stroke();

    // Rigging lines
    ctx.strokeStyle = "rgba(80,60,40,0.4)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-W * 0.34, -H * 0.65);
    ctx.lineTo(-W * 0.45, -H * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.34, -H * 0.65);
    ctx.lineTo(W * 0.45, -H * 0.05);
    ctx.stroke();

    // Pirate flag
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(2, -H * 0.72);
    ctx.lineTo(18, -H * 0.78);
    ctx.lineTo(18, -H * 0.68);
    ctx.closePath();
    ctx.fill();
    // Skull on flag
    ctx.fillStyle = "#ddd";
    ctx.beginPath();
    ctx.arc(12, -H * 0.73, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Cannons (port and starboard)
    ctx.fillStyle = "#2a2a2a";
    for (let side = -1; side <= 1; side += 2) {
      for (let cy = -H * 0.15; cy < H * 0.15; cy += H * 0.12) {
        const cx = side * W * 0.43;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        // Cannon barrel
        ctx.fillRect(cx, cy - 1.5, side * 8, 3);
      }
    }

    ctx.restore();
  }

  // ── RESULT SCREEN ──
  if (phase === "complete" || phase === "failed") {
    const rewards = phase === "complete"
      ? getRiverRewards(roomNumber, hud.hp, hud.maxHp, hud.score)
      : { copper: Math.round(hud.score * 0.5), bonusText: "Statek zatonął..." };
    return (
      <div style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 100, color: "#d8c8a8", fontFamily: "monospace",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>
          <GameIcon name={phase === "complete" ? "anchor" : "skull"} size={40} />
        </div>
        <h2 style={{
          fontSize: 28, fontWeight: "bold", marginBottom: 8,
          color: phase === "complete" ? "#40cc60" : "#cc4040",
          textShadow: "2px 2px 0 #000",
        }}>
          {phase === "complete" ? "Dotarłeś do lądu!" : "Statek zatonął!"}
        </h2>
        <p style={{ fontSize: 14, color: "#8a7a6a", marginBottom: 16 }}>{rewards.bonusText}</p>
        <div style={{
          background: "rgba(30,20,10,0.9)", border: "2px solid #5a4030",
          padding: "16px 32px", textAlign: "center", marginBottom: 16,
        }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>
            <GameIcon name="coin" size={16} /> Miedź: +{rewards.copper}
          </div>
          {rewards.silver > 0 && (
            <div style={{ fontSize: 16, color: "#c0c0c0" }}>
              <GameIcon name="coin" size={16} /> Srebro: +{rewards.silver}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#8a7a6a", marginTop: 8 }}>
            Punkty: {hud.score} | HP: {hud.hp}/{hud.maxHp}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          touchAction: "none", cursor: "crosshair",
        }}
      />

      {/* HUD overlay */}
      <div style={{
        position: "absolute", top: 10, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 20,
        fontFamily: "monospace", fontSize: isMobile ? 11 : 14,
        color: "#d8c8a8", textShadow: "1px 1px 0 #000",
        pointerEvents: "none", zIndex: 10,
      }}>
        <div style={{
          background: "rgba(10,5,2,0.8)", border: "1px solid #5a4030",
          padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <GameIcon name="shield" size={14} />
          <div style={{ width: 80, height: 8, background: "#1a0a0a", border: "1px solid #3a2a1a", position: "relative" }}>
            <div style={{
              height: "100%", width: `${(hud.hp / hud.maxHp) * 100}%`,
              background: hud.hp / hud.maxHp > 0.5 ? "#40a040" : hud.hp / hud.maxHp > 0.25 ? "#a0a040" : "#cc3030",
              transition: "width 0.2s",
            }} />
          </div>
          <span>{hud.hp}</span>
        </div>
        <div style={{
          background: "rgba(10,5,2,0.8)", border: "1px solid #5a4030",
          padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <GameIcon name="star" size={14} />
          <span>{hud.score}</span>
        </div>
        <div style={{
          background: "rgba(10,5,2,0.8)", border: "1px solid #5a4030",
          padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <GameIcon name="hourglass" size={14} />
          <span>{hud.time}s / {hud.maxTime}s</span>
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
        fontFamily: "monospace", fontSize: isMobile ? 10 : 12,
        color: "rgba(200,180,160,0.5)", textShadow: "1px 1px 0 #000",
        pointerEvents: "none", zIndex: 10, textAlign: "center",
      }}>
        {isMobile ? "Dotknij aby sterować i strzelać" : "WASD/Strzałki — ruch | Spacja — strzał | Klik — cel"}
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useCallback, useState } from "react";
import { RIVER_OBSTACLES, RIVER_WAVE_PATTERNS, getRiverSegmentConfig, getRiverRewards } from "../data/riverSegment";
import GameIcon from "./GameIcon";

// Ship river mini-game: player sails upward, dodges obstacles
// No shooting — pure navigation challenge

const CANVAS_W = 1280;
const CANVAS_H = 720;
const SHIP_W = 80;
const SHIP_H = 100;

let obstacleIdCounter = 0;

function pickObstacleType(progress) {
  const pattern = RIVER_WAVE_PATTERNS.find(p => progress >= p.minDist && progress < p.maxDist)
    || RIVER_WAVE_PATTERNS[RIVER_WAVE_PATTERNS.length - 1];
  const typeId = pattern.types[Math.floor(Math.random() * pattern.types.length)];
  return RIVER_OBSTACLES.find(o => o.id === typeId) || RIVER_OBSTACLES[0];
}

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// Biome color mapping for destination shore
function getBiomeShoreColors(biome) {
  if (!biome) return { ground: "#c8b070", groundDark: "#a09050", foliage: "#2a5a18", foliageDark: "#1a3a10", sky: "#4080c0" };
  const id = biome.id;
  if (id === "jungle") return { ground: "#2d5a1e", groundDark: "#1a4010", foliage: "#1a6a10", foliageDark: "#0a4a08", sky: "#0b3d0b" };
  if (id === "island" || id === "sunset_beach") return { ground: "#dcc880", groundDark: "#c4a860", foliage: "#2a8a30", foliageDark: "#1a5a18", sky: "#60c0e8" };
  if (id === "desert") return { ground: "#d4a840", groundDark: "#c09030", foliage: "#8a7a50", foliageDark: "#6a5a30", sky: "#e8a840" };
  if (id === "winter") return { ground: "#d8e4f0", groundDark: "#b8c8d8", foliage: "#5a7a8a", foliageDark: "#3a5a6a", sky: "#5a7a9a" };
  if (id === "city") return { ground: "#4a4038", groundDark: "#3a3028", foliage: "#5a5040", foliageDark: "#3a3020", sky: "#3a3040" };
  if (id === "volcano") return { ground: "#3a2218", groundDark: "#2a1810", foliage: "#4a2a10", foliageDark: "#2a1808", sky: "#4a1a0a" };
  if (id === "summer") return { ground: "#4a8a20", groundDark: "#3a7018", foliage: "#3a9a28", foliageDark: "#2a7018", sky: "#80c8ff" };
  if (id === "autumn") return { ground: "#6a5030", groundDark: "#5a4020", foliage: "#8a5020", foliageDark: "#6a3810", sky: "#8a6040" };
  if (id === "spring") return { ground: "#38a028", groundDark: "#2a8018", foliage: "#40b030", foliageDark: "#2a8020", sky: "#90d0ff" };
  if (id === "mushroom") return { ground: "#2a4a1a", groundDark: "#1a3a10", foliage: "#6a3a8a", foliageDark: "#4a2060", sky: "#3a2050" };
  if (id === "swamp") return { ground: "#2a3a18", groundDark: "#1a2a10", foliage: "#3a5a20", foliageDark: "#2a3a10", sky: "#1a2a10" };
  if (id === "bamboo_falls") return { ground: "#1a5a30", groundDark: "#104a20", foliage: "#2a8a40", foliageDark: "#1a6a28", sky: "#40a050" };
  if (id === "blue_lagoon") return { ground: "#1abcbc", groundDark: "#0a9a9a", foliage: "#2a8a60", foliageDark: "#1a6a40", sky: "#40b8e8" };
  return { ground: "#c8b070", groundDark: "#a09050", foliage: "#2a5a18", foliageDark: "#1a3a10", sky: "#4080c0" };
}

export default function RiverShipSegment({ roomNumber, onComplete, isMobile, shipUpgrades = [], destBiome }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [phase, setPhase] = useState("playing"); // playing | docking | complete | failed
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, score: 0, time: 0, maxTime: 15 });
  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const touchRef = useRef({ active: false, x: 0, y: 0 });
  const shoreColors = getBiomeShoreColors(destBiome);

  // Initialize game state
  useEffect(() => {
    const cfg = getRiverSegmentConfig(roomNumber);
    const hasHull1 = shipUpgrades.includes("hull_1");
    const hasHull2 = shipUpgrades.includes("hull_2");
    const hasSails1 = shipUpgrades.includes("sails_1");
    const hasSails2 = shipUpgrades.includes("sails_2");
    const hpBonus = (hasHull1 ? 15 : 0) + (hasHull2 ? 30 : 0);
    const speedBonus = (hasSails1 ? 0.8 : 0) + (hasSails2 ? 1.2 : 0);

    const maxHp = cfg.shipHp + hpBonus;
    stateRef.current = {
      shipX: CANVAS_W / 2,
      shipY: CANVAS_H - 130,
      shipHp: maxHp,
      shipMaxHp: maxHp,
      shipSpeed: cfg.shipSpeed + speedBonus,
      scrollSpeed: cfg.scrollSpeed,
      scrollOffset: 0,
      obstacles: [],
      particles: [],
      wakes: [],
      score: 0,
      elapsed: 0,
      segmentLength: cfg.segmentLength,
      spawnTimer: 0,
      spawnRate: cfg.obstacleSpawnRate,
      difficulty: cfg.difficulty,
      invulnTimer: 0,
      done: false,
      waterOffset: 0,
      shipTilt: 0,
      // Docking animation state
      docking: false,
      dockTimer: 0,
      dockDuration: 3.0,
      dockStartX: 0,
      dockStartY: 0,
      dockTargetX: CANVAS_W * 0.75,
      dockTargetY: 80,
      dockStartTilt: 0,
      dockTargetTilt: Math.PI / 2, // rotate 90 degrees to dock sideways
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

  // Main game loop
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (now) => {
      const s = stateRef.current;
      if (!s || s.done) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // ── DOCKING ANIMATION ──
      if (s.docking) {
        s.dockTimer += dt;
        s.elapsed += dt * 0.3; // slow time during docking for water animation
        const t = Math.min(1, s.dockTimer / s.dockDuration);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad

        s.shipX = s.dockStartX + (s.dockTargetX - s.dockStartX) * ease;
        s.shipY = s.dockStartY + (s.dockTargetY - s.dockStartY) * ease;
        s.shipTilt = s.dockStartTilt + (s.dockTargetTilt - s.dockStartTilt) * ease;
        s.scrollSpeed = Math.max(0, s.scrollSpeed - dt * 0.8); // slow down scrolling
        s.waterOffset = (s.waterOffset + s.scrollSpeed * 60 * dt) % 80;

        // Wake during docking
        if (Math.random() < 0.3) {
          s.wakes.push({
            x: s.shipX + (Math.random() - 0.5) * 30,
            y: s.shipY + SHIP_H * 0.3,
            life: 0.8, size: 5 + Math.random() * 6,
          });
        }
        for (let i = s.wakes.length - 1; i >= 0; i--) {
          s.wakes[i].life -= dt * 0.6;
          s.wakes[i].size += dt * 5;
          if (s.wakes[i].life <= 0) s.wakes.splice(i, 1);
        }

        // Update particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx * 60 * dt;
          p.y += p.vy * 60 * dt;
          p.life -= dt;
          if (p.life <= 0) s.particles.splice(i, 1);
        }

        render(s, 1.0);
        if (t >= 1) {
          s.done = true;
          setPhase("complete");
          const rewards = getRiverRewards(roomNumber, s.shipHp, s.shipMaxHp, s.score);
          setHud(h => ({ ...h, hp: s.shipHp, score: s.score, time: s.segmentLength }));
          setTimeout(() => onComplete({ success: true, rewards, hpRemaining: s.shipHp, maxHp: s.shipMaxHp, score: s.score }), 1500);
        }
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      s.elapsed += dt;
      const progress = s.elapsed / s.segmentLength;

      // Start docking when time runs out
      if (s.elapsed >= s.segmentLength) {
        s.docking = true;
        s.dockTimer = 0;
        s.dockStartX = s.shipX;
        s.dockStartY = s.shipY;
        s.dockStartTilt = s.shipTilt;
        setPhase("docking");
        render(s, 1.0);
        rafRef.current = requestAnimationFrame(loop);
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

      const targetTilt = moveX * 0.15;
      s.shipTilt += (targetTilt - s.shipTilt) * 0.1;

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

      // Spawn obstacles (stop spawning near end to clear path for docking)
      if (progress < 0.85) {
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

      // Score grows with distance
      s.score = Math.floor(s.elapsed * 3);

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
  }, [roomNumber, onComplete, shoreColors]);

  // ── RENDERING ──
  const render = useCallback((s, progress) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const isDocking = s.docking;

    // ── OCEAN BACKGROUND ──
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#04203a");
    grad.addColorStop(0.3, "#083050");
    grad.addColorStop(0.7, "#0a2848");
    grad.addColorStop(1, "#061828");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Caustic light patterns
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

    // Ocean wave layers
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

    // Foam sparkles
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
    ctx.fillStyle = "#2a5a18";
    for (let y = -30 + (s.waterOffset % 45); y < CANVAS_H + 30; y += 45) {
      const bx = bankBase + Math.sin((y + s.waterOffset) * 0.04) * 12;
      ctx.beginPath();
      ctx.arc(bx + 2, y, 14 + Math.sin(y * 0.3) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
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

    // ── BIOME DESTINATION SHORE (appears at top, grows as progress nears 1.0) ──
    const destAlpha = Math.min(1, Math.max(0, progress - 0.65) / 0.35);
    if (destAlpha > 0 || isDocking) {
      const shoreAlpha = isDocking ? 1 : destAlpha;
      const shoreHeight = isDocking ? 180 : 30 + destAlpha * 120;

      ctx.globalAlpha = shoreAlpha;

      // Main ground fill
      const shoreGrad = ctx.createLinearGradient(0, 0, 0, shoreHeight + 20);
      shoreGrad.addColorStop(0, shoreColors.ground);
      shoreGrad.addColorStop(0.6, shoreColors.groundDark);
      shoreGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shoreGrad;
      ctx.fillRect(0, 0, CANVAS_W, shoreHeight + 20);

      // Irregular shoreline edge
      ctx.fillStyle = shoreColors.ground;
      ctx.beginPath();
      ctx.moveTo(0, shoreHeight);
      for (let x = 0; x <= CANVAS_W; x += 15) {
        const sy = shoreHeight + Math.sin((x + s.elapsed * 15) * 0.03) * 8 + Math.sin(x * 0.07) * 5;
        ctx.lineTo(x, sy);
      }
      ctx.lineTo(CANVAS_W, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Shore foam line
      ctx.strokeStyle = "rgba(230,240,255,0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= CANVAS_W; x += 6) {
        const fy = shoreHeight + Math.sin((x + s.elapsed * 30) * 0.025) * 5 + 5;
        x === 0 ? ctx.moveTo(x, fy) : ctx.lineTo(x, fy);
      }
      ctx.stroke();
      // Second foam line
      ctx.strokeStyle = "rgba(230,240,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= CANVAS_W; x += 8) {
        const fy = shoreHeight + Math.sin((x + s.elapsed * 20 + 50) * 0.03) * 4 + 12;
        x === 0 ? ctx.moveTo(x, fy) : ctx.lineTo(x, fy);
      }
      ctx.stroke();

      // Vegetation/trees on shore
      const treeRng = seededRand(42);
      const treeCount = isDocking ? 18 : Math.floor(destAlpha * 18);
      for (let t = 0; t < treeCount; t++) {
        const tx = treeRng() * CANVAS_W;
        const ty = treeRng() * (shoreHeight - 30) + 5;
        const ts = 12 + treeRng() * 18;
        // Trunk
        ctx.fillStyle = "#5a3a1a";
        ctx.fillRect(tx - 2, ty, 4, ts * 0.5);
        // Foliage
        ctx.fillStyle = shoreColors.foliage;
        ctx.beginPath();
        ctx.arc(tx, ty - 3, ts * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shoreColors.foliageDark;
        ctx.beginPath();
        ctx.arc(tx + 4, ty + 2, ts * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dock/pier for docking
      if (isDocking || destAlpha > 0.5) {
        const pierAlpha = isDocking ? 1 : (destAlpha - 0.5) * 2;
        ctx.globalAlpha = pierAlpha;
        const pierX = CANVAS_W * 0.75;
        const pierY = shoreHeight - 5;
        // Pier posts
        ctx.fillStyle = "#4a3020";
        ctx.fillRect(pierX - 30, pierY, 6, 60);
        ctx.fillRect(pierX + 24, pierY, 6, 60);
        ctx.fillRect(pierX - 3, pierY, 6, 65);
        // Pier planks
        ctx.fillStyle = "#6a5030";
        ctx.fillRect(pierX - 32, pierY + 5, 64, 8);
        ctx.fillRect(pierX - 32, pierY + 18, 64, 8);
        ctx.fillRect(pierX - 32, pierY + 31, 64, 8);
        ctx.fillRect(pierX - 32, pierY + 44, 64, 8);
        // Rope bollards
        ctx.fillStyle = "#8a7a60";
        ctx.beginPath();
        ctx.arc(pierX - 28, pierY + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pierX + 28, pierY + 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Biome name text
      if (isDocking) {
        ctx.globalAlpha = Math.min(1, s.dockTimer / 1.5);
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 6;
        ctx.fillText(destBiome ? destBiome.name : "Nowy Ląd", CANVAS_W / 2, 30);
        ctx.shadowBlur = 0;
      } else if (destAlpha > 0.3) {
        ctx.globalAlpha = destAlpha * 0.8;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4;
        ctx.fillText(destBiome ? `${destBiome.name} na horyzoncie!` : "Ląd na horyzoncie!", CANVAS_W / 2, shoreHeight + 35);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

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
        // Whirlpool
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
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        cg.addColorStop(0, "rgba(5,15,30,0.8)");
        cg.addColorStop(1, "transparent");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (ob.id.startsWith("island")) {
        // Island
        ctx.fillStyle = "rgba(0,20,40,0.3)";
        ctx.beginPath();
        ctx.ellipse(4, 4, ob.width * 0.48, ob.height * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ob.hitFlash > 0 ? "#fff" : "#c8b070";
        ctx.beginPath();
        ctx.ellipse(0, 0, ob.width * 0.45, ob.height * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(220,240,255,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, ob.width * 0.47, ob.height * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        const treeCount = ob.id === "island_large" ? 5 : 3;
        const rng = seededRand(ob.rockSeed);
        for (let t = 0; t < treeCount; t++) {
          const tx = (rng() - 0.5) * ob.width * 0.5;
          const ty = (rng() - 0.5) * ob.height * 0.4;
          const ts = 8 + rng() * 10;
          ctx.fillStyle = "#5a3a1a";
          ctx.fillRect(tx - 1.5, ty, 3, ts * 0.6);
          ctx.fillStyle = `rgb(${30 + rng() * 40}, ${80 + rng() * 60}, ${20 + rng() * 30})`;
          ctx.beginPath();
          ctx.arc(tx, ty - 2, ts * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (ob.id === "mine") {
        // Sea mine
        const flash = ob.hitFlash > 0;
        ctx.strokeStyle = "#3a3a3a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ob.height * 0.3);
        ctx.lineTo(0, ob.height * 0.5);
        ctx.stroke();
        ctx.fillStyle = flash ? "#fff" : "#2a2a2a";
        ctx.beginPath();
        ctx.arc(0, 0, ob.width * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4a4a4a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = flash ? "#fff" : "#555";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, ob.width * 0.38, ob.width * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let h = 0; h < 6; h++) {
          const angle = (h / 6) * Math.PI * 2;
          ctx.fillStyle = flash ? "#ff8040" : "#5a5a5a";
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * ob.width * 0.38, Math.sin(angle) * ob.width * 0.38, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * (ob.width * 0.38 + 7), Math.sin(angle) * (ob.width * 0.38 + 7), 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ff2020";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = Math.sin(s.elapsed * 6) > 0 ? 10 : 3;
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (ob.id === "barrel" || ob.id === "wreck") {
        const flash = ob.hitFlash > 0;
        if (ob.id === "wreck") {
          ctx.fillStyle = flash ? "#fff" : "#4a3020";
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
          ctx.strokeStyle = flash ? "#fff" : "#5a4030";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-5, -ob.height * 0.1);
          ctx.lineTo(8, -ob.height * 0.45);
          ctx.stroke();
          ctx.fillStyle = "rgba(200,190,170,0.5)";
          ctx.beginPath();
          ctx.moveTo(8, -ob.height * 0.45);
          ctx.quadraticCurveTo(20, -ob.height * 0.3, 15, -ob.height * 0.15);
          ctx.lineTo(5, -ob.height * 0.2);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = flash ? "#fff" : "#7a5a28";
          ctx.beginPath();
          ctx.ellipse(0, 0, ob.width * 0.38, ob.height * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = flash ? "#ddd" : "#5a4018";
          ctx.lineWidth = 1;
          for (let pl = -2; pl <= 2; pl++) {
            ctx.beginPath();
            ctx.moveTo(pl * 4, -ob.height * 0.4);
            ctx.lineTo(pl * 4, ob.height * 0.4);
            ctx.stroke();
          }
          ctx.strokeStyle = flash ? "#fff" : "#aaa";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, -ob.height * 0.2, ob.width * 0.36, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, ob.height * 0.15, ob.width * 0.36, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
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
        // Rock
        const flash = ob.hitFlash > 0;
        const rng = seededRand(ob.rockSeed);
        ctx.fillStyle = "rgba(0,15,30,0.4)";
        ctx.beginPath();
        const pts = 9;
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const r = ob.width * 0.38 + rng() * ob.width * 0.1;
          i === 0 ? ctx.moveTo(Math.cos(a) * r + 5, Math.sin(a) * r * 0.8 + 5) : ctx.lineTo(Math.cos(a) * r + 5, Math.sin(a) * r * 0.8 + 5);
        }
        ctx.closePath();
        ctx.fill();
        const rng2 = seededRand(ob.rockSeed);
        ctx.fillStyle = flash ? "#fff" : ob.id === "rock_large" ? "#4a4848" : "#5e5c5a";
        ctx.beginPath();
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const r = ob.width * 0.38 + rng2() * ob.width * 0.1;
          i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
        }
        ctx.closePath();
        ctx.fill();
        if (!flash) {
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.ellipse(-ob.width * 0.08, -ob.height * 0.1, ob.width * 0.18, ob.height * 0.12, -0.4, 0, Math.PI * 2);
          ctx.fill();
        }
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
      ctx.restore();
    }

    // ── PARTICLES ──
    for (const p of s.particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * Math.min(1, p.life * 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── SHIP ──
    const blink = s.invulnTimer > 0 && Math.sin(s.invulnTimer * 20) > 0;
    if (!blink) drawShip(ctx, s.shipX, s.shipY, s.shipTilt, s.elapsed);

    // ── PROGRESS BAR ──
    if (!isDocking) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, CANVAS_W, 6);
      const progGrad = ctx.createLinearGradient(0, 0, CANVAS_W * progress, 0);
      progGrad.addColorStop(0, "#2080c0");
      progGrad.addColorStop(1, "#40c0ff");
      ctx.fillStyle = progGrad;
      ctx.fillRect(0, 0, CANVAS_W * progress, 6);
    }
  }, [shoreColors, destBiome]);

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

    // Hull shadow
    ctx.fillStyle = "rgba(0,20,40,0.3)";
    ctx.beginPath();
    ctx.ellipse(3, H * 0.15, W * 0.48, H * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main hull
    ctx.fillStyle = "#5a3018";
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.45);
    ctx.quadraticCurveTo(-W * 0.2, -H * 0.35, -W * 0.45, -H * 0.1);
    ctx.quadraticCurveTo(-W * 0.5, H * 0.1, -W * 0.42, H * 0.35);
    ctx.quadraticCurveTo(-W * 0.3, H * 0.48, 0, H * 0.5);
    ctx.quadraticCurveTo(W * 0.3, H * 0.48, W * 0.42, H * 0.35);
    ctx.quadraticCurveTo(W * 0.5, H * 0.1, W * 0.45, -H * 0.1);
    ctx.quadraticCurveTo(W * 0.2, -H * 0.35, 0, -H * 0.45);
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

    // Gunwale
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

    // Stern castle
    ctx.fillStyle = "#4a2818";
    ctx.fillRect(-W * 0.28, H * 0.2, W * 0.56, H * 0.2);
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 1;
    ctx.strokeRect(-W * 0.28, H * 0.2, W * 0.56, H * 0.2);
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

    // Cross spars
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

    // Rigging
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
    ctx.fillStyle = "#ddd";
    ctx.beginPath();
    ctx.arc(12, -H * 0.73, 2.5, 0, Math.PI * 2);
    ctx.fill();

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
          {phase === "complete" ? (destBiome ? `Dotarłeś do: ${destBiome.name}!` : "Dotarłeś do lądu!") : "Statek zatonął!"}
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
            HP: {hud.hp}/{hud.maxHp}
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          touchAction: "none", cursor: "default",
        }}
      />

      {/* HUD overlay */}
      {phase === "playing" && (
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
            <GameIcon name="hourglass" size={14} />
            <span>{hud.time}s / {hud.maxTime}s</span>
          </div>
          {destBiome && (
            <div style={{
              background: "rgba(10,5,2,0.8)", border: "1px solid #5a4030",
              padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
            }}>
              <GameIcon name={destBiome.icon} size={14} />
              <span>{destBiome.name}</span>
            </div>
          )}
        </div>
      )}

      {phase === "playing" && (
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          fontFamily: "monospace", fontSize: isMobile ? 10 : 12,
          color: "rgba(200,180,160,0.5)", textShadow: "1px 1px 0 #000",
          pointerEvents: "none", zIndex: 10, textAlign: "center",
        }}>
          {isMobile ? "Dotknij aby sterować statkiem" : "WASD/Strzałki — steruj statkiem"}
        </div>
      )}
    </div>
  );
}

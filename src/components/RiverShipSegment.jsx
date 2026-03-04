import React, { useRef, useEffect, useCallback, useState } from "react";
import { RIVER_OBSTACLES, RIVER_WAVE_PATTERNS, getRiverSegmentConfig, getRiverRewards } from "../data/riverSegment";
import GameIcon from "./GameIcon";

// Ship river mini-game: player sails upward, dodges obstacles, shoots cannon
// Self-contained component — uses its own canvas + game loop

const CANVAS_W = 1280;
const CANVAS_H = 720;
const SHIP_W = 48;
const SHIP_H = 64;
const BULLET_R = 5;
const BULLET_SPEED = 10;
const WATER_COL_TOP = "#0a2a4a";
const WATER_COL_BOT = "#0a1a2a";

let obstacleIdCounter = 0;

function pickObstacleType(progress) {
  const pattern = RIVER_WAVE_PATTERNS.find(p => progress >= p.minDist && progress < p.maxDist)
    || RIVER_WAVE_PATTERNS[RIVER_WAVE_PATTERNS.length - 1];
  const typeId = pattern.types[Math.floor(Math.random() * pattern.types.length)];
  return RIVER_OBSTACLES.find(o => o.id === typeId) || RIVER_OBSTACLES[0];
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
    // Ship upgrade bonuses
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
      shipY: CANVAS_H - 100,
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
      score: 0,
      elapsed: 0,
      segmentLength: cfg.segmentLength,
      spawnTimer: 0,
      spawnRate: cfg.obstacleSpawnRate,
      difficulty: cfg.difficulty,
      invulnTimer: 0,
      wavePhase: 0,
      done: false,
      waterOffset: 0,
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
  const handleTouchEnd = useCallback(() => {
    touchRef.current.active = false;
  }, []);

  // Mouse click = shoot
  const handleClick = useCallback((e) => {
    const s = stateRef.current;
    if (!s || s.done) return;
    const now = performance.now();
    if (now - lastShotRef.current < s.cannonCooldown) return;
    lastShotRef.current = now;
    // Get click position relative to canvas for aiming
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
      damage: s.cannonDamage,
    });
  }, []);

  // Main game loop
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (now) => {
      const s = stateRef.current;
      if (!s || s.done) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;

      // Update elapsed time
      s.elapsed += dt;
      const progress = s.elapsed / s.segmentLength;

      // Check completion
      if (s.elapsed >= s.segmentLength) {
        s.done = true;
        setPhase("complete");
        const rewards = getRiverRewards(roomNumber, s.shipHp, s.shipMaxHp, s.score);
        setHud(h => ({ ...h, hp: s.shipHp, score: s.score, time: s.segmentLength }));
        setTimeout(() => onComplete({ success: true, rewards, hpRemaining: s.shipHp, maxHp: s.shipMaxHp, score: s.score }), 2000);
        return;
      }

      // Ship movement (keyboard)
      const k = keysRef.current;
      const spd = s.shipSpeed * 60 * dt;
      if (k.left) s.shipX -= spd;
      if (k.right) s.shipX += spd;
      if (k.up) s.shipY -= spd * 0.7;
      if (k.down) s.shipY += spd * 0.7;

      // Auto-shoot when holding space
      if (k.shoot) {
        const shootNow = performance.now();
        if (shootNow - lastShotRef.current >= s.cannonCooldown) {
          lastShotRef.current = shootNow;
          s.bullets.push({
            x: s.shipX, y: s.shipY - SHIP_H / 2,
            vx: 0, vy: -BULLET_SPEED,
            damage: s.cannonDamage,
          });
        }
      }

      // Touch movement — ship follows finger
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
        // Auto-shoot while touching
        const shootNow = performance.now();
        if (shootNow - lastShotRef.current >= s.cannonCooldown) {
          lastShotRef.current = shootNow;
          s.bullets.push({
            x: s.shipX, y: s.shipY - SHIP_H / 2,
            vx: 0, vy: -BULLET_SPEED,
            damage: s.cannonDamage,
          });
        }
      }

      // Clamp ship position
      s.shipX = Math.max(SHIP_W / 2 + 10, Math.min(CANVAS_W - SHIP_W / 2 - 10, s.shipX));
      s.shipY = Math.max(SHIP_H, Math.min(CANVAS_H - 40, s.shipY));

      // Scroll water
      s.waterOffset = (s.waterOffset + s.scrollSpeed * 60 * dt) % 40;

      // Spawn obstacles
      s.spawnTimer -= dt * 1000;
      if (s.spawnTimer <= 0) {
        const template = pickObstacleType(progress);
        const ob = {
          ...template,
          uid: ++obstacleIdCounter,
          x: 30 + Math.random() * (CANVAS_W - 60),
          y: -template.height,
          currentHp: template.hp,
          rotation: template.pulls ? Math.random() * Math.PI * 2 : 0,
          hitFlash: 0,
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

        // Whirlpool pull effect
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

        // Remove off-screen
        if (ob.y > CANVAS_H + 100) {
          s.obstacles.splice(i, 1);
          continue;
        }

        // Ship collision
        if (s.invulnTimer <= 0) {
          const dx = ob.x - s.shipX;
          const dy = ob.y - s.shipY;
          const collideR = (ob.width + SHIP_W) * 0.35;
          if (dx * dx + dy * dy < collideR * collideR && ob.damage > 0) {
            s.shipHp -= ob.damage;
            s.invulnTimer = 0.8;
            // Spawn hit particles
            for (let p = 0; p < 8; p++) {
              s.particles.push({
                x: s.shipX, y: s.shipY,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.5 + Math.random() * 0.3,
                color: ob.explodes ? "#ff6020" : "#ffffff",
                size: 3 + Math.random() * 4,
              });
            }
            if (ob.explodes) {
              s.obstacles.splice(i, 1);
              continue;
            }
            if (s.shipHp <= 0) {
              s.shipHp = 0;
              s.done = true;
              setPhase("failed");
              setHud(h => ({ ...h, hp: 0, score: s.score, time: s.elapsed }));
              setTimeout(() => onComplete({ success: false, rewards: { copper: Math.round(s.score * 0.5) }, hpRemaining: 0, maxHp: s.shipMaxHp, score: s.score }), 2000);
              return;
            }
          }
        }
      }

      // Update invulnerability
      if (s.invulnTimer > 0) s.invulnTimer -= dt;

      // Update bullets
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.x += b.vx * 60 * dt;
        b.y += b.vy * 60 * dt;
        if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
          s.bullets.splice(i, 1);
          continue;
        }
        // Bullet-obstacle collision
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
              // Destroy particles
              for (let p = 0; p < 6; p++) {
                s.particles.push({
                  x: ob.x, y: ob.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  life: 0.4 + Math.random() * 0.3,
                  color: ob.loot ? "#ffd700" : ob.explodes ? "#ff4020" : "#aaaaaa",
                  size: 4 + Math.random() * 5,
                });
              }
              if (ob.loot) {
                s.score += 20;
              }
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
        p.life -= dt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // Update HUD (throttled)
      setHud({
        hp: s.shipHp, maxHp: s.shipMaxHp, score: s.score,
        time: Math.round(s.elapsed), maxTime: s.segmentLength,
      });

      // Render
      render(s, progress);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [roomNumber, onComplete]);

  // Canvas rendering
  const render = useCallback((s, progress) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Water background with scrolling waves
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, WATER_COL_TOP);
    grad.addColorStop(1, WATER_COL_BOT);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Animated water lines
    ctx.strokeStyle = "rgba(60,140,200,0.15)";
    ctx.lineWidth = 2;
    for (let y = -40 + (s.waterOffset % 40); y < CANVAS_H + 40; y += 40) {
      ctx.beginPath();
      for (let x = 0; x < CANVAS_W; x += 20) {
        const wy = y + Math.sin((x + s.elapsed * 80) * 0.02) * 6;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // River banks (darker edges)
    const bankW = 30 + Math.sin(s.elapsed * 0.5) * 10;
    ctx.fillStyle = "#1a3a10";
    ctx.fillRect(0, 0, bankW, CANVAS_H);
    ctx.fillRect(CANVAS_W - bankW, 0, bankW, CANVAS_H);
    // Bank detail
    ctx.fillStyle = "#2d5a1e";
    for (let y = -20 + (s.waterOffset % 60); y < CANVAS_H + 20; y += 60) {
      ctx.beginPath();
      ctx.arc(bankW - 5, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(CANVAS_W - bankW + 5, y + 30, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Obstacles
    for (const ob of s.obstacles) {
      ctx.save();
      ctx.translate(ob.x, ob.y);
      if (ob.pulls) {
        // Whirlpool: spinning circle
        ctx.rotate(ob.rotation);
        ctx.beginPath();
        ctx.arc(0, 0, ob.width * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = "#4080c0";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.1) {
          const r = 5 + a * 4;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(80,160,220,0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Regular obstacle
        const col = ob.hitFlash > 0 ? "#ffffff" : ob.color;
        ctx.fillStyle = col;
        if (ob.id.startsWith("island")) {
          // Island: irregular shape
          ctx.beginPath();
          ctx.ellipse(0, 0, ob.width * 0.45, ob.height * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          // Trees on island
          ctx.fillStyle = "#1a6a10";
          ctx.beginPath();
          ctx.arc(-8, -8, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(8, 4, 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (ob.id === "mine") {
          // Sea mine: circle with spikes
          ctx.beginPath();
          ctx.arc(0, 0, ob.width * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ff4020";
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2;
            ctx.fillStyle = "#5a5a5a";
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * ob.width * 0.4, Math.sin(angle) * ob.width * 0.4, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (ob.id === "barrel" || ob.loot) {
          // Barrel / loot
          ctx.fillStyle = ob.hitFlash > 0 ? "#ffffff" : "#8a6a30";
          ctx.fillRect(-ob.width * 0.3, -ob.height * 0.35, ob.width * 0.6, ob.height * 0.7);
          ctx.strokeStyle = "#5a4a20";
          ctx.lineWidth = 2;
          ctx.strokeRect(-ob.width * 0.3, -ob.height * 0.35, ob.width * 0.6, ob.height * 0.7);
          // Metal bands
          ctx.strokeStyle = "#aaa";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-ob.width * 0.3, -ob.height * 0.1);
          ctx.lineTo(ob.width * 0.3, -ob.height * 0.1);
          ctx.moveTo(-ob.width * 0.3, ob.height * 0.15);
          ctx.lineTo(ob.width * 0.3, ob.height * 0.15);
          ctx.stroke();
        } else {
          // Rock
          ctx.beginPath();
          const pts = 7;
          for (let i = 0; i < pts; i++) {
            const a = (i / pts) * Math.PI * 2;
            const r = ob.width * 0.35 + Math.sin(i * 3.7) * ob.width * 0.08;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r * 0.85;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          // Rock highlight
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.beginPath();
          ctx.ellipse(-ob.width * 0.1, -ob.height * 0.1, ob.width * 0.15, ob.height * 0.12, -0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        // HP bar for destroyable with hp > 1
        if (ob.destroyable && ob.hp > 1) {
          const barW = ob.width * 0.6;
          const hpFrac = ob.currentHp / ob.hp;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(-barW / 2, -ob.height * 0.5 - 8, barW, 4);
          ctx.fillStyle = hpFrac > 0.5 ? "#40cc40" : "#cc4040";
          ctx.fillRect(-barW / 2, -ob.height * 0.5 - 8, barW * hpFrac, 4);
        }
      }
      ctx.restore();
    }

    // Bullets
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#ffa000";
    ctx.shadowBlur = 6;
    for (const b of s.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Particles
    for (const p of s.particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ship
    const blink = s.invulnTimer > 0 && Math.sin(s.invulnTimer * 20) > 0;
    if (!blink) {
      drawShip(ctx, s.shipX, s.shipY);
    }

    // Destination indicator at top
    const destAlpha = Math.min(1, Math.max(0, progress - 0.7) / 0.3);
    if (destAlpha > 0) {
      ctx.globalAlpha = destAlpha * (0.5 + Math.sin(s.elapsed * 4) * 0.3);
      ctx.fillStyle = "#2d5a1e";
      ctx.fillRect(0, 0, CANVAS_W, 40);
      ctx.fillStyle = "#4a8a30";
      for (let x = 0; x < CANVAS_W; x += 30) {
        ctx.beginPath();
        ctx.arc(x + 15, 35, 15 + Math.sin(x * 0.1) * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = destAlpha;
      ctx.fillStyle = "#d4a030";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillText("⚓ LĄD NA HORYZONCIE! ⚓", CANVAS_W / 2, 22);
      ctx.globalAlpha = 1;
    }

    // Progress bar at very top
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, CANVAS_W, 6);
    ctx.fillStyle = "#40a0e0";
    ctx.fillRect(0, 0, CANVAS_W * progress, 6);
  }, []);

  function drawShip(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Hull
    ctx.fillStyle = "#5a3a1a";
    ctx.beginPath();
    ctx.moveTo(-SHIP_W / 2, 10);
    ctx.lineTo(-SHIP_W / 2 + 8, SHIP_H / 2);
    ctx.lineTo(SHIP_W / 2 - 8, SHIP_H / 2);
    ctx.lineTo(SHIP_W / 2, 10);
    ctx.lineTo(SHIP_W / 2 - 4, -SHIP_H / 3);
    ctx.lineTo(-SHIP_W / 2 + 4, -SHIP_H / 3);
    ctx.closePath();
    ctx.fill();

    // Hull stripe
    ctx.strokeStyle = "#3a2a10";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-SHIP_W / 2 + 6, 5);
    ctx.lineTo(SHIP_W / 2 - 6, 5);
    ctx.stroke();

    // Mast
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(-2, -SHIP_H / 2 - 10, 4, SHIP_H * 0.7);

    // Sail
    ctx.fillStyle = "#e8d8c0";
    ctx.beginPath();
    ctx.moveTo(-18, -SHIP_H / 2 - 5);
    ctx.quadraticCurveTo(0, -SHIP_H / 2 + 8, 18, -SHIP_H / 2 - 5);
    ctx.lineTo(14, -10);
    ctx.quadraticCurveTo(0, -4, -14, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8a7a60";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Flag
    ctx.fillStyle = "#cc3030";
    ctx.beginPath();
    ctx.moveTo(2, -SHIP_H / 2 - 10);
    ctx.lineTo(14, -SHIP_H / 2 - 14);
    ctx.lineTo(14, -SHIP_H / 2 - 6);
    ctx.closePath();
    ctx.fill();

    // Bow decoration
    ctx.fillStyle = "#d4a030";
    ctx.beginPath();
    ctx.arc(0, -SHIP_H / 3 - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Result screen
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
          touchAction: "none",
          cursor: "crosshair",
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
        {/* HP */}
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

        {/* Score */}
        <div style={{
          background: "rgba(10,5,2,0.8)", border: "1px solid #5a4030",
          padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <GameIcon name="star" size={14} />
          <span>{hud.score}</span>
        </div>

        {/* Timer */}
        <div style={{
          background: "rgba(10,5,2,0.8)", border: "1px solid #5a4030",
          padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <GameIcon name="hourglass" size={14} />
          <span>{hud.time}s / {hud.maxTime}s</span>
        </div>
      </div>

      {/* Controls hint */}
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

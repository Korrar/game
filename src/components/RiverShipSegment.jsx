import React, { useRef, useEffect, useCallback, useState } from "react";
import { RIVER_OBSTACLES, RIVER_WAVE_PATTERNS, SEA_CURRENTS, WEATHER_EVENTS, SEA_ENEMIES, BONUS_GATES, getRiverSegmentConfig, getRiverRewards } from "../data/riverSegment";
import GameIcon from "./GameIcon";

// Ship river mini-game with currents, weather, enemies, wind, and bonus gates

const CANVAS_W = 1280;
const CANVAS_H = 720;
const SHIP_W = 80;
const SHIP_H = 110;

let obstacleIdCounter = 0;
let entityIdCounter = 0;

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

function getBiomeShoreColors(biome) {
  if (!biome) return { ground: "#c8b070", groundDark: "#a09050", foliage: "#2a5a18", foliageDark: "#1a3a10" };
  const id = biome.id;
  const m = {
    jungle: { ground: "#2d5a1e", groundDark: "#1a4010", foliage: "#1a6a10", foliageDark: "#0a4a08" },
    island: { ground: "#dcc880", groundDark: "#c4a860", foliage: "#2a8a30", foliageDark: "#1a5a18" },
    sunset_beach: { ground: "#e8c878", groundDark: "#d4a850", foliage: "#2a8a30", foliageDark: "#1a5a18" },
    desert: { ground: "#d4a840", groundDark: "#c09030", foliage: "#8a7a50", foliageDark: "#6a5a30" },
    winter: { ground: "#d8e4f0", groundDark: "#b8c8d8", foliage: "#5a7a8a", foliageDark: "#3a5a6a" },
    city: { ground: "#4a4038", groundDark: "#3a3028", foliage: "#5a5040", foliageDark: "#3a3020" },
    volcano: { ground: "#3a2218", groundDark: "#2a1810", foliage: "#4a2a10", foliageDark: "#2a1808" },
    summer: { ground: "#4a8a20", groundDark: "#3a7018", foliage: "#3a9a28", foliageDark: "#2a7018" },
    autumn: { ground: "#6a5030", groundDark: "#5a4020", foliage: "#8a5020", foliageDark: "#6a3810" },
    spring: { ground: "#38a028", groundDark: "#2a8018", foliage: "#40b030", foliageDark: "#2a8020" },
    mushroom: { ground: "#2a4a1a", groundDark: "#1a3a10", foliage: "#6a3a8a", foliageDark: "#4a2060" },
    swamp: { ground: "#2a3a18", groundDark: "#1a2a10", foliage: "#3a5a20", foliageDark: "#2a3a10" },
    bamboo_falls: { ground: "#1a5a30", groundDark: "#104a20", foliage: "#2a8a40", foliageDark: "#1a6a28" },
    blue_lagoon: { ground: "#1abcbc", groundDark: "#0a9a9a", foliage: "#2a8a60", foliageDark: "#1a6a40" },
  };
  return m[id] || { ground: "#c8b070", groundDark: "#a09050", foliage: "#2a5a18", foliageDark: "#1a3a10" };
}

// ── PURE DRAWING FUNCTIONS ──

function drawBank(ctx, s, bankBase, side) {
  const isLeft = side === "left";
  ctx.fillStyle = "#1a3a10";
  ctx.beginPath();
  if (isLeft) {
    ctx.moveTo(0, 0);
    for (let y = 0; y <= CANVAS_H; y += 15) {
      const bx = bankBase + Math.sin((y + s.waterOffset) * 0.04) * 10 + Math.sin((y + s.waterOffset) * 0.09) * 4;
      ctx.lineTo(bx, y);
    }
    ctx.lineTo(0, CANVAS_H);
  } else {
    ctx.moveTo(CANVAS_W, 0);
    for (let y = 0; y <= CANVAS_H; y += 15) {
      const bx = CANVAS_W - bankBase - Math.sin((y + s.waterOffset + 100) * 0.035) * 10 - Math.sin((y + s.waterOffset) * 0.08) * 5;
      ctx.lineTo(bx, y);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2a5a18";
  for (let y = -20 + (s.waterOffset % 40); y < CANVAS_H + 20; y += 40) {
    const bx = isLeft
      ? bankBase + Math.sin((y + s.waterOffset) * 0.04) * 10
      : CANVAS_W - bankBase - Math.sin((y + s.waterOffset + 100) * 0.035) * 10;
    ctx.beginPath();
    ctx.arc(isLeft ? bx + 2 : bx - 2, y, 12 + Math.sin(y * 0.3) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(180,220,255,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = 0; y <= CANVAS_H; y += 4) {
    const bx = isLeft
      ? bankBase + Math.sin((y + s.waterOffset) * 0.04) * 10 + Math.sin((y + s.waterOffset) * 0.09) * 4 + 3
      : CANVAS_W - bankBase - Math.sin((y + s.waterOffset + 100) * 0.035) * 10 - Math.sin((y + s.waterOffset) * 0.08) * 5 - 3;
    y === 0 ? ctx.moveTo(bx, y) : ctx.lineTo(bx, y);
  }
  ctx.stroke();
}

function drawObstacle(ctx, ob, time) {
  if (ob.pulls) {
    ctx.rotate(ob.rotation);
    const r = ob.width * 0.45;
    for (let ring = 0; ring < 5; ring++) {
      ctx.strokeStyle = `rgba(40,120,200,${0.5 - ring * 0.08})`;
      ctx.lineWidth = 2.5 - ring * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, r * (ring + 1) / 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(60,160,220,0.4)";
    ctx.lineWidth = 2;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.15) {
        const sr = 4 + a * (r / (Math.PI * 3));
        const angle = a + (arm * Math.PI * 2 / 3);
        a === 0 ? ctx.moveTo(Math.cos(angle) * sr, Math.sin(angle) * sr) : ctx.lineTo(Math.cos(angle) * sr, Math.sin(angle) * sr);
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
    const rng = seededRand(ob.rockSeed);
    const tc = ob.id === "island_large" ? 5 : 3;
    for (let t = 0; t < tc; t++) {
      const tx = (rng() - 0.5) * ob.width * 0.5;
      const ty = (rng() - 0.5) * ob.height * 0.4;
      const ts = 8 + rng() * 10;
      ctx.fillStyle = "#5a3a1a";
      ctx.fillRect(tx - 1.5, ty, 3, ts * 0.6);
      ctx.fillStyle = `rgb(${30 + rng() * 40},${80 + rng() * 60},${20 + rng() * 30})`;
      ctx.beginPath();
      ctx.arc(tx, ty - 2, ts * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ob.id === "mine") {
    const f = ob.hitFlash > 0;
    ctx.fillStyle = f ? "#fff" : "#2a2a2a";
    ctx.beginPath();
    ctx.arc(0, 0, ob.width * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a4a4a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let h = 0; h < 6; h++) {
      const angle = (h / 6) * Math.PI * 2;
      ctx.fillStyle = f ? "#ff8040" : "#5a5a5a";
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * ob.width * 0.38, Math.sin(angle) * ob.width * 0.38, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * (ob.width * 0.38 + 7), Math.sin(angle) * (ob.width * 0.38 + 7), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ff2020";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = Math.sin(time * 6) > 0 ? 10 : 3;
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (ob.id === "barrel" || ob.id === "wreck") {
    const f = ob.hitFlash > 0;
    if (ob.id === "wreck") {
      ctx.fillStyle = f ? "#fff" : "#4a3020";
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
    } else {
      ctx.fillStyle = f ? "#fff" : "#7a5a28";
      ctx.beginPath();
      ctx.ellipse(0, 0, ob.width * 0.38, ob.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = f ? "#fff" : "#aaa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -ob.height * 0.18, ob.width * 0.35, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, ob.height * 0.14, ob.width * 0.35, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (ob.loot) {
        ctx.fillStyle = "#ffd700";
        ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  } else {
    // Rock
    const f = ob.hitFlash > 0;
    const rng = seededRand(ob.rockSeed);
    const pts = 9;
    ctx.fillStyle = "rgba(0,15,30,0.4)";
    ctx.beginPath();
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = ob.width * 0.38 + rng() * ob.width * 0.1;
      const px = Math.cos(a) * r + 4;
      const py = Math.sin(a) * r * 0.8 + 4;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    const rng2 = seededRand(ob.rockSeed);
    ctx.fillStyle = f ? "#fff" : ob.id === "rock_large" ? "#4a4848" : "#5e5c5a";
    ctx.beginPath();
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = ob.width * 0.38 + rng2() * ob.width * 0.1;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
    }
    ctx.closePath();
    ctx.fill();
    if (!f) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(-ob.width * 0.08, -ob.height * 0.1, ob.width * 0.18, ob.height * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(200,230,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const fp = time * 2 + ob.rockSeed;
    for (let a = -0.8; a < 0.8; a += 0.15) {
      const fx = Math.cos(a + Math.PI * 0.5) * (ob.width * 0.42 + Math.sin(fp + a * 3) * 3);
      const fy = Math.sin(a + Math.PI * 0.5) * (ob.height * 0.38 + Math.sin(fp + a * 3) * 3);
      a === -0.8 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
    }
    ctx.stroke();
  }
}

function drawShip(ctx, x, y, steer, time, sailBillowMod) {
  ctx.save();
  ctx.translate(x, y);
  const lean = steer * 0.06;
  ctx.rotate(lean);

  const W = SHIP_W;
  const H = SHIP_H;

  // Bow spray
  ctx.strokeStyle = "rgba(180,220,255,0.25)";
  ctx.lineWidth = 1.5;
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.moveTo(side * 6, -H * 0.44);
    ctx.quadraticCurveTo(side * W * 0.35, -H * 0.52 + Math.sin(time * 7 + side) * 3, side * W * 0.45, -H * 0.38);
    ctx.stroke();
  }

  // Hull shadow
  ctx.fillStyle = "rgba(0,20,40,0.25)";
  ctx.beginPath();
  ctx.ellipse(3, H * 0.1, W * 0.46, H * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hull
  ctx.fillStyle = "#5a3018";
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.47);
  ctx.bezierCurveTo(-W * 0.12, -H * 0.42, -W * 0.35, -H * 0.3, -W * 0.44, -H * 0.05);
  ctx.bezierCurveTo(-W * 0.48, H * 0.15, -W * 0.42, H * 0.38, -W * 0.3, H * 0.46);
  ctx.bezierCurveTo(-W * 0.15, H * 0.5, W * 0.15, H * 0.5, W * 0.3, H * 0.46);
  ctx.bezierCurveTo(W * 0.42, H * 0.38, W * 0.48, H * 0.15, W * 0.44, -H * 0.05);
  ctx.bezierCurveTo(W * 0.35, -H * 0.3, W * 0.12, -H * 0.42, 0, -H * 0.47);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#3a2010";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Plank lines
  ctx.strokeStyle = "rgba(40,25,10,0.3)";
  ctx.lineWidth = 0.8;
  for (let py = -H * 0.32; py < H * 0.4; py += H * 0.1) {
    const halfW = W * 0.4 * (1 - Math.pow(Math.abs(py) / (H * 0.5), 1.5));
    if (halfW > 5) {
      ctx.beginPath();
      ctx.moveTo(-halfW, py);
      ctx.lineTo(halfW, py);
      ctx.stroke();
    }
  }

  // Gunwale
  ctx.strokeStyle = "#7a5028";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.47);
  ctx.bezierCurveTo(-W * 0.12, -H * 0.42, -W * 0.35, -H * 0.3, -W * 0.44, -H * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.47);
  ctx.bezierCurveTo(W * 0.12, -H * 0.42, W * 0.35, -H * 0.3, W * 0.44, -H * 0.05);
  ctx.stroke();

  // Bow figurehead
  ctx.fillStyle = "#d4a030";
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.5);
  ctx.lineTo(-5, -H * 0.44);
  ctx.lineTo(5, -H * 0.44);
  ctx.closePath();
  ctx.fill();

  // Stern castle
  ctx.fillStyle = "#4a2818";
  const scW = W * 0.52;
  ctx.beginPath();
  ctx.moveTo(-scW / 2, H * 0.22);
  ctx.quadraticCurveTo(-scW / 2 - 2, H * 0.44, -scW / 2 + 8, H * 0.46);
  ctx.lineTo(scW / 2 - 8, H * 0.46);
  ctx.quadraticCurveTo(scW / 2 + 2, H * 0.44, scW / 2, H * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2010";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Windows
  ctx.fillStyle = "#ffc850";
  ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.15;
  for (let wx = -1; wx <= 1; wx++) {
    ctx.beginPath();
    ctx.arc(wx * 11, H * 0.34, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Mast
  ctx.fillStyle = "#3a2518";
  ctx.fillRect(-2.5, -H * 0.38, 5, H * 0.62);

  // Main sail (billow affected by wind)
  const sailBillow = (5 + Math.sin(time * 1.5) * 2.5) * (sailBillowMod || 1);
  ctx.fillStyle = "#e8dcc8";
  ctx.beginPath();
  ctx.moveTo(-W * 0.3, -H * 0.35);
  ctx.quadraticCurveTo(-W * 0.12, -H * 0.15 + sailBillow, -W * 0.28, -H * 0.0);
  ctx.lineTo(W * 0.28, -H * 0.0);
  ctx.quadraticCurveTo(W * 0.12, -H * 0.15 + sailBillow, W * 0.3, -H * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a09080";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,100,80,0.25)";
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.35);
  ctx.lineTo(0, -H * 0.0);
  ctx.stroke();

  // Cross spars
  ctx.strokeStyle = "#3a2518";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-W * 0.32, -H * 0.35);
  ctx.lineTo(W * 0.32, -H * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-W * 0.3, -H * 0.0);
  ctx.lineTo(W * 0.3, -H * 0.0);
  ctx.stroke();

  // Rigging
  ctx.strokeStyle = "rgba(80,60,40,0.35)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-W * 0.32, -H * 0.35);
  ctx.lineTo(-W * 0.43, H * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W * 0.32, -H * 0.35);
  ctx.lineTo(W * 0.43, H * 0.05);
  ctx.stroke();

  // Crow's nest / flag pole
  ctx.fillStyle = "#3a2518";
  ctx.fillRect(-1.5, -H * 0.43, 3, H * 0.08);
  const flagWave = Math.sin(time * 3) * 3;
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(1.5, -H * 0.43);
  ctx.lineTo(16, -H * 0.47 + flagWave);
  ctx.lineTo(16, -H * 0.39 + flagWave);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ddd";
  ctx.beginPath();
  ctx.arc(10, -H * 0.43 + flagWave * 0.5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHelm(ctx, angle, steerInput) {
  const hx = CANVAS_W - 85;
  const hy = CANVAS_H - 75;
  const r = 35;

  ctx.save();
  ctx.translate(hx, hy);

  ctx.fillStyle = "rgba(10,5,2,0.7)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a4030";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.rotate(angle);

  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#6a4a28";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }

  ctx.fillStyle = "#8a6a38";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#4a3018";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a6a38";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = steerInput < 0 ? "#ffd700" : "rgba(200,180,140,0.3)";
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillText("◄", hx - r - 18, hy + 6);
  ctx.fillStyle = steerInput > 0 ? "#ffd700" : "rgba(200,180,140,0.3)";
  ctx.fillText("►", hx + r + 18, hy + 6);
}

// ── NEW DRAWING FUNCTIONS ──

function drawCurrent(ctx, cur, time) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  const dir = cur.direction; // -1 or 1
  // Draw flowing arrows / streaks
  ctx.fillStyle = cur.color || "rgba(40,160,220,0.2)";
  for (let iy = 0; iy < cur.height; iy += 18) {
    const y = cur.y + iy;
    if (y < -20 || y > CANVAS_H + 20) continue;
    const xOff = Math.sin((y + time * 120 * dir) * 0.03) * 8;
    const arrowX = cur.x + xOff + (time * 80 * dir) % cur.width - cur.width / 2;
    // Arrow shape
    ctx.beginPath();
    ctx.moveTo(arrowX, y);
    ctx.lineTo(arrowX + dir * 12, y - 4);
    ctx.lineTo(arrowX + dir * 12, y + 4);
    ctx.closePath();
    ctx.fill();
  }
  // Stream body
  ctx.fillStyle = cur.color || "rgba(40,160,220,0.12)";
  ctx.beginPath();
  for (let iy = 0; iy <= cur.height; iy += 8) {
    const y = cur.y + iy;
    const xOff = Math.sin((y + time * 60) * 0.04) * 10;
    iy === 0 ? ctx.moveTo(cur.x - cur.width / 2 + xOff, y) : ctx.lineTo(cur.x - cur.width / 2 + xOff, y);
  }
  for (let iy = cur.height; iy >= 0; iy -= 8) {
    const y = cur.y + iy;
    const xOff = Math.sin((y + time * 60) * 0.04) * 10;
    ctx.lineTo(cur.x + cur.width / 2 + xOff, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  if (enemy.behavior === "tentacle") {
    // Kraken tentacle - wavy vertical shape
    const phase = time * 3 + enemy.seed;
    ctx.strokeStyle = "#2a8a5a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, enemy.height * 0.5);
    for (let t = 0; t <= 1; t += 0.05) {
      const ty = enemy.height * 0.5 - t * enemy.height;
      const tx = Math.sin(t * 4 + phase) * 12 * (1 - t * 0.3);
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    // Suckers
    ctx.fillStyle = "#1a6a3a";
    for (let t = 0.15; t < 0.9; t += 0.2) {
      const ty = enemy.height * 0.5 - t * enemy.height;
      const tx = Math.sin(t * 4 + phase) * 12 * (1 - t * 0.3);
      ctx.beginPath();
      ctx.arc(tx + 4, ty, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tip
    ctx.fillStyle = "#3aaa6a";
    const tipX = Math.sin(4 + phase) * 8;
    ctx.beginPath();
    ctx.arc(tipX, -enemy.height * 0.5, 5, 0, Math.PI * 2);
    ctx.fill();
    // Water splash at base
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "rgba(120,200,255,0.4)";
    for (let sp = 0; sp < 4; sp++) {
      const sx = (Math.sin(time * 5 + sp * 1.7) * 15);
      const sy = enemy.height * 0.5 + Math.sin(time * 4 + sp) * 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 4 + Math.sin(time * 3 + sp) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (enemy.behavior === "ram") {
    // Pirate ship - small dark vessel
    const W = enemy.width;
    const H = enemy.height;
    ctx.fillStyle = "#2a1808";
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.4);
    ctx.bezierCurveTo(-W * 0.15, -H * 0.35, -W * 0.4, -H * 0.2, -W * 0.45, 0);
    ctx.bezierCurveTo(-W * 0.4, H * 0.3, -W * 0.2, H * 0.45, 0, H * 0.48);
    ctx.bezierCurveTo(W * 0.2, H * 0.45, W * 0.4, H * 0.3, W * 0.45, 0);
    ctx.bezierCurveTo(W * 0.4, -H * 0.2, W * 0.15, -H * 0.35, 0, -H * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a0a04";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Mast
    ctx.fillStyle = "#1a0a04";
    ctx.fillRect(-2, -H * 0.3, 4, H * 0.5);
    // Black sail
    const sb = 4 + Math.sin(time * 2) * 2;
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(-W * 0.25, -H * 0.28);
    ctx.quadraticCurveTo(0, -H * 0.1 + sb, -W * 0.22, H * 0.05);
    ctx.lineTo(W * 0.22, H * 0.05);
    ctx.quadraticCurveTo(0, -H * 0.1 + sb, W * 0.25, -H * 0.28);
    ctx.closePath();
    ctx.fill();
    // Skull on sail
    ctx.fillStyle = "#ccc";
    ctx.beginPath();
    ctx.arc(0, -H * 0.12 + sb * 0.5, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.behavior === "chase") {
    // Shark - triangular fin
    const bob = Math.sin(time * 4 + enemy.seed) * 2;
    ctx.fillStyle = "#5a6a7a";
    ctx.beginPath();
    ctx.moveTo(0, -15 + bob);
    ctx.lineTo(-8, 10 + bob);
    ctx.lineTo(8, 10 + bob);
    ctx.closePath();
    ctx.fill();
    // Dorsal fin shadow
    ctx.fillStyle = "#4a5a6a";
    ctx.beginPath();
    ctx.moveTo(0, -15 + bob);
    ctx.lineTo(-3, 5 + bob);
    ctx.lineTo(3, 5 + bob);
    ctx.closePath();
    ctx.fill();
    // Wake behind shark
    ctx.strokeStyle = "rgba(180,220,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, 12 + bob);
    ctx.quadraticCurveTo(-10, 22 + bob, -18, 28 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 12 + bob);
    ctx.quadraticCurveTo(10, 22 + bob, 18, 28 + bob);
    ctx.stroke();
  } else if (enemy.behavior === "drift") {
    // Jellyfish swarm - cluster of translucent blobs
    ctx.globalAlpha = 0.6;
    const rng = seededRand(enemy.seed);
    const count = 6;
    for (let j = 0; j < count; j++) {
      const jx = (rng() - 0.5) * enemy.width * 0.8;
      const jy = (rng() - 0.5) * enemy.height * 0.6;
      const jr = 8 + rng() * 6;
      const pulse = Math.sin(time * 2 + j * 1.2) * 2;
      // Bell
      ctx.fillStyle = `rgba(140,100,200,${0.4 + rng() * 0.2})`;
      ctx.beginPath();
      ctx.arc(jx, jy + pulse, jr, Math.PI, 0);
      ctx.quadraticCurveTo(jx + jr, jy + jr * 0.3 + pulse, jx, jy + jr * 0.6 + pulse);
      ctx.quadraticCurveTo(jx - jr, jy + jr * 0.3 + pulse, jx - jr, jy + pulse);
      ctx.fill();
      // Tentacles
      ctx.strokeStyle = `rgba(160,120,220,0.3)`;
      ctx.lineWidth = 1;
      for (let t = 0; t < 3; t++) {
        ctx.beginPath();
        const tx = jx + (t - 1) * 4;
        ctx.moveTo(tx, jy + jr * 0.6 + pulse);
        ctx.quadraticCurveTo(tx + Math.sin(time * 3 + t + j) * 5, jy + jr + 8 + pulse, tx + Math.sin(time * 2 + t) * 3, jy + jr + 16 + pulse);
        ctx.stroke();
      }
      // Glow
      ctx.fillStyle = `rgba(180,140,255,${0.15 + Math.sin(time * 2.5 + j) * 0.1})`;
      ctx.beginPath();
      ctx.arc(jx, jy + pulse, jr + 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawGate(ctx, gate, time) {
  const buoyR = 10;
  const flash = gate.flash > 0 ? gate.flash : 0;

  // Left buoy
  ctx.save();
  ctx.translate(gate.leftX, gate.y);
  const bob = Math.sin(time * 3 + gate.seed) * 3;
  ctx.fillStyle = flash > 0 ? `rgba(255,215,0,${0.5 + flash * 0.5})` : "#cc3030";
  ctx.beginPath();
  ctx.arc(0, bob, buoyR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-buoyR, bob);
  ctx.lineTo(buoyR, bob);
  ctx.stroke();
  // Flag
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(0, bob - buoyR);
  ctx.lineTo(0, bob - buoyR - 14);
  ctx.lineTo(8, bob - buoyR - 10);
  ctx.lineTo(0, bob - buoyR - 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right buoy
  ctx.save();
  ctx.translate(gate.rightX, gate.y);
  const bob2 = Math.sin(time * 3 + gate.seed + 1.5) * 3;
  ctx.fillStyle = flash > 0 ? `rgba(255,215,0,${0.5 + flash * 0.5})` : "#3060cc";
  ctx.beginPath();
  ctx.arc(0, bob2, buoyR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-buoyR, bob2);
  ctx.lineTo(buoyR, bob2);
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(0, bob2 - buoyR);
  ctx.lineTo(0, bob2 - buoyR - 14);
  ctx.lineTo(-8, bob2 - buoyR - 10);
  ctx.lineTo(0, bob2 - buoyR - 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Connecting line (dashed)
  ctx.save();
  ctx.strokeStyle = flash > 0 ? `rgba(255,215,0,${0.3 + flash * 0.4})` : "rgba(255,200,60,0.2)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(gate.leftX, gate.y + bob);
  ctx.lineTo(gate.rightX, gate.y + bob2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Combo text
  if (gate.combo > 0 && flash > 0) {
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff8800";
    ctx.shadowBlur = 8;
    ctx.fillText(`x${gate.combo + 1}`, (gate.leftX + gate.rightX) / 2, gate.y - 20);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawWindIndicator(ctx, windDir, windStrength, time) {
  const ix = 85;
  const iy = CANVAS_H - 75;
  const r = 22;

  ctx.save();
  ctx.translate(ix, iy);

  // Background
  ctx.fillStyle = "rgba(10,5,2,0.7)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a4030";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Compass rose
  ctx.strokeStyle = "rgba(200,180,140,0.3)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }

  // Wind arrow
  const arrowAngle = windDir; // radians, 0 = right, -PI/2 = up
  ctx.rotate(arrowAngle);
  const arrowLen = r * 0.7 * Math.min(1, windStrength / 3);

  // Arrow shaft
  ctx.strokeStyle = "#60b8e0";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-arrowLen * 0.3, 0);
  ctx.lineTo(arrowLen, 0);
  ctx.stroke();

  // Arrow head
  ctx.fillStyle = "#60b8e0";
  ctx.beginPath();
  ctx.moveTo(arrowLen + 4, 0);
  ctx.lineTo(arrowLen - 4, -5);
  ctx.lineTo(arrowLen - 4, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Label
  ctx.fillStyle = "rgba(200,180,140,0.5)";
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("WIATR", ix, iy + r + 14);
}

function drawWeatherOverlay(ctx, weather, time) {
  if (!weather) return;

  if (weather.id === "fog") {
    const fogAlpha = 0.4 * weather.intensity;
    ctx.fillStyle = `rgba(160,180,200,${fogAlpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Fog wisps
    ctx.globalAlpha = fogAlpha * 0.6;
    for (let i = 0; i < 8; i++) {
      const fx = (i * 170 + time * 30) % (CANVAS_W + 200) - 100;
      const fy = (i * 97 + time * 15) % CANVAS_H;
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 80 + Math.sin(time + i) * 20);
      fg.addColorStop(0, "rgba(180,200,220,0.3)");
      fg.addColorStop(1, "transparent");
      ctx.fillStyle = fg;
      ctx.fillRect(fx - 100, fy - 100, 200, 200);
    }
    ctx.globalAlpha = 1;
  } else if (weather.id === "storm") {
    // Dark overlay with rain streaks
    ctx.fillStyle = `rgba(10,15,30,${0.15 * weather.intensity})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Rain
    ctx.strokeStyle = `rgba(150,180,220,${0.15 * weather.intensity})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const rx = (i * 37 + time * 200) % CANVAS_W;
      const ry = (i * 53 + time * 600) % (CANVAS_H + 40) - 20;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 15);
      ctx.stroke();
    }
    // Lightning flash
    if (weather.lightning > 0) {
      ctx.fillStyle = `rgba(200,210,255,${weather.lightning * 0.3})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  } else if (weather.id === "night") {
    // Darkness with spotlight around ship
    ctx.fillStyle = `rgba(0,5,15,${0.7 * weather.intensity})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Spotlight cutout using compositing
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const spotR = 120 + Math.sin(time * 1.5) * 10;
    const sg = ctx.createRadialGradient(weather.shipX, weather.shipY, 0, weather.shipX, weather.shipY, spotR);
    sg.addColorStop(0, "rgba(0,0,0,0.9)");
    sg.addColorStop(0.6, "rgba(0,0,0,0.5)");
    sg.addColorStop(1, "transparent");
    ctx.fillStyle = sg;
    ctx.fillRect(weather.shipX - spotR, weather.shipY - spotR, spotR * 2, spotR * 2);
    ctx.restore();
    // Stars
    ctx.fillStyle = "rgba(255,255,200,0.5)";
    const starRng = seededRand(42);
    for (let i = 0; i < 30; i++) {
      const sx = starRng() * CANVAS_W;
      const sy = starRng() * CANVAS_H * 0.4;
      const twinkle = Math.sin(time * 2 + i * 1.7) > 0.5 ? 1 : 0.3;
      ctx.globalAlpha = twinkle * 0.4 * weather.intensity;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + starRng() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (weather.id === "side_wind") {
    // Wind streaks
    const dir = weather.windSide; // -1 or 1
    ctx.strokeStyle = `rgba(180,200,220,${0.08 * weather.intensity})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 25; i++) {
      const wx = (i * 53 + time * 200 * dir) % (CANVAS_W + 100) - 50;
      const wy = (i * 47) % CANVAS_H;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + dir * 30, wy + 2);
      ctx.stroke();
    }
  }
}

// ── RENDER FRAME ──

function renderFrame(canvas, s, progress, shoreColors, roomNum, destBiomeName) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const isDocking = s.docking;
  const shipY = CANVAS_H - 90;

  // ── OCEAN ──
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, "#04203a");
  grad.addColorStop(0.4, "#083050");
  grad.addColorStop(0.8, "#0a2848");
  grad.addColorStop(1, "#061828");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Caustics
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < 10; i++) {
    const cx = (i * 137 + s.elapsed * 25) % (CANVAS_W + 200) - 100;
    const cy = (i * 193 + s.waterOffset * 2) % (CANVAS_H + 100) - 50;
    const r = 35 + Math.sin(s.elapsed * 0.7 + i * 2.3) * 15;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    cg.addColorStop(0, "#60c0ff");
    cg.addColorStop(1, "transparent");
    ctx.fillStyle = cg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;

  // Wave layers
  for (let layer = 0; layer < 3; layer++) {
    const alpha = [0.07, 0.05, 0.035][layer];
    const freq = [0.008, 0.013, 0.019][layer];
    const amp = [10, 7, 4][layer];
    const speed = [50, 75, 100][layer];
    ctx.strokeStyle = `rgba(100,180,240,${alpha})`;
    ctx.lineWidth = [3, 2, 1.5][layer];
    for (let y = -40 + (s.waterOffset * (layer + 1) * 0.5 % 50); y < CANVAS_H + 40; y += 30 + layer * 8) {
      ctx.beginPath();
      for (let x = 0; x <= CANVAS_W; x += 8) {
        const wy = y + Math.sin((x + s.elapsed * speed) * freq) * amp
                     + Math.sin((x * 0.7 + s.elapsed * speed * 0.6) * freq * 1.5) * amp * 0.4;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }

  // Foam sparkles
  ctx.fillStyle = "rgba(200,230,255,0.25)";
  for (let y = -20 + (s.waterOffset % 60); y < CANVAS_H + 20; y += 60) {
    for (let x = 0; x < CANVAS_W; x += 45) {
      const sparkle = Math.sin(s.elapsed * 3 + x * 0.05 + y * 0.03);
      if (sparkle > 0.72) {
        ctx.globalAlpha = (sparkle - 0.72) * 2.5;
        const wy = y + Math.sin((x + s.elapsed * 50) * 0.01) * 6;
        ctx.beginPath();
        ctx.arc(x + Math.sin(y) * 8, wy, 1.5 + sparkle, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // ── SEA CURRENTS ──
  for (const cur of s.currents) {
    drawCurrent(ctx, cur, s.elapsed);
  }

  // ── RIVER BANKS ──
  const bankBase = 35;
  drawBank(ctx, s, bankBase, "left");
  drawBank(ctx, s, bankBase, "right");

  // ── DESTINATION SHORE ──
  const destAlpha = Math.min(1, Math.max(0, progress - 0.65) / 0.35);
  if (destAlpha > 0 || isDocking) {
    const shoreAlpha = isDocking ? 1 : destAlpha;
    const shoreH = isDocking ? 160 : 20 + destAlpha * 110;
    ctx.globalAlpha = shoreAlpha;

    ctx.fillStyle = shoreColors.ground;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= CANVAS_W; x += 12) {
      const sy = shoreH + Math.sin((x + s.elapsed * 12) * 0.025) * 6 + Math.sin(x * 0.06) * 4;
      ctx.lineTo(x, sy);
    }
    ctx.lineTo(CANVAS_W, 0);
    ctx.closePath();
    ctx.fill();

    const innerGrad = ctx.createLinearGradient(0, 0, 0, shoreH * 0.6);
    innerGrad.addColorStop(0, shoreColors.groundDark);
    innerGrad.addColorStop(1, "transparent");
    ctx.fillStyle = innerGrad;
    ctx.fillRect(0, 0, CANVAS_W, shoreH * 0.6);

    ctx.strokeStyle = "rgba(230,240,255,0.6)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_W; x += 5) {
      const fy = shoreH + Math.sin((x + s.elapsed * 35) * 0.022) * 4 + 4;
      x === 0 ? ctx.moveTo(x, fy) : ctx.lineTo(x, fy);
    }
    ctx.stroke();

    const treeRng = seededRand(roomNum * 7 + 42);
    const treeCount = isDocking ? 16 : Math.floor(destAlpha * 16);
    for (let t = 0; t < treeCount; t++) {
      const tx = treeRng() * CANVAS_W;
      const ty = treeRng() * (shoreH - 25) + 5;
      const ts = 10 + treeRng() * 16;
      ctx.fillStyle = "#5a3a1a";
      ctx.fillRect(tx - 2, ty, 4, ts * 0.45);
      ctx.fillStyle = shoreColors.foliage;
      ctx.beginPath();
      ctx.arc(tx, ty - 2, ts * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shoreColors.foliageDark;
      ctx.beginPath();
      ctx.arc(tx + 3, ty + 2, ts * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isDocking) {
      ctx.globalAlpha = Math.min(1, s.dockTimer / 1.0);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 26px monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 6;
      ctx.fillText(destBiomeName || "Nowy Ląd", CANVAS_W / 2, 28);
      ctx.shadowBlur = 0;
    } else if (destAlpha > 0.3) {
      ctx.globalAlpha = destAlpha * 0.7;
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(destBiomeName ? `${destBiomeName} na horyzoncie!` : "Ląd na horyzoncie!", CANVAS_W / 2, shoreH + 30);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  // ── WAKES ──
  for (const w of s.wakes) {
    ctx.globalAlpha = w.life * 0.3;
    ctx.strokeStyle = "rgba(180,220,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── BONUS GATES ──
  for (const gate of s.gates) {
    drawGate(ctx, gate, s.elapsed);
  }

  // ── OBSTACLES ──
  for (const ob of s.obstacles) {
    ctx.save();
    ctx.translate(ob.x, ob.y);
    drawObstacle(ctx, ob, s.elapsed);
    ctx.restore();
  }

  // ── SEA ENEMIES ──
  for (const enemy of s.enemies) {
    drawEnemy(ctx, enemy, s.elapsed);
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

  // ── GATE PASS PARTICLES ──
  for (const gp of s.gateParticles) {
    ctx.globalAlpha = gp.life;
    ctx.fillStyle = gp.color;
    ctx.font = `bold ${gp.size}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(gp.text, gp.x, gp.y);
  }
  ctx.globalAlpha = 1;

  // ── SHIP ──
  const blink = s.invulnTimer > 0 && Math.sin(s.invulnTimer * 20) > 0;
  if (!blink) drawShip(ctx, s.shipX, shipY, s.steerInput, s.elapsed, s.sailBillow);

  // ── WEATHER OVERLAY (drawn over everything except HUD) ──
  if (s.activeWeather) {
    drawWeatherOverlay(ctx, {
      ...s.activeWeather,
      shipX: s.shipX,
      shipY: shipY,
    }, s.elapsed);
  }

  // ── HELM WHEEL ──
  drawHelm(ctx, s.helmAngle, s.steerInput);

  // ── WIND INDICATOR ──
  drawWindIndicator(ctx, s.windDir, s.windStrength, s.elapsed);

  // ── PROGRESS BAR ──
  if (!isDocking) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, CANVAS_W, 6);
    const pg = ctx.createLinearGradient(0, 0, CANVAS_W * progress, 0);
    pg.addColorStop(0, "#2080c0");
    pg.addColorStop(1, "#40c0ff");
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, CANVAS_W * progress, 6);
  }

  // ── WEATHER NOTICE ──
  if (s.weatherNotice && s.weatherNotice.life > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.weatherNotice.life * 2);
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 6;
    ctx.fillText(s.weatherNotice.text, CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── COMPONENT ──

export default function RiverShipSegment({ roomNumber, onComplete, isMobile, shipUpgrades = [], destBiome }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [phase, setPhase] = useState("playing");
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, time: 0, maxTime: 15, gateCombo: 0, gatesHit: 0, weatherName: null, windDir: 0 });
  const keysRef = useRef({ left: false, right: false });
  const touchRef = useRef({ active: false, x: 0 });

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const destBiomeRef = useRef(destBiome);
  destBiomeRef.current = destBiome;
  const roomNumberRef = useRef(roomNumber);
  roomNumberRef.current = roomNumber;
  const shoreColorsRef = useRef(getBiomeShoreColors(destBiome));
  shoreColorsRef.current = getBiomeShoreColors(destBiome);

  // State initialization
  useEffect(() => {
    const cfg = getRiverSegmentConfig(roomNumber);
    const hpBonus = (shipUpgrades.includes("hull_1") ? 15 : 0) + (shipUpgrades.includes("hull_2") ? 30 : 0);
    const speedBonus = (shipUpgrades.includes("sails_1") ? 1.0 : 0) + (shipUpgrades.includes("sails_2") ? 1.5 : 0);
    const maxHp = cfg.shipHp + hpBonus;
    const initWindDir = (Math.random() - 0.5) * Math.PI; // random initial wind
    stateRef.current = {
      shipX: CANVAS_W / 2,
      shipHp: maxHp,
      shipMaxHp: maxHp,
      shipSpeed: cfg.shipSpeed + speedBonus,
      scrollSpeed: cfg.scrollSpeed,
      obstacles: [],
      particles: [],
      wakes: [],
      elapsed: 0,
      segmentLength: cfg.segmentLength,
      spawnTimer: 0,
      spawnRate: cfg.obstacleSpawnRate,
      difficulty: cfg.difficulty,
      invulnTimer: 0,
      done: false,
      waterOffset: 0,
      helmAngle: 0,
      steerInput: 0,
      docking: false,
      dockTimer: 0,
      dockDuration: 2.5,
      // New systems
      currents: [],
      currentSpawnTimer: cfg.currentSpawnRate * 0.5,
      enemies: [],
      enemySpawnTimer: cfg.enemySpawnRate,
      gates: [],
      gateSpawnTimer: 2000, // first gate spawns sooner
      gateCombo: 0,
      gatesHit: 0,
      gateParticles: [],
      // Wind system
      windDir: initWindDir,
      windTargetDir: initWindDir,
      windStrength: 1.5 + Math.random(),
      windChangeTimer: cfg.windChangeInterval,
      sailBillow: 1.0,
      // Weather
      activeWeather: null,
      weatherTimer: cfg.weatherInterval * 0.6,
      weatherNotice: null,
      // Config
      cfg,
    };
    setHud({ hp: maxHp, maxHp, time: 0, maxTime: cfg.segmentLength, gateCombo: 0, gatesHit: 0, weatherName: null, windDir: initWindDir });
  }, [roomNumber, shipUpgrades]);

  // Keyboard
  useEffect(() => {
    const onKey = (e, down) => {
      const k = keysRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") k.left = down;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") k.right = down;
    };
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  // Touch
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current = { active: true, x: t.clientX - rect.left };
  }, []);
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current = { active: true, x: t.clientX - rect.left };
  }, []);
  const handleTouchEnd = useCallback(() => { touchRef.current.active = false; }, []);

  // ── MAIN GAME LOOP ──
  useEffect(() => {
    let lastTime = performance.now();
    let hudTimer = 0;
    let alive = true;

    const loop = (now) => {
      if (!alive) return;
      const s = stateRef.current;
      if (!s || s.done) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // ── DOCKING PHASE ──
      if (s.docking) {
        s.dockTimer += dt;
        s.elapsed += dt * 0.2;
        const t = Math.min(1, s.dockTimer / s.dockDuration);

        s.scrollSpeed = Math.max(0, s.scrollSpeed * (1 - dt * 1.5));
        s.waterOffset = (s.waterOffset + s.scrollSpeed * 60 * dt) % 80;
        s.helmAngle *= 0.95;
        s.steerInput = 0;
        s.shipX += (CANVAS_W / 2 - s.shipX) * dt * 0.8;

        for (let i = s.wakes.length - 1; i >= 0; i--) {
          s.wakes[i].life -= dt * 0.8;
          s.wakes[i].size += dt * 4;
          if (s.wakes[i].life <= 0) s.wakes.splice(i, 1);
        }
        for (let i = s.particles.length - 1; i >= 0; i--) {
          s.particles[i].life -= dt;
          if (s.particles[i].life <= 0) s.particles.splice(i, 1);
        }
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          s.obstacles[i].y += s.scrollSpeed * 60 * dt;
          if (s.obstacles[i].y > CANVAS_H + 100) s.obstacles.splice(i, 1);
        }
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          s.enemies[i].y += s.scrollSpeed * 30 * dt;
          if (s.enemies[i].y > CANVAS_H + 100) s.enemies.splice(i, 1);
        }
        for (let i = s.gates.length - 1; i >= 0; i--) {
          s.gates[i].y += s.scrollSpeed * 60 * dt;
          if (s.gates[i].y > CANVAS_H + 60) s.gates.splice(i, 1);
        }
        for (let i = s.gateParticles.length - 1; i >= 0; i--) {
          s.gateParticles[i].life -= dt;
          s.gateParticles[i].y -= dt * 30;
          if (s.gateParticles[i].life <= 0) s.gateParticles.splice(i, 1);
        }
        // Fade out weather during docking
        if (s.activeWeather) {
          s.activeWeather.intensity -= dt * 0.5;
          if (s.activeWeather.intensity <= 0) s.activeWeather = null;
        }

        renderFrame(canvasRef.current, s, 1.0, shoreColorsRef.current, roomNumberRef.current, destBiomeRef.current?.name);

        if (t >= 1) {
          s.done = true;
          setPhase("complete");
          const rewards = getRiverRewards(roomNumberRef.current, s.shipHp, s.shipMaxHp, Math.floor(s.segmentLength * 3), s.gatesHit);
          setHud(h => ({ ...h, hp: s.shipHp, time: s.segmentLength, gatesHit: s.gatesHit }));
          setTimeout(() => {
            if (alive) onCompleteRef.current({ success: true, rewards, hpRemaining: s.shipHp, maxHp: s.shipMaxHp, score: Math.floor(s.segmentLength * 3), gatesHit: s.gatesHit });
          }, 1500);
        }
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      s.elapsed += dt;
      const progress = s.elapsed / s.segmentLength;

      // Start docking
      if (s.elapsed >= s.segmentLength) {
        s.docking = true;
        s.dockTimer = 0;
        setPhase("docking");
        renderFrame(canvasRef.current, s, 1.0, shoreColorsRef.current, roomNumberRef.current, destBiomeRef.current?.name);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── STEERING ──
      const k = keysRef.current;
      let steer = 0;
      if (k.left) steer = -1;
      if (k.right) steer = 1;

      if (touchRef.current.active && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const touchNorm = touchRef.current.x / rect.width;
        if (touchNorm < 0.4) steer = -1;
        else if (touchNorm > 0.6) steer = 1;
        else steer = 0;
      }

      s.steerInput = steer;
      let spd = s.shipSpeed * 60 * dt;

      // ── WIND SYSTEM ──
      s.windChangeTimer -= dt;
      if (s.windChangeTimer <= 0) {
        s.windTargetDir = (Math.random() - 0.5) * Math.PI;
        s.windStrength = 1.0 + Math.random() * 2.0;
        s.windChangeTimer = s.cfg.windChangeInterval * (0.7 + Math.random() * 0.6);
      }
      // Smooth wind direction change
      const windDiff = s.windTargetDir - s.windDir;
      s.windDir += windDiff * dt * 0.5;
      // Wind effect on ship speed: tailwind (wind from behind = -PI/2) speeds up, headwind slows down
      const windAlignForward = -Math.sin(s.windDir); // positive when wind pushes forward (down screen = travel direction)
      const windSpeedMod = 1 + windAlignForward * s.windStrength * 0.08;
      // Wind sideways push
      const windSideForce = Math.cos(s.windDir) * s.windStrength * 0.4 * dt;
      s.shipX += windSideForce;
      // Sail billow based on wind
      s.sailBillow = 0.5 + Math.abs(windAlignForward) * s.windStrength * 0.3;

      // Apply steering with wind modifier
      s.shipX += steer * spd * windSpeedMod;

      const targetHelm = steer * 0.8;
      s.helmAngle += (targetHelm - s.helmAngle) * 0.15;

      // ── WEATHER SYSTEM ──
      s.weatherTimer -= dt;
      if (!s.activeWeather && s.weatherTimer <= 0 && progress < 0.85) {
        // Try to spawn weather
        const eligible = WEATHER_EVENTS.filter(w => progress >= w.minProgress && Math.random() < w.chance);
        if (eligible.length > 0) {
          const chosen = eligible[Math.floor(Math.random() * eligible.length)];
          const dur = chosen.duration[0] + Math.random() * (chosen.duration[1] - chosen.duration[0]);
          s.activeWeather = {
            id: chosen.id,
            name: chosen.name,
            remaining: dur,
            intensity: 0, // ramps up
            windSide: Math.random() > 0.5 ? 1 : -1,
            lightning: 0,
            stormShake: 0,
          };
          s.weatherNotice = { text: chosen.name + "!", life: 2.0 };
        }
        s.weatherTimer = s.cfg.weatherInterval * (0.8 + Math.random() * 0.4);
      }

      if (s.activeWeather) {
        const w = s.activeWeather;
        w.remaining -= dt;
        // Ramp intensity up/down
        if (w.remaining > 1.5) {
          w.intensity = Math.min(1, w.intensity + dt * 0.8);
        } else {
          w.intensity = Math.max(0, w.remaining / 1.5);
        }

        if (w.id === "storm") {
          // Random shake
          w.stormShake = (Math.random() - 0.5) * 2 * w.intensity;
          s.shipX += w.stormShake;
          // Rare lightning
          if (Math.random() < 0.005 * w.intensity) w.lightning = 1;
          if (w.lightning > 0) w.lightning -= dt * 4;
        } else if (w.id === "side_wind") {
          // Strong side push
          s.shipX += w.windSide * 1.8 * w.intensity * dt * 60;
        }

        if (w.remaining <= 0) {
          s.activeWeather = null;
        }
      }

      // Weather notice fade
      if (s.weatherNotice) {
        s.weatherNotice.life -= dt;
        if (s.weatherNotice.life <= 0) s.weatherNotice = null;
      }

      const margin = SHIP_W / 2 + 50;
      s.shipX = Math.max(margin, Math.min(CANVAS_W - margin, s.shipX));

      s.waterOffset = (s.waterOffset + s.scrollSpeed * 60 * dt) % 80;

      // Wake trail
      if (Math.random() < 0.7) {
        s.wakes.push({
          x: s.shipX + (Math.random() - 0.5) * 20,
          y: CANVAS_H - 90 + SHIP_H * 0.4,
          life: 1.0, size: 6 + Math.random() * 8,
        });
      }
      for (let i = s.wakes.length - 1; i >= 0; i--) {
        s.wakes[i].y += s.scrollSpeed * 20 * dt;
        s.wakes[i].life -= dt * 0.8;
        s.wakes[i].size += dt * 10;
        if (s.wakes[i].life <= 0) s.wakes.splice(i, 1);
      }

      // ── SPAWN SEA CURRENTS ──
      s.currentSpawnTimer -= dt * 1000;
      if (s.currentSpawnTimer <= 0 && progress < 0.9) {
        const template = SEA_CURRENTS[Math.floor(Math.random() * SEA_CURRENTS.length)];
        const dir = Math.random() > 0.5 ? 1 : -1;
        s.currents.push({
          x: margin + Math.random() * (CANVAS_W - margin * 2),
          y: -200,
          width: template.width,
          height: 200 + Math.random() * 200,
          strength: template.strength,
          direction: dir,
          color: template.color,
          life: template.duration[0] + Math.random() * (template.duration[1] - template.duration[0]),
        });
        s.currentSpawnTimer = s.cfg.currentSpawnRate * (0.7 + Math.random() * 0.6);
      }

      // Update currents
      const shipY = CANVAS_H - 90;
      for (let i = s.currents.length - 1; i >= 0; i--) {
        const cur = s.currents[i];
        cur.y += s.scrollSpeed * 60 * dt;
        cur.life -= dt;
        if (cur.life <= 0 || cur.y > CANVAS_H + 300) {
          s.currents.splice(i, 1);
          continue;
        }
        // Ship inside current?
        if (s.shipX > cur.x - cur.width / 2 && s.shipX < cur.x + cur.width / 2 &&
            shipY > cur.y && shipY < cur.y + cur.height) {
          s.shipX += cur.direction * cur.strength * 60 * dt;
        }
      }

      // ── SPAWN ENEMIES ──
      s.enemySpawnTimer -= dt * 1000;
      if (s.enemySpawnTimer <= 0 && progress < 0.88) {
        const eligible = SEA_ENEMIES.filter(e => progress >= e.minProgress && Math.random() < e.spawnChance);
        if (eligible.length > 0) {
          const template = eligible[Math.floor(Math.random() * eligible.length)];
          const enemy = {
            ...template,
            uid: ++entityIdCounter,
            x: margin + Math.random() * (CANVAS_W - margin * 2),
            y: -template.height - 20,
            seed: Math.floor(Math.random() * 10000),
            hitFlash: 0,
            lifetime: 0,
            vx: 0,
            vy: 0,
          };
          if (template.behavior === "ram") {
            enemy.x = Math.random() > 0.5 ? margin : CANVAS_W - margin;
            enemy.vx = enemy.x < CANVAS_W / 2 ? template.speed : -template.speed;
          }
          if (template.behavior === "tentacle") {
            enemy.emergeTimer = 0.8;
            enemy.emerged = false;
          }
          s.enemies.push(enemy);
        }
        s.enemySpawnTimer = s.cfg.enemySpawnRate * (0.6 + Math.random() * 0.8);
      }

      // Update enemies
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        e.lifetime += dt;
        if (e.hitFlash > 0) e.hitFlash -= dt * 5;

        if (e.behavior === "tentacle") {
          e.y += s.scrollSpeed * 60 * dt;
          if (e.emergeTimer > 0) {
            e.emergeTimer -= dt;
          }
          if (e.lifetime > 6) { e.y += 100 * dt; } // sink after time
        } else if (e.behavior === "ram") {
          e.y += s.scrollSpeed * 40 * dt;
          e.x += e.vx * 60 * dt;
        } else if (e.behavior === "chase") {
          e.y += s.scrollSpeed * 50 * dt;
          // Slowly home toward ship
          const dx = s.shipX - e.x;
          e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 30 * dt);
        } else if (e.behavior === "drift") {
          e.y += s.scrollSpeed * 55 * dt;
        }

        // Off-screen removal
        if (e.y > CANVAS_H + 100 || e.x < -100 || e.x > CANVAS_W + 100) {
          s.enemies.splice(i, 1);
          continue;
        }

        // Collision with ship
        if (s.invulnTimer <= 0) {
          const dx = e.x - s.shipX;
          const dy = e.y - shipY;
          let collideR;
          if (e.behavior === "drift") {
            collideR = (e.width * 0.3 + SHIP_W * 0.3);
          } else if (e.behavior === "tentacle") {
            collideR = 25;
          } else {
            collideR = (e.width * 0.3 + SHIP_W * 0.3);
          }
          if (dx * dx + dy * dy < collideR * collideR && e.damage > 0) {
            s.shipHp -= e.damage;
            s.invulnTimer = 0.6;
            for (let p = 0; p < 10; p++) {
              s.particles.push({
                x: s.shipX + (Math.random() - 0.5) * 40,
                y: shipY + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.4 + Math.random() * 0.3,
                color: e.behavior === "chase" ? "#cc3030" : e.behavior === "drift" ? "#aa60dd" : "#8ac8ff",
                size: 3 + Math.random() * 4,
              });
            }
            if (e.behavior === "tentacle" || e.behavior === "ram") {
              s.enemies.splice(i, 1);
              continue;
            }
            if (s.shipHp <= 0) {
              s.shipHp = 0; s.done = true;
              setPhase("failed");
              setHud(h => ({ ...h, hp: 0, time: s.elapsed }));
              setTimeout(() => {
                if (alive) onCompleteRef.current({ success: false, rewards: { copper: Math.floor(s.elapsed * 1.5) }, hpRemaining: 0, maxHp: s.shipMaxHp, score: 0, gatesHit: s.gatesHit });
              }, 2000);
              return;
            }
          }
        }
      }

      // ── SPAWN BONUS GATES ──
      s.gateSpawnTimer -= dt * 1000;
      if (s.gateSpawnTimer <= 0 && progress > 0.05 && progress < 0.9) {
        const isNarrow = Math.random() < 0.3;
        const gateW = isNarrow ? BONUS_GATES.narrowWidth : BONUS_GATES.baseWidth;
        const centerX = margin + gateW / 2 + Math.random() * (CANVAS_W - margin * 2 - gateW);
        s.gates.push({
          leftX: centerX - gateW / 2,
          rightX: centerX + gateW / 2,
          y: -30,
          passed: false,
          flash: 0,
          combo: s.gateCombo,
          seed: Math.floor(Math.random() * 10000),
        });
        s.gateSpawnTimer = (BONUS_GATES.spawnInterval[0] + Math.random() * (BONUS_GATES.spawnInterval[1] - BONUS_GATES.spawnInterval[0])) * 1000;
      }

      // Update gates
      for (let i = s.gates.length - 1; i >= 0; i--) {
        const gate = s.gates[i];
        gate.y += s.scrollSpeed * 60 * dt;
        if (gate.flash > 0) gate.flash -= dt * 2;

        // Check if ship passed through gate
        if (!gate.passed && gate.y > shipY - 10 && gate.y < shipY + 20) {
          if (s.shipX > gate.leftX && s.shipX < gate.rightX) {
            // Success!
            gate.passed = true;
            gate.flash = 1.5;
            s.gateCombo = Math.min(BONUS_GATES.maxCombo, s.gateCombo + 1);
            s.gatesHit++;
            // Reward
            const mult = 1 + s.gateCombo * BONUS_GATES.comboMultiplier;
            s.shipHp = Math.min(s.shipMaxHp, s.shipHp + BONUS_GATES.rewards.hp);
            // Gate pass particle
            s.gateParticles.push({
              x: (gate.leftX + gate.rightX) / 2,
              y: gate.y - 10,
              text: s.gateCombo > 1 ? `+${Math.round(BONUS_GATES.rewards.score * mult)} ★x${s.gateCombo}` : `+${BONUS_GATES.rewards.score}`,
              color: "#ffd700",
              size: 16 + Math.min(s.gateCombo * 2, 8),
              life: 1.5,
            });
          } else if (gate.y > shipY + 15) {
            // Missed gate
            gate.passed = true;
            s.gateCombo = 0;
          }
        }

        if (gate.y > CANVAS_H + 60) { s.gates.splice(i, 1); }
      }

      // Update gate particles
      for (let i = s.gateParticles.length - 1; i >= 0; i--) {
        s.gateParticles[i].life -= dt;
        s.gateParticles[i].y -= dt * 30;
        if (s.gateParticles[i].life <= 0) s.gateParticles.splice(i, 1);
      }

      // Spawn obstacles
      if (progress < 0.88) {
        s.spawnTimer -= dt * 1000;
        if (s.spawnTimer <= 0) {
          const template = pickObstacleType(progress);
          s.obstacles.push({
            ...template,
            uid: ++obstacleIdCounter,
            x: margin + Math.random() * (CANVAS_W - margin * 2),
            y: -template.height - 10,
            currentHp: template.hp,
            rotation: template.pulls ? Math.random() * Math.PI * 2 : 0,
            hitFlash: 0,
            rockSeed: Math.floor(Math.random() * 10000),
          });
          s.spawnTimer = s.spawnRate * (0.6 + Math.random() * 0.8);
        }
      }

      // Update obstacles
      const scrollDy = s.scrollSpeed * 60 * dt;
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const ob = s.obstacles[i];
        ob.y += scrollDy;
        if (ob.pulls) ob.rotation += dt * 2.5;
        if (ob.hitFlash > 0) ob.hitFlash -= dt * 5;

        if (ob.pulls) {
          const dx = ob.x - s.shipX;
          const dy = ob.y - shipY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160 && dist > 10) {
            const pullForce = ob.pullStrength * (1 - dist / 160) * 60 * dt;
            s.shipX += (dx / dist) * pullForce;
          }
        }

        if (ob.y > CANVAS_H + 100) { s.obstacles.splice(i, 1); continue; }

        if (s.invulnTimer <= 0) {
          const dx = ob.x - s.shipX;
          const dy = ob.y - shipY;
          const collideR = (ob.width + SHIP_W) * 0.28;
          if (dx * dx + dy * dy < collideR * collideR && ob.damage > 0) {
            s.shipHp -= ob.damage;
            s.invulnTimer = 0.6;
            for (let p = 0; p < 12; p++) {
              s.particles.push({
                x: s.shipX + (Math.random() - 0.5) * 40,
                y: shipY + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.5 + Math.random() * 0.3,
                color: ob.explodes ? "#ff6020" : "#8ac8ff",
                size: 3 + Math.random() * 5,
              });
            }
            if (ob.explodes) { s.obstacles.splice(i, 1); continue; }
            if (s.shipHp <= 0) {
              s.shipHp = 0; s.done = true;
              setPhase("failed");
              setHud(h => ({ ...h, hp: 0, time: s.elapsed }));
              setTimeout(() => {
                if (alive) onCompleteRef.current({ success: false, rewards: { copper: Math.floor(s.elapsed * 1.5) }, hpRemaining: 0, maxHp: s.shipMaxHp, score: 0, gatesHit: s.gatesHit });
              }, 2000);
              return;
            }
          }
        }
      }

      if (s.invulnTimer > 0) s.invulnTimer -= dt;

      // Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.life -= dt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // Throttle HUD updates
      hudTimer += dt;
      if (hudTimer > 0.15) {
        hudTimer = 0;
        setHud({
          hp: s.shipHp, maxHp: s.shipMaxHp,
          time: Math.round(s.elapsed), maxTime: s.segmentLength,
          gateCombo: s.gateCombo, gatesHit: s.gatesHit,
          weatherName: s.activeWeather ? s.activeWeather.name : null,
          windDir: s.windDir,
        });
      }

      renderFrame(canvasRef.current, s, progress, shoreColorsRef.current, roomNumberRef.current, destBiomeRef.current?.name);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [roomNumber]);

  // ── RESULT SCREEN ──
  if (phase === "complete" || phase === "failed") {
    const rewards = phase === "complete"
      ? getRiverRewards(roomNumber, hud.hp, hud.maxHp, Math.floor(hud.maxTime * 3), hud.gatesHit)
      : { copper: Math.floor(hud.time * 1.5), bonusText: "Statek zatonął..." };
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
          {hud.gatesHit > 0 && (
            <div style={{ fontSize: 14, color: "#ffd700", marginTop: 6 }}>
              <GameIcon name="flag" size={14} /> Bramki: {hud.gatesHit}
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
      {phase === "playing" && (
        <div style={{
          position: "absolute", top: 10, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap",
          fontFamily: "monospace", fontSize: isMobile ? 11 : 14,
          color: "#d8c8a8", textShadow: "1px 1px 0 #000",
          pointerEvents: "none", zIndex: 10,
        }}>
          <div style={{
            background: "rgba(10,5,2,0.8)", border: "1px solid #5a4030",
            padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
          }}>
            <GameIcon name="shield" size={14} />
            <div style={{ width: 80, height: 8, background: "#1a0a0a", border: "1px solid #3a2a1a" }}>
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
          {hud.gateCombo > 0 && (
            <div style={{
              background: "rgba(10,5,2,0.8)", border: "1px solid #8a6a20",
              padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
              color: "#ffd700",
            }}>
              <GameIcon name="flag" size={14} />
              <span>x{hud.gateCombo}</span>
            </div>
          )}
          {hud.weatherName && (
            <div style={{
              background: "rgba(10,5,2,0.8)", border: "1px solid #4a6080",
              padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
              color: "#80b8e0",
            }}>
              <GameIcon name="water" size={14} />
              <span>{hud.weatherName}</span>
            </div>
          )}
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
          position: "absolute", bottom: 10, left: 20,
          fontFamily: "monospace", fontSize: isMobile ? 10 : 12,
          color: "rgba(200,180,160,0.5)", textShadow: "1px 1px 0 #000",
          pointerEvents: "none", zIndex: 10,
        }}>
          {isMobile ? "Dotknij lewą/prawą stronę ekranu" : "← → / A D — steruj statkiem"}
        </div>
      )}
    </div>
  );
}

import React, { useRef, useEffect, useCallback, useState } from "react";
import { BIOMES } from "../data/biomes";
import GameIcon from "./GameIcon";

const MAP_W = 1280;
const MAP_H = 720;
const SHIP_SIZE = 18;
const DOCK_RADIUS = 55;
const SHIP_SPEED = 2.8;
const SHIP_FRICTION = 0.96;
const WAVE_SPEED = 0.0008;

// Draw a procedural island shape
function drawIsland(ctx, cx, cy, radius, color, time) {
  ctx.save();
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const r = radius + Math.sin(a * 3.7 + 1) * radius * 0.18 + Math.sin(a * 5.3) * radius * 0.08;
    const px = cx + Math.cos(a) * r + 4;
    const py = cy + Math.sin(a) * r + 4;
    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Shore / beach ring
  ctx.fillStyle = "#d4b878";
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const r = radius + 4 + Math.sin(a * 3.7 + 1) * radius * 0.18 + Math.sin(a * 5.3) * radius * 0.08;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Main island
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const r = radius + Math.sin(a * 3.7 + 1) * radius * 0.18 + Math.sin(a * 5.3) * radius * 0.08;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  const hr = radius * 0.5;
  ctx.arc(cx - radius * 0.2, cy - radius * 0.2, hr, 0, Math.PI * 2);
  ctx.fill();

  // Shore waves animation
  ctx.strokeStyle = "rgba(180,220,255,0.3)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const waveR = radius + 8 + i * 5 + Math.sin(time * 2 + i) * 2;
    ctx.beginPath();
    const startA = (time * 0.5 + i * 2.1) % (Math.PI * 2);
    ctx.arc(cx, cy, waveR, startA, startA + 1.2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw the pirate ship
function drawShip(ctx, x, y, angle, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Hull
  ctx.fillStyle = "#5a3a1a";
  ctx.beginPath();
  ctx.moveTo(-SHIP_SIZE * 0.5, SHIP_SIZE * 0.3);
  ctx.lineTo(-SHIP_SIZE * 0.3, -SHIP_SIZE * 0.5);
  ctx.lineTo(0, -SHIP_SIZE * 0.7);
  ctx.lineTo(SHIP_SIZE * 0.3, -SHIP_SIZE * 0.5);
  ctx.lineTo(SHIP_SIZE * 0.5, SHIP_SIZE * 0.3);
  ctx.quadraticCurveTo(0, SHIP_SIZE * 0.5, -SHIP_SIZE * 0.5, SHIP_SIZE * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2a10";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Mast
  ctx.strokeStyle = "#4a3018";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, SHIP_SIZE * 0.15);
  ctx.lineTo(0, -SHIP_SIZE * 0.35);
  ctx.stroke();

  // Sail
  const sailFlutter = Math.sin(time * 3) * 2;
  ctx.fillStyle = "#f0e0c0";
  ctx.beginPath();
  ctx.moveTo(0, -SHIP_SIZE * 0.35);
  ctx.quadraticCurveTo(SHIP_SIZE * 0.35 + sailFlutter, -SHIP_SIZE * 0.15, 0, SHIP_SIZE * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c0a880";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Flag
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(0, -SHIP_SIZE * 0.35);
  ctx.lineTo(SHIP_SIZE * 0.15 + sailFlutter * 0.5, -SHIP_SIZE * 0.42);
  ctx.lineTo(0, -SHIP_SIZE * 0.48);
  ctx.closePath();
  ctx.fill();

  // Wake trail
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "rgba(180,220,255,0.25)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const wakeY = SHIP_SIZE * 0.3 + i * 6;
    const wakeW = 3 + i * 3;
    ctx.beginPath();
    ctx.moveTo(-wakeW, wakeY);
    ctx.quadraticCurveTo(0, wakeY + 2, wakeW, wakeY);
    ctx.stroke();
  }
  ctx.restore();
}

// Draw ocean background
function drawOcean(ctx, w, h, time) {
  // Deep ocean gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#0a2a4a");
  grad.addColorStop(0.4, "#0c3060");
  grad.addColorStop(1, "#081830");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Wave lines
  ctx.strokeStyle = "rgba(80,140,200,0.08)";
  ctx.lineWidth = 1;
  for (let row = 0; row < h; row += 18) {
    ctx.beginPath();
    for (let col = 0; col < w; col += 4) {
      const y = row + Math.sin(col * 0.015 + time * 1.5 + row * 0.05) * 3
                    + Math.sin(col * 0.008 + time * 0.8) * 2;
      col === 0 ? ctx.moveTo(col, y) : ctx.lineTo(col, y);
    }
    ctx.stroke();
  }

  // Glitter / light spots
  ctx.fillStyle = "rgba(180,220,255,0.04)";
  for (let i = 0; i < 30; i++) {
    const gx = (Math.sin(i * 7.3 + time * 0.3) * 0.5 + 0.5) * w;
    const gy = (Math.cos(i * 5.1 + time * 0.2) * 0.5 + 0.5) * h;
    const gr = 15 + Math.sin(i * 3.3 + time * 2) * 8;
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw compass rose
function drawCompass(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);

  // Background circle
  ctx.fillStyle = "rgba(20,15,10,0.7)";
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a08050";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cardinal points
  const dirs = [
    { label: "N", angle: -Math.PI / 2 },
    { label: "E", angle: 0 },
    { label: "S", angle: Math.PI / 2 },
    { label: "W", angle: Math.PI },
  ];
  ctx.fillStyle = "#d4a030";
  ctx.font = `bold ${size * 0.35}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const d of dirs) {
    const dx = Math.cos(d.angle) * size * 0.65;
    const dy = Math.sin(d.angle) * size * 0.65;
    ctx.fillText(d.label, dx, dy);
  }

  // Needle
  ctx.fillStyle = "#cc3030";
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.45);
  ctx.lineTo(-size * 0.08, 0);
  ctx.lineTo(size * 0.08, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e8e0d0";
  ctx.beginPath();
  ctx.moveTo(0, size * 0.45);
  ctx.lineTo(-size * 0.08, 0);
  ctx.lineTo(size * 0.08, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export default function WorldMap({ onDock, shipPos, isMobile, roomNumber }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    shipX: shipPos?.x ?? MAP_W * 0.5,
    shipY: shipPos?.y ?? MAP_H * 0.5,
    shipVx: 0,
    shipVy: 0,
    shipAngle: -Math.PI / 2,
    targetAngle: -Math.PI / 2,
    keys: {},
    waypoint: null,
    time: 0,
    nearIsland: null,
  });
  const rafRef = useRef(null);
  const [nearIsland, setNearIsland] = useState(null);
  const [hoverIsland, setHoverIsland] = useState(null);

  // Touch joystick state
  const touchRef = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });

  // Keyboard handlers
  useEffect(() => {
    const s = stateRef.current;
    const onDown = (e) => {
      s.keys[e.key] = true;
      // Clear waypoint when using keyboard
      if (["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        s.waypoint = null;
      }
    };
    const onUp = (e) => { s.keys[e.key] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  // Canvas click/touch for waypoint
  const handleCanvasInteraction = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;
    stateRef.current.waypoint = { x: mx, y: my };
  }, []);

  const handleClick = useCallback((e) => {
    handleCanvasInteraction(e.clientX, e.clientY);
  }, [handleCanvasInteraction]);

  // Touch controls
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchRef.current = { active: true, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (touchRef.current.active && e.touches.length === 1) {
      const t = e.touches[0];
      touchRef.current.dx = t.clientX - touchRef.current.startX;
      touchRef.current.dy = t.clientY - touchRef.current.startY;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const tr = touchRef.current;
    // If very short drag — treat as tap for waypoint
    if (tr.active && Math.abs(tr.dx) < 10 && Math.abs(tr.dy) < 10) {
      const ct = e.changedTouches[0];
      if (ct) handleCanvasInteraction(ct.clientX, ct.clientY);
    }
    touchRef.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  }, [handleCanvasInteraction]);

  // Mouse move for hover detection
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let found = null;
    for (const b of BIOMES) {
      const ix = b.mapPos.x * MAP_W;
      const iy = b.mapPos.y * MAP_H;
      const dist = Math.hypot(mx - ix, my - iy);
      if (dist < (b.mapSize || 30) + 10) { found = b; break; }
    }
    setHoverIsland(found);
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = (timestamp) => {
      const s = stateRef.current;
      const dt = 1 / 60;
      s.time += dt;

      // Input: keyboard
      let ax = 0, ay = 0;
      if (s.keys["w"] || s.keys["ArrowUp"]) ay -= 1;
      if (s.keys["s"] || s.keys["ArrowDown"]) ay += 1;
      if (s.keys["a"] || s.keys["ArrowLeft"]) ax -= 1;
      if (s.keys["d"] || s.keys["ArrowRight"]) ax += 1;

      // Input: touch joystick
      const tr = touchRef.current;
      if (tr.active && (Math.abs(tr.dx) > 10 || Math.abs(tr.dy) > 10)) {
        const mag = Math.hypot(tr.dx, tr.dy);
        const clamp = Math.min(mag, 80) / 80;
        ax += (tr.dx / mag) * clamp;
        ay += (tr.dy / mag) * clamp;
      }

      // Input: waypoint
      if (s.waypoint) {
        const dx = s.waypoint.x - s.shipX;
        const dy = s.waypoint.y - s.shipY;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) {
          s.waypoint = null;
        } else {
          ax += dx / dist;
          ay += dy / dist;
        }
      }

      // Normalize input
      const inputMag = Math.hypot(ax, ay);
      if (inputMag > 1) { ax /= inputMag; ay /= inputMag; }

      // Apply acceleration
      if (inputMag > 0.1) {
        s.shipVx += ax * SHIP_SPEED * 0.08;
        s.shipVy += ay * SHIP_SPEED * 0.08;
        s.targetAngle = Math.atan2(ay, ax);
      }

      // Friction
      s.shipVx *= SHIP_FRICTION;
      s.shipVy *= SHIP_FRICTION;

      // Clamp speed
      const speed = Math.hypot(s.shipVx, s.shipVy);
      if (speed > SHIP_SPEED) {
        s.shipVx = (s.shipVx / speed) * SHIP_SPEED;
        s.shipVy = (s.shipVy / speed) * SHIP_SPEED;
      }

      // Move
      s.shipX += s.shipVx;
      s.shipY += s.shipVy;

      // Bounds
      s.shipX = Math.max(20, Math.min(MAP_W - 20, s.shipX));
      s.shipY = Math.max(20, Math.min(MAP_H - 20, s.shipY));

      // Smooth angle rotation
      let angleDiff = s.targetAngle - s.shipAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      s.shipAngle += angleDiff * 0.08;

      // Check proximity to islands
      let closest = null;
      let closestDist = Infinity;
      for (const b of BIOMES) {
        const ix = b.mapPos.x * MAP_W;
        const iy = b.mapPos.y * MAP_H;
        const dist = Math.hypot(s.shipX - ix, s.shipY - iy);
        if (dist < DOCK_RADIUS && dist < closestDist) {
          closest = b;
          closestDist = dist;
        }
      }
      if (closest !== s.nearIsland) {
        s.nearIsland = closest;
        setNearIsland(closest);
      }

      // ── DRAW ──
      drawOcean(ctx, MAP_W, MAP_H, s.time);

      // Draw grid lines (subtle navigation grid)
      ctx.strokeStyle = "rgba(60,100,140,0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < MAP_W; gx += 80) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, MAP_H); ctx.stroke();
      }
      for (let gy = 0; gy < MAP_H; gy += 80) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(MAP_W, gy); ctx.stroke();
      }

      // Draw waypoint indicator
      if (s.waypoint) {
        ctx.strokeStyle = "rgba(255,215,0,0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(s.shipX, s.shipY);
        ctx.lineTo(s.waypoint.x, s.waypoint.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Waypoint marker
        const wpPulse = Math.sin(s.time * 4) * 3 + 5;
        ctx.strokeStyle = "rgba(255,215,0,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.waypoint.x, s.waypoint.y, wpPulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw islands
      for (const b of BIOMES) {
        const ix = b.mapPos.x * MAP_W;
        const iy = b.mapPos.y * MAP_H;
        const isNear = closest === b;
        const isHover = hoverIsland === b;
        const sz = (b.mapSize || 30) + (isNear ? 3 : 0);

        drawIsland(ctx, ix, iy, sz, b.mapColor || b.groundCol, s.time);

        // Dock radius indicator when near
        if (isNear) {
          ctx.strokeStyle = "rgba(255,215,0,0.35)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(ix, iy, DOCK_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Difficulty stars
        const starY = iy + sz + 18;
        ctx.fillStyle = isNear ? "#ffd700" : "rgba(255,215,0,0.5)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("★".repeat(b.difficulty || 1), ix, starY);

        // Island name
        const nameY = iy - sz - 8;
        ctx.fillStyle = isNear ? "#fff" : isHover ? "#d4c8a0" : "rgba(200,190,160,0.6)";
        ctx.font = `${isNear ? "bold " : ""}${isNear || isHover ? 12 : 10}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(b.name, ix, nameY);
      }

      // Draw ship
      drawShip(ctx, s.shipX, s.shipY, s.shipAngle + Math.PI / 2, s.time);

      // Compass
      drawCompass(ctx, MAP_W - 50, 50, 28);

      // Room counter
      ctx.fillStyle = "rgba(20,15,10,0.7)";
      ctx.fillRect(10, 10, 140, 30);
      ctx.strokeStyle = "#a08050";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 140, 30);
      ctx.fillStyle = "#d4c8a0";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Pokój: ${roomNumber || 0}`, 18, 30);

      // Touch joystick indicator
      if (tr.active && (Math.abs(tr.dx) > 10 || Math.abs(tr.dy) > 10)) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = MAP_W / rect.width;
        const scaleY = MAP_H / rect.height;
        const jx = tr.startX * scaleX / (rect.width / MAP_W);
        const jy = tr.startY * scaleY / (rect.height / MAP_H);

        // Just draw a small indicator in the corner
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.arc(70, MAP_H - 70, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const clampMag = Math.min(Math.hypot(tr.dx, tr.dy), 80);
        const ndx = (tr.dx / Math.max(Math.hypot(tr.dx, tr.dy), 1)) * (clampMag / 80) * 25;
        const ndy = (tr.dy / Math.max(Math.hypot(tr.dx, tr.dy), 1)) * (clampMag / 80) * 25;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.arc(70 + ndx, MAP_H - 70 + ndy, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Instructions
      ctx.fillStyle = "rgba(200,190,160,0.5)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isMobile ? "Przeciągnij aby sterować • Dotknij wyspę aby płynąć" : "WASD / Strzałki — sterowanie • Kliknij na mapę aby wyznaczyć kurs", MAP_W / 2, MAP_H - 12);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [hoverIsland, isMobile]);

  const handleDock = useCallback(() => {
    if (!nearIsland) return;
    const s = stateRef.current;
    onDock(nearIsland, { x: s.shipX, y: s.shipY });
  }, [nearIsland, onDock]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: "100%",
          maxWidth: MAP_W,
          height: "auto",
          maxHeight: "100vh",
          objectFit: "contain",
          cursor: "crosshair",
          touchAction: "none",
        }}
      />

      {/* Dock button */}
      {nearIsland && (
        <div style={{
          position: "absolute",
          bottom: isMobile ? 80 : 50,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}>
          <button
            onClick={handleDock}
            style={{
              padding: "12px 32px",
              background: "linear-gradient(180deg, #5a3a1a, #3a2210)",
              border: "2px solid #d4a030",
              color: "#ffd700",
              fontSize: 16,
              fontWeight: "bold",
              cursor: "pointer",
              borderRadius: 6,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 0 20px rgba(212,160,48,0.2)",
              animation: "dockPulse 1.5s ease-in-out infinite",
            }}
          >
            <GameIcon name="anchor" size={18} style={{ marginRight: 6 }} />
            Cumuj — {nearIsland.name}
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>
              {"★".repeat(nearIsland.difficulty || 1)}
            </span>
          </button>
        </div>
      )}

      {/* Hover tooltip */}
      {hoverIsland && !nearIsland && (
        <div style={{
          position: "absolute",
          top: 50,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(20,15,10,0.85)",
          border: "1px solid #a08050",
          padding: "6px 14px",
          color: "#d4c8a0",
          fontSize: 13,
          borderRadius: 4,
          pointerEvents: "none",
        }}>
          <GameIcon name={hoverIsland.icon} size={16} style={{ marginRight: 4 }} />
          <strong>{hoverIsland.name}</strong>
          <span style={{ marginLeft: 8, color: "#ffd700" }}>{"★".repeat(hoverIsland.difficulty || 1)}</span>
        </div>
      )}

      <style>{`
        @keyframes dockPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 20px rgba(212,160,48,0.2); }
          50% { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 30px rgba(212,160,48,0.4); }
        }
      `}</style>
    </div>
  );
}

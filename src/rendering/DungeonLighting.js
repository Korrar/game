// DungeonLighting — Canvas2D darkness overlay with dynamic light sources
// Renders ambient darkness that deepens per dungeon level
// Light sources (torches, crystals, caravan) punch through the darkness

import { worldToScreen, ISO_CONFIG } from "../utils/isometricUtils.js";
import { getHeightAt } from "../utils/isometricUtils.js";

// ─── LIGHT SOURCE DEFINITIONS ───

export const LIGHT_DEFS = {
  torch: {
    radius: 5,           // tiles
    color: "#ff8844",
    colorInner: "#ffcc88",
    flicker: 0.15,
    intensity: 0.8,
    icon: "fire",
  },
  lantern: {
    radius: 6,
    color: "#ffcc44",
    colorInner: "#ffee88",
    flicker: 0.08,
    intensity: 0.9,
    icon: "lantern",
  },
  crystal: {
    radius: 3.5,
    color: "#44aaff",
    colorInner: "#88ccff",
    flicker: 0.05,
    intensity: 0.6,
    icon: "crystal",
  },
  bioluminescence: {
    radius: 3,
    color: "#44ffaa",
    colorInner: "#88ffcc",
    flicker: 0.03,
    intensity: 0.5,
    icon: "star",
  },
  ghost_flame: {
    radius: 4,
    color: "#8844cc",
    colorInner: "#bb88ff",
    flicker: 0.12,
    intensity: 0.7,
    icon: "ghost",
  },
  caravan: {
    radius: 7,
    color: "#ffdd66",
    colorInner: "#ffeeaa",
    flicker: 0.10,
    intensity: 1.0,
    icon: "lantern",
  },
  lava: {
    radius: 4,
    color: "#ff4400",
    colorInner: "#ff8844",
    flicker: 0.20,
    intensity: 0.7,
    icon: "fire",
  },
  stairs: {
    radius: 3,
    color: "#ffeecc",
    colorInner: "#ffffff",
    flicker: 0.04,
    intensity: 0.6,
    icon: "star",
  },
};

// ─── MAIN RENDER FUNCTION ───
// Renders darkness overlay with light source cutouts on a Canvas2D context

export function renderDungeonLighting(ctx, W, H, options) {
  const {
    ambientLight,       // 0-1, lower = darker (from dungeon level config)
    lightSources,       // array of { wx, wy, type, phase }
    caravanPos,         // { x, y } world coords
    cameraX,
    cameraY,
    heightMap,
    time,               // Date.now() for animations
    zoom,               // camera zoom level
  } = options;

  if (ambientLight >= 1.0) return; // no darkness needed

  const darkness = 1 - ambientLight;

  // Create off-screen canvas for light mask
  const offCanvas = document.createElement("canvas");
  offCanvas.width = W;
  offCanvas.height = H;
  const offCtx = offCanvas.getContext("2d");

  // Fill with darkness
  offCtx.fillStyle = `rgba(0,0,0,${darkness})`;
  offCtx.fillRect(0, 0, W, H);

  // Cut out light sources using destination-out composite
  offCtx.globalCompositeOperation = "destination-out";

  const allLights = [];

  // Add static light sources
  if (lightSources) {
    for (const light of lightSources) {
      const def = LIGHT_DEFS[light.type] || LIGHT_DEFS.torch;
      const height = heightMap ? getHeightAt(heightMap, Math.floor(light.wx), Math.floor(light.wy)) : 0;
      const screen = worldToScreen(light.wx, light.wy, cameraX, cameraY, height);
      allLights.push({
        sx: screen.x,
        sy: screen.y,
        def,
        phase: light.phase || 0,
      });
    }
  }

  // Add caravan light
  if (caravanPos) {
    const caravanH = heightMap ? getHeightAt(heightMap, Math.floor(caravanPos.x), Math.floor(caravanPos.y)) : 0;
    const caravanScreen = worldToScreen(caravanPos.x, caravanPos.y, cameraX, cameraY, caravanH);
    allLights.push({
      sx: caravanScreen.x,
      sy: caravanScreen.y,
      def: LIGHT_DEFS.caravan,
      phase: 0,
    });
  }

  // Render each light as a radial gradient cutout
  const zoomFactor = zoom || 1;
  for (const light of allLights) {
    const { sx, sy, def, phase } = light;

    // Flicker effect
    const flickerAmount = Math.sin(time * 0.005 + phase) * def.flicker
      + Math.sin(time * 0.013 + phase * 2.3) * def.flicker * 0.5;
    const flickerScale = 1 + flickerAmount;
    const r = def.radius * ISO_CONFIG.TILE_W * flickerScale * zoomFactor;

    // Intensity with flicker
    const intensity = def.intensity * (1 - Math.abs(flickerAmount) * 0.3);

    // Radial gradient for soft light edge
    const grad = offCtx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, `rgba(0,0,0,${intensity})`);
    grad.addColorStop(0.4, `rgba(0,0,0,${intensity * 0.7})`);
    grad.addColorStop(0.7, `rgba(0,0,0,${intensity * 0.3})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");

    offCtx.fillStyle = grad;
    offCtx.beginPath();
    offCtx.arc(sx, sy, r, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Draw darkness overlay onto main canvas
  offCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(offCanvas, 0, 0);

  // Add colored light glow (additive) on top
  ctx.globalCompositeOperation = "screen";
  for (const light of allLights) {
    const { sx, sy, def, phase } = light;
    const flickerAmount = Math.sin(time * 0.005 + phase) * def.flicker;
    const flickerScale = 1 + flickerAmount;
    const r = def.radius * ISO_CONFIG.TILE_W * 0.5 * flickerScale * zoomFactor;
    const colorAlpha = 0.15 * def.intensity * (1 - darkness * 0.3);

    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, colorWithAlpha(def.colorInner, colorAlpha));
    grad.addColorStop(0.5, colorWithAlpha(def.color, colorAlpha * 0.5));
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

// ─── RENDER STAIRS / DUNGEON ENTRANCE TERRAIN TEXTURES ───
// Draws biome-integrated isometric tile textures for stairs/exits

// Stair visual config per type — colors blend with dungeon ground
const STAIR_VISUALS = {
  down: {
    // Stone stairway descending into darkness
    baseFill: "#3a2a1a",
    stepLight: "#6a5a4a",
    stepDark: "#2a1a0a",
    edgeColor: "#4a3a2a",
    accentGlow: "rgba(255,100,60,0.35)",
    accentColor: "#ff6644",
    rimLight: "rgba(255,140,80,0.25)",
    icon: "\u25BC",
    label: "Schody w dół",
    steps: 4,
  },
  up: {
    // Stone stairway going up toward lighter area
    baseFill: "#2a3a4a",
    stepLight: "#5a7a9a",
    stepDark: "#1a2a3a",
    edgeColor: "#3a4a5a",
    accentGlow: "rgba(80,160,255,0.35)",
    accentColor: "#44aaff",
    rimLight: "rgba(100,180,255,0.25)",
    icon: "\u25B2",
    label: "Schody w górę",
    steps: 4,
  },
  exit: {
    // Arched stone doorway with daylight spilling through
    baseFill: "#3a4a30",
    stepLight: "#7a9a60",
    stepDark: "#2a3a1a",
    edgeColor: "#4a5a3a",
    accentGlow: "rgba(80,255,140,0.4)",
    accentColor: "#44ff88",
    rimLight: "rgba(120,255,160,0.3)",
    icon: "\u2605",
    label: "Wyjście",
    steps: 2,
  },
};

export function renderStairsMarkers(ctx, dungeonFeatures, cameraX, cameraY, heightMap, time) {
  if (!dungeonFeatures?.stairs) return;

  const TW = ISO_CONFIG.TILE_W;
  const TH = ISO_CONFIG.TILE_H;
  const pulse = 0.6 + Math.sin(time * 0.003) * 0.3;
  const slowPulse = 0.5 + Math.sin(time * 0.0015) * 0.5;

  for (const stair of dungeonFeatures.stairs) {
    const vis = STAIR_VISUALS[stair.type] || STAIR_VISUALS.down;
    const height = heightMap ? getHeightAt(heightMap, stair.col, stair.row) : 0;
    const screen = worldToScreen(stair.wx, stair.wy, cameraX, cameraY, height);
    const cx = screen.x;
    const cy = screen.y;

    ctx.save();

    // ─── 1. Base isometric tile (dark ground pad, 3x3 area) ───
    // Draw a recessed diamond-shaped platform that looks carved into terrain
    const padW = TW * 1.4;
    const padH = TH * 1.4;

    // Outer worn stone border
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = vis.edgeColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - padH / 2 - 2);
    ctx.lineTo(cx + padW / 2 + 2, cy);
    ctx.lineTo(cx, cy + padH / 2 + 2);
    ctx.lineTo(cx - padW / 2 - 2, cy);
    ctx.closePath();
    ctx.fill();

    // Inner recessed pad
    ctx.fillStyle = vis.baseFill;
    ctx.beginPath();
    ctx.moveTo(cx, cy - padH / 2);
    ctx.lineTo(cx + padW / 2, cy);
    ctx.lineTo(cx, cy + padH / 2);
    ctx.lineTo(cx - padW / 2, cy);
    ctx.closePath();
    ctx.fill();

    // Stone texture lines across the pad
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = vis.stepLight;
    ctx.lineWidth = 0.5;
    for (let i = 1; i < vis.steps; i++) {
      const t = i / vis.steps;
      // Horizontal stone lines (isometric)
      const ly = cy - padH / 2 + padH * t;
      const lxSpread = (padW / 2) * (1 - Math.abs(t * 2 - 1));
      ctx.beginPath();
      ctx.moveTo(cx - lxSpread, ly);
      ctx.lineTo(cx + lxSpread, ly);
      ctx.stroke();
    }

    // ─── 2. Steps texture (descending/ascending illusion) ───
    ctx.globalAlpha = 0.9;
    const stepW = padW * 0.55;
    const stepH = padH * 0.14;
    const stepStartY = stair.type === "down" ? cy - padH * 0.15 : cy + padH * 0.15;
    const stepDir = stair.type === "down" ? 1 : -1;

    for (let s = 0; s < vis.steps; s++) {
      const t = s / vis.steps;
      const sy = stepStartY + stepDir * s * stepH * 1.3;
      const shrink = 1 - t * 0.15;
      const sw = stepW * shrink;
      const depthDark = t * 0.3;

      // Step top face (lighter)
      ctx.fillStyle = vis.stepLight;
      ctx.globalAlpha = 0.7 - depthDark;
      ctx.beginPath();
      ctx.moveTo(cx, sy - stepH * 0.3);
      ctx.lineTo(cx + sw / 2, sy);
      ctx.lineTo(cx, sy + stepH * 0.3);
      ctx.lineTo(cx - sw / 2, sy);
      ctx.closePath();
      ctx.fill();

      // Step front face (darker, gives 3D depth)
      ctx.fillStyle = vis.stepDark;
      ctx.globalAlpha = 0.6 - depthDark * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - sw / 2, sy);
      ctx.lineTo(cx, sy + stepH * 0.3);
      ctx.lineTo(cx, sy + stepH * 0.3 + 3);
      ctx.lineTo(cx - sw / 2, sy + 3);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + sw / 2, sy);
      ctx.lineTo(cx, sy + stepH * 0.3);
      ctx.lineTo(cx, sy + stepH * 0.3 + 3);
      ctx.lineTo(cx + sw / 2, sy + 3);
      ctx.closePath();
      ctx.fill();
    }

    // ─── 3. Darkness hole for "down" stairs ───
    if (stair.type === "down") {
      const holeGrad = ctx.createRadialGradient(cx, cy + padH * 0.2, 0, cx, cy + padH * 0.2, padW * 0.3);
      holeGrad.addColorStop(0, "rgba(0,0,0,0.8)");
      holeGrad.addColorStop(0.6, "rgba(0,0,0,0.4)");
      holeGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      // Isometric ellipse for the hole
      ctx.ellipse(cx, cy + padH * 0.2, padW * 0.25, padH * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── 4. Archway for exit ───
    if (stair.type === "exit") {
      // Stone archway frame
      const archW = padW * 0.4;
      const archH = padH * 0.8;
      ctx.globalAlpha = 0.8;

      // Left pillar
      ctx.fillStyle = vis.edgeColor;
      ctx.fillRect(cx - archW / 2 - 4, cy - archH * 0.4, 5, archH * 0.5);
      // Right pillar
      ctx.fillRect(cx + archW / 2 - 1, cy - archH * 0.4, 5, archH * 0.5);
      // Arch top
      ctx.beginPath();
      ctx.arc(cx, cy - archH * 0.4, archW / 2 + 2, Math.PI, 0, false);
      ctx.lineWidth = 4;
      ctx.strokeStyle = vis.edgeColor;
      ctx.stroke();

      // Light spill through archway
      const exitGrad = ctx.createRadialGradient(cx, cy - padH * 0.15, 2, cx, cy - padH * 0.15, padW * 0.35);
      exitGrad.addColorStop(0, "rgba(200,255,200,0.4)");
      exitGrad.addColorStop(0.5, "rgba(140,220,140,0.15)");
      exitGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = pulse * 0.6;
      ctx.fillStyle = exitGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - padH * 0.15, padW * 0.3, padH * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── 5. Ambient glow around the feature (subtle) ───
    const glowR = TW * 1.8;
    const glowGrad = ctx.createRadialGradient(cx, cy, TW * 0.2, cx, cy, glowR);
    glowGrad.addColorStop(0, vis.accentGlow);
    glowGrad.addColorStop(0.5, vis.rimLight);
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = pulse * 0.45;
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // ─── 6. Corner stone pillars / torch posts ───
    ctx.globalAlpha = 0.75;
    const postOffsets = [
      { dx: -padW / 2 - 1, dy: 0 },
      { dx: padW / 2 + 1, dy: 0 },
    ];
    for (const off of postOffsets) {
      const px = cx + off.dx;
      const py = cy + off.dy;

      // Stone post
      ctx.fillStyle = vis.edgeColor;
      ctx.fillRect(px - 2, py - 8, 4, 10);

      // Tiny flame/crystal on top
      const flicker = 0.7 + Math.sin(time * 0.008 + off.dx) * 0.3;
      ctx.globalAlpha = flicker * 0.7;
      const flameGrad = ctx.createRadialGradient(px, py - 10, 0, px, py - 10, 5);
      flameGrad.addColorStop(0, vis.accentColor);
      flameGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(px, py - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── 7. Rune / carved symbols on the stone ───
    ctx.globalAlpha = slowPulse * 0.5;
    ctx.strokeStyle = vis.accentColor;
    ctx.lineWidth = 1;
    // Small rune marks around the perimeter
    const runeCount = 4;
    for (let r = 0; r < runeCount; r++) {
      const angle = (r / runeCount) * Math.PI * 2 + time * 0.0005;
      const rx = cx + Math.cos(angle) * padW * 0.38;
      const ry = cy + Math.sin(angle) * padH * 0.38;
      ctx.beginPath();
      ctx.arc(rx, ry, 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ─── 8. Particles rising/falling (dust/embers) ───
    ctx.globalAlpha = pulse * 0.5;
    const particleCount = 5;
    for (let p = 0; p < particleCount; p++) {
      const seed = stair.col * 17 + stair.row * 31 + p * 7;
      const phase = (time * 0.001 + seed) % 3;
      const pProgress = phase / 3; // 0..1 cycle
      const pDir = stair.type === "down" ? 1 : -1;
      const px = cx + Math.sin(seed * 1.3 + time * 0.002) * padW * 0.25;
      const py = cy + pDir * pProgress * padH * 0.5;
      const pAlpha = (1 - pProgress) * 0.6;
      const pSize = 1.5 + Math.sin(seed) * 0.5;
      ctx.globalAlpha = pAlpha * pulse;
      ctx.fillStyle = vis.accentColor;
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── 9. Label (subtle, below the feature) ───
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#000";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(vis.label, cx + 1, cy + padH / 2 + 14);
    ctx.fillText(vis.label, cx - 1, cy + padH / 2 + 14);
    ctx.fillStyle = vis.accentColor;
    ctx.fillText(vis.label, cx, cy + padH / 2 + 13);

    // Small icon above the label
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = pulse * 0.9;
    ctx.fillText(vis.icon, cx, cy - padH / 2 - 8);

    ctx.restore();
  }
}

// ─── HELPERS ───

function colorWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

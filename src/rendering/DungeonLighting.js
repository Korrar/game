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

// ─── RENDER STAIRS GLOW ───
// Visual indicator for stairs/exits on the dungeon map

export function renderStairsMarkers(ctx, dungeonFeatures, cameraX, cameraY, heightMap, time) {
  if (!dungeonFeatures?.stairs) return;

  for (const stair of dungeonFeatures.stairs) {
    const height = heightMap ? getHeightAt(heightMap, stair.col, stair.row) : 0;
    const screen = worldToScreen(stair.wx, stair.wy, cameraX, cameraY, height);

    // Pulsing glow
    const pulse = 0.6 + Math.sin(time * 0.003) * 0.3;
    const r = ISO_CONFIG.TILE_W * 1.5;

    // Color based on stair type
    let color, icon;
    if (stair.type === "down") {
      color = "#ff6644";
      icon = "\u25BC"; // down arrow
    } else if (stair.type === "up") {
      color = "#44aaff";
      icon = "\u25B2"; // up arrow
    } else {
      color = "#44ff88";
      icon = "\u2605"; // star (exit)
    }

    // Glow ring
    ctx.save();
    ctx.globalAlpha = pulse * 0.4;
    const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, screen.x, screen.y - 8);

    // Label
    ctx.font = "10px monospace";
    ctx.fillStyle = color;
    const label = stair.type === "down" ? "Schody w dół"
      : stair.type === "up" ? "Schody w górę"
      : "Wyjście";
    ctx.fillText(label, screen.x, screen.y + 12);
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

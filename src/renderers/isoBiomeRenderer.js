// IsoBiomeRenderer — Canvas2D isometric tile-based ground renderer
// Replaces panoramic biomeRenderers with isometric diamond tile ground

import { ISO_CONFIG, worldToScreen } from "../utils/isometricUtils.js";
import { seedRng } from "../utils/helpers";
import { getIconImage } from "../rendering/icons.js";

// ─── TILE RENDERING ───

// Cache rendered tile images to avoid re-drawing each frame
const _tileCache = new Map();

function getTileCacheKey(biomeId, variant) {
  return `${biomeId}_${variant}`;
}

// Create a single diamond tile image
function createTileImage(color, outlineColor) {
  const { TILE_W, TILE_H } = ISO_CONFIG;
  const canvas = document.createElement("canvas");
  canvas.width = TILE_W;
  canvas.height = TILE_H;
  const ctx = canvas.getContext("2d");

  // Diamond path
  ctx.beginPath();
  ctx.moveTo(TILE_W / 2, 0);           // top
  ctx.lineTo(TILE_W, TILE_H / 2);      // right
  ctx.lineTo(TILE_W / 2, TILE_H);      // bottom
  ctx.lineTo(0, TILE_H / 2);           // left
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  if (outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  return canvas;
}

// Get or create cached tile image
function getCachedTile(biomeId, colorIndex, colors, outlineColor) {
  const key = getTileCacheKey(biomeId, colorIndex);
  if (_tileCache.has(key)) return _tileCache.get(key);
  const img = createTileImage(colors[colorIndex], outlineColor);
  _tileCache.set(key, img);
  return img;
}

// ─── BIOME TILE COLORS ───

function getBiomeTileColors(biome) {
  // Generate tile color variants from biome ground colors
  const base = biome.groundCol || "#4a8a20";
  const dark = biome.groundBot || "#3a7018";
  // Create 4 variants by mixing base and dark
  return {
    colors: [base, dark, mixColor(base, dark, 0.3), mixColor(base, dark, 0.7)],
    outline: "rgba(0,0,0,0.08)",
  };
}

function mixColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── SCATTER ON ISO GRID ───

function drawIsoScatter(ctx, biome, room, cameraX, cameraY) {
  const { MAP_COLS, MAP_ROWS, GAME_W, GAME_H } = ISO_CONFIG;
  const rng = seedRng(room * 137 + 99);
  const items = biome.scatter || [];
  if (!items.length) return;

  // Generate scatter positions in world space
  const scatterList = [];
  const count = Math.min(30, MAP_COLS * MAP_ROWS * 0.02);

  for (let i = 0; i < count; i++) {
    const wx = 1 + rng() * (MAP_COLS - 2);
    const wy = 1 + rng() * (MAP_ROWS - 2);
    const iconName = items[Math.floor(rng() * items.length)];
    const rVal = rng();
    scatterList.push({ wx, wy, iconName, rVal });
  }

  // Sort by iso depth (far first)
  scatterList.sort((a, b) => (a.wx + a.wy) - (b.wx + b.wy));

  for (const s of scatterList) {
    const screen = worldToScreen(s.wx, s.wy, cameraX, cameraY);
    // Skip if off-screen
    if (screen.x < -50 || screen.x > GAME_W + 50 || screen.y < -50 || screen.y > GAME_H + 50) continue;

    const baseSz = 20 + s.rVal * 24;
    const sz = Math.round(baseSz);
    const alpha = 0.5 + s.rVal * 0.4;
    ctx.globalAlpha = alpha;
    const img = getIconImage(s.iconName, sz);
    if (img) {
      // Position scatter at ground level (TILE_H/2 below tile top)
      ctx.drawImage(img, screen.x - sz / 2, screen.y + ISO_CONFIG.TILE_H / 2 - sz, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}

// ─── MAIN RENDER FUNCTION ───

export function renderIsoBiome(ctx, biome, room, W, H, isNight, cameraX, cameraY) {
  const { TILE_W, TILE_H, MAP_COLS, MAP_ROWS } = ISO_CONFIG;
  const rng = seedRng(room * 137 + 42);

  // Background fill (sky color covers everything)
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  sky.addColorStop(0, biome.skyTop);
  sky.addColorStop(1, biome.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Night sky
  if (isNight) {
    ctx.fillStyle = "rgba(0,0,12,0.65)";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 80; i++) {
      const sx = rng() * W, sy = rng() * H * 0.4;
      const size = 0.5 + rng() * 2;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rng() * 0.6})`;
      ctx.fillRect(sx, sy, size, size);
    }
    // Moon
    const mx = W * 0.82, my = H * 0.08, mr = 22;
    ctx.fillStyle = "rgba(255,255,220,0.85)";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }

  // Get tile colors for this biome
  const tileInfo = getBiomeTileColors(biome);

  // Calculate visible tile range (only render tiles on screen)
  // Find world coords of screen corners
  const margin = 2; // extra tiles for safety
  const corners = [
    { sx: -TILE_W, sy: -TILE_H },
    { sx: W + TILE_W, sy: -TILE_H },
    { sx: -TILE_W, sy: H + TILE_H },
    { sx: W + TILE_W, sy: H + TILE_H },
  ];

  let minCol = MAP_COLS, maxCol = 0, minRow = MAP_ROWS, maxRow = 0;
  // Import screenToWorld inline to avoid circular dep
  for (const c of corners) {
    const adjX = c.sx - W / 2 + cameraX;
    const adjY = c.sy - H / 2 + cameraY;
    const wx = (adjX / (TILE_W / 2) + adjY / (TILE_H / 2)) / 2;
    const wy = (adjY / (TILE_H / 2) - adjX / (TILE_W / 2)) / 2;
    minCol = Math.min(minCol, Math.floor(wx));
    maxCol = Math.max(maxCol, Math.ceil(wx));
    minRow = Math.min(minRow, Math.floor(wy));
    maxRow = Math.max(maxRow, Math.ceil(wy));
  }

  minCol = Math.max(0, minCol - margin);
  maxCol = Math.min(MAP_COLS - 1, maxCol + margin);
  minRow = Math.max(0, minRow - margin);
  maxRow = Math.min(MAP_ROWS - 1, maxRow + margin);

  // Render tiles in depth order (top-left to bottom-right in iso)
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const screen = worldToScreen(col, row, cameraX, cameraY);
      // Tile anchor: top-center of diamond
      const tx = screen.x - TILE_W / 2;
      const ty = screen.y;

      // Pick tile color variant deterministically (no RNG — must be stable across frames)
      const variant = Math.abs((col * 7 + row * 13) % tileInfo.colors.length);
      const tileImg = getCachedTile(biome.id, variant, tileInfo.colors, tileInfo.outline);
      ctx.drawImage(tileImg, tx, ty, TILE_W, TILE_H);
    }
  }

  // Map border effect — darker edges
  const edgeFade = 3; // tiles from edge to start darkening
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const edgeDist = Math.min(col, row, MAP_COLS - 1 - col, MAP_ROWS - 1 - row);
      if (edgeDist < edgeFade) {
        const screen = worldToScreen(col, row, cameraX, cameraY);
        const alpha = 0.3 * (1 - edgeDist / edgeFade);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screen.x + TILE_W / 2, screen.y + TILE_H / 2);
        ctx.lineTo(screen.x, screen.y + TILE_H);
        ctx.lineTo(screen.x - TILE_W / 2, screen.y + TILE_H / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Scatter decorations
  drawIsoScatter(ctx, biome, room, cameraX, cameraY);

  // Fog overlay
  if (biome.fogCol) {
    ctx.fillStyle = biome.fogCol;
    ctx.fillRect(0, 0, W, H);
  }

  // Night atmosphere
  if (isNight) {
    ctx.fillStyle = "rgba(5,5,20,0.15)";
    ctx.fillRect(0, 0, W, H);
  }
}

// Clear tile cache (call on biome change)
export function clearTileCache() {
  _tileCache.clear();
}

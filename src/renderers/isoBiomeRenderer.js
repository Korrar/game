// IsoBiomeRenderer — Canvas2D isometric tile-based ground renderer
// Supports terrain elevation, tile variants, and atmospheric effects

import { ISO_CONFIG, worldToScreen, getHeightAt } from "../utils/isometricUtils.js";
import { seedRng } from "../utils/helpers";
import { getIconImage } from "../rendering/icons.js";

// ─── TILE RENDERING ───

// Cache rendered tile images to avoid re-drawing each frame
const _tileCache = new Map();

function getTileCacheKey(biomeId, variant, elevated) {
  return `${biomeId}_${variant}_${elevated ? 1 : 0}`;
}

// Create a single diamond tile image (flat ground tile)
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

// Create an elevated tile (diamond top + side walls for 3D look)
function createElevatedTileImage(topColor, leftColor, rightColor, outlineColor, heightPx) {
  const { TILE_W, TILE_H } = ISO_CONFIG;
  const canvas = document.createElement("canvas");
  canvas.width = TILE_W;
  canvas.height = TILE_H + heightPx;
  const ctx = canvas.getContext("2d");

  // Left wall (darker side)
  ctx.beginPath();
  ctx.moveTo(0, TILE_H / 2);                         // top-left of diamond
  ctx.lineTo(TILE_W / 2, TILE_H);                    // bottom of diamond
  ctx.lineTo(TILE_W / 2, TILE_H + heightPx);         // bottom extended
  ctx.lineTo(0, TILE_H / 2 + heightPx);              // left extended
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();

  // Right wall (medium shade)
  ctx.beginPath();
  ctx.moveTo(TILE_W, TILE_H / 2);                    // top-right of diamond
  ctx.lineTo(TILE_W / 2, TILE_H);                    // bottom of diamond
  ctx.lineTo(TILE_W / 2, TILE_H + heightPx);         // bottom extended
  ctx.lineTo(TILE_W, TILE_H / 2 + heightPx);         // right extended
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();

  // Top face (diamond)
  ctx.beginPath();
  ctx.moveTo(TILE_W / 2, 0);
  ctx.lineTo(TILE_W, TILE_H / 2);
  ctx.lineTo(TILE_W / 2, TILE_H);
  ctx.lineTo(0, TILE_H / 2);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();

  if (outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  return canvas;
}

// Get or create cached tile image
function getCachedTile(biomeId, colorIndex, colors, outlineColor, heightPx) {
  const elevated = heightPx > 0;
  const key = getTileCacheKey(biomeId, colorIndex, elevated);
  if (_tileCache.has(key)) return _tileCache.get(key);

  let img;
  if (elevated) {
    const top = colors[colorIndex];
    const left = darkenColor(top, 0.35);
    const right = darkenColor(top, 0.2);
    img = createElevatedTileImage(top, left, right, outlineColor, heightPx);
  } else {
    img = createTileImage(colors[colorIndex], outlineColor);
  }
  _tileCache.set(key, img);
  return img;
}

// ─── COLOR UTILITIES ───

function getBiomeTileColors(biome) {
  const base = biome.groundCol || "#4a8a20";
  const dark = biome.groundBot || "#3a7018";
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

function darkenColor(hex, amount) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── SCATTER ON ISO GRID ───

function drawIsoScatter(ctx, biome, room, cameraX, cameraY, heightMap) {
  const { MAP_COLS, MAP_ROWS, GAME_W, GAME_H, TILE_H, HEIGHT_PX } = ISO_CONFIG;
  const rng = seedRng(room * 137 + 99);
  const items = biome.scatter || [];
  if (!items.length) return;

  const scatterList = [];
  const count = Math.min(80, Math.floor(MAP_COLS * MAP_ROWS * 0.05));

  for (let i = 0; i < count; i++) {
    const wx = 1 + rng() * (MAP_COLS - 2);
    const wy = 1 + rng() * (MAP_ROWS - 2);
    const iconName = items[Math.floor(rng() * items.length)];
    const rVal = rng();
    const isLargeProp = rVal > 0.7;
    scatterList.push({ wx, wy, iconName, rVal, large: isLargeProp });
  }

  // Ground cover patches
  const coverCount = Math.min(60, Math.floor(MAP_COLS * MAP_ROWS * 0.04));
  const groundCol = biome.groundCol || "#4a6a3a";
  for (let i = 0; i < coverCount; i++) {
    const wx = rng() * MAP_COLS;
    const wy = rng() * MAP_ROWS;
    scatterList.push({ wx, wy, iconName: null, rVal: rng(), groundCover: true, color: groundCol });
  }

  // Sort by iso depth (far first)
  scatterList.sort((a, b) => (a.wx + a.wy) - (b.wx + b.wy));

  for (const s of scatterList) {
    // Get terrain height at scatter position
    const h = getHeightAt(heightMap, s.wx, s.wy);
    const screen = worldToScreen(s.wx, s.wy, cameraX, cameraY, h);
    if (screen.x < -50 || screen.x > GAME_W + 50 || screen.y < -50 || screen.y > GAME_H + 50) continue;

    if (s.groundCover) {
      ctx.globalAlpha = 0.25 + s.rVal * 0.2;
      const sz = 3 + s.rVal * 5;
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y + TILE_H / 2, sz, sz * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = mixColor(s.color, "#000000", 0.15 + s.rVal * 0.2);
      ctx.fill();
      continue;
    }

    const baseSz = s.large ? (28 + s.rVal * 18) : (16 + s.rVal * 20);
    const sz = Math.round(baseSz);
    const alpha = s.large ? (0.7 + s.rVal * 0.25) : (0.4 + s.rVal * 0.35);
    ctx.globalAlpha = alpha;
    const img = getIconImage(s.iconName, sz);
    if (img) {
      ctx.drawImage(img, screen.x - sz / 2, screen.y + TILE_H / 2 - sz, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}

// ─── MAIN RENDER FUNCTION ───

export function renderIsoBiome(ctx, biome, room, W, H, isNight, cameraX, cameraY, caravanPos, fortPlacing, heightMap) {
  const { TILE_W, TILE_H, MAP_COLS, MAP_ROWS, HEIGHT_PX } = ISO_CONFIG;
  const rng = seedRng(room * 137 + 42);

  // Background fill (sky gradient)
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
    const mx = W * 0.82, my = H * 0.08, mr = 22;
    ctx.fillStyle = "rgba(255,255,220,0.85)";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }

  const tileInfo = getBiomeTileColors(biome);

  // Calculate visible tile range
  const margin = 2;
  const waterMargin = 16;
  const corners = [
    { sx: -TILE_W, sy: -TILE_H },
    { sx: W + TILE_W, sy: -TILE_H },
    { sx: -TILE_W, sy: H + TILE_H },
    { sx: W + TILE_W, sy: H + TILE_H },
  ];

  let minCol = MAP_COLS, maxCol = 0, minRow = MAP_ROWS, maxRow = 0;
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

  // Water range
  const waterMinCol = Math.max(-waterMargin, minCol);
  const waterMaxCol = Math.min(MAP_COLS - 1 + waterMargin, maxCol);
  const waterMinRow = Math.max(-waterMargin, minRow);
  const waterMaxRow = Math.min(MAP_ROWS - 1 + waterMargin, maxRow);

  // Land range
  minCol = Math.max(0, minCol - margin);
  maxCol = Math.min(MAP_COLS - 1, maxCol + margin);
  minRow = Math.max(0, minRow - margin);
  maxRow = Math.min(MAP_ROWS - 1, maxRow + margin);

  // ─── WATER outside map borders ───
  {
    const t = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    const tQ = Math.floor(t * 10) * 0.1;
    for (let row = waterMinRow; row <= waterMaxRow; row++) {
      for (let col = waterMinCol; col <= waterMaxCol; col++) {
        if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) continue;
        const screen = worldToScreen(col, row, cameraX, cameraY);
        if (screen.x < -TILE_W || screen.x > W + TILE_W || screen.y < -TILE_H || screen.y > H + TILE_H) continue;

        const distCol = col < 0 ? -col : col >= MAP_COLS ? col - MAP_COLS + 1 : 0;
        const distRow = row < 0 ? -row : row >= MAP_ROWS ? row - MAP_ROWS + 1 : 0;
        const deep = Math.max(distCol, distRow);
        const depthFactor = Math.min(1, deep / 10);

        const wave = Math.sin(col * 0.7 + row * 0.5 + tQ * 2.2) * 0.08;
        const r = Math.round(20 - depthFactor * 10 + wave * 25);
        const g = Math.round(70 + depthFactor * 10 + wave * 15);
        const b = Math.round(120 + depthFactor * 30 + wave * 20);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screen.x + TILE_W / 2, screen.y + TILE_H / 2);
        ctx.lineTo(screen.x, screen.y + TILE_H);
        ctx.lineTo(screen.x - TILE_W / 2, screen.y + TILE_H / 2);
        ctx.closePath();
        ctx.fill();

        if (wave > 0.05 && deep <= 2) {
          ctx.fillStyle = `rgba(180,220,255,${wave * 3})`;
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y + 2);
          ctx.lineTo(screen.x + TILE_W * 0.3, screen.y + TILE_H * 0.35);
          ctx.lineTo(screen.x, screen.y + TILE_H * 0.5);
          ctx.lineTo(screen.x - TILE_W * 0.3, screen.y + TILE_H * 0.35);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // ─── TERRAIN TILES with elevation ───
  // Render in depth order (top-left to bottom-right)
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const h = getHeightAt(heightMap, col, row);
      const heightPx = Math.round(h * HEIGHT_PX);

      // Get screen position (tile top without elevation — elevation handled by tile image offset)
      const screen = worldToScreen(col, row, cameraX, cameraY);
      if (screen.x < -TILE_W * 2 || screen.x > W + TILE_W * 2 ||
          screen.y < -TILE_H * 2 || screen.y > H + TILE_H * 2) continue;

      const variant = Math.abs((col * 7 + row * 13) % tileInfo.colors.length);

      if (heightPx > 2) {
        // Elevated tile with side walls
        const tileImg = getCachedTile(biome.id + "_elev", variant, tileInfo.colors, tileInfo.outline, heightPx);
        const tx = screen.x - TILE_W / 2;
        const ty = screen.y - heightPx;
        ctx.drawImage(tileImg, tx, ty, TILE_W, TILE_H + heightPx);
      } else {
        // Flat tile
        const tileImg = getCachedTile(biome.id, variant, tileInfo.colors, tileInfo.outline, 0);
        ctx.drawImage(tileImg, screen.x - TILE_W / 2, screen.y, TILE_W, TILE_H);
      }
    }
  }

  // ─── ATMOSPHERIC PERSPECTIVE ───
  const maxTileDepth = MAP_COLS + MAP_ROWS;
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const tileDepth = (col + row) / maxTileDepth;
      const hazeAlpha = 0.12 * (1 - tileDepth);
      if (hazeAlpha > 0.01) {
        const h = getHeightAt(heightMap, col, row);
        const screen = worldToScreen(col, row, cameraX, cameraY);
        if (screen.x < -TILE_W || screen.x > W + TILE_W) continue;
        const heightPx = Math.round(h * HEIGHT_PX);
        ctx.fillStyle = `rgba(180,200,220,${hazeAlpha})`;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - heightPx);
        ctx.lineTo(screen.x + TILE_W / 2, screen.y + TILE_H / 2 - heightPx);
        ctx.lineTo(screen.x, screen.y + TILE_H - heightPx);
        ctx.lineTo(screen.x - TILE_W / 2, screen.y + TILE_H / 2 - heightPx);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // ─── MAP BORDER DARKENING ───
  const edgeFade = 3;
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

  // ─── CARAVAN BASE HIGHLIGHT ───
  if (caravanPos) {
    const cx = Math.round(caravanPos.x);
    const cy = Math.round(caravanPos.y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const col = cx + dx, row = cy + dy;
        if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) continue;
        const h = getHeightAt(heightMap, col, row);
        const screen = worldToScreen(col, row, cameraX, cameraY, h);
        if (screen.x < -TILE_W || screen.x > W + TILE_W) continue;
        const dist = Math.abs(dx) + Math.abs(dy);
        const alpha = dist === 0 ? 0.25 : 0.12;
        ctx.fillStyle = `rgba(212,160,48,${alpha})`;
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

  // ─── FORTIFICATION PLACEMENT RANGE ───
  if (fortPlacing && caravanPos) {
    const fortRadius = 6;
    const ccx = Math.round(caravanPos.x);
    const ccy = Math.round(caravanPos.y);
    const t2 = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.003;
    for (let dy = -fortRadius; dy <= fortRadius; dy++) {
      for (let dx = -fortRadius; dx <= fortRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > fortRadius) continue;
        const col = ccx + dx, row = ccy + dy;
        if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) continue;
        const h = getHeightAt(heightMap, col, row);
        const screen = worldToScreen(col, row, cameraX, cameraY, h);
        if (screen.x < -TILE_W || screen.x > W + TILE_W) continue;
        const pulse = 0.08 + Math.sin(t2 + dist * 0.5) * 0.04;
        const edgeAlpha = dist > fortRadius - 1 ? pulse * 2 : pulse;
        ctx.fillStyle = `rgba(100,200,100,${edgeAlpha})`;
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

  // ─── DIRT PATH ───
  {
    const pathRng = seedRng(room * 73 + 11);
    const pathY = Math.floor(MAP_ROWS * 0.3 + pathRng() * MAP_ROWS * 0.4);
    const pathWidth = 2;
    for (let col = 0; col < MAP_COLS; col++) {
      const wobble = Math.floor(Math.sin(col * 0.4 + room) * 1.5);
      for (let dy = -pathWidth; dy <= pathWidth; dy++) {
        const row = pathY + wobble + dy;
        if (row < 0 || row >= MAP_ROWS) continue;
        const h = getHeightAt(heightMap, col, row);
        const screen = worldToScreen(col, row, cameraX, cameraY, h);
        if (screen.x < -TILE_W || screen.x > W + TILE_W || screen.y < -TILE_H || screen.y > H + TILE_H) continue;
        const edgeAlpha = Math.abs(dy) === pathWidth ? 0.06 : 0.12;
        ctx.fillStyle = `rgba(80,60,30,${edgeAlpha})`;
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

  // Scatter decorations (with height map awareness)
  drawIsoScatter(ctx, biome, room, cameraX, cameraY, heightMap);

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

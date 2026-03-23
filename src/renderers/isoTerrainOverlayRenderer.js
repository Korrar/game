// IsoTerrainOverlayRenderer — Draws terrain overlays on top of base tiles
// Renders roads, water features, cliff edges, bridges, vegetation, and fog of war

import { ISO_CONFIG, worldToScreen, getHeightAt } from "../utils/isometricUtils.js";
import { ROAD_STYLES, WATER_FEATURES, VEGETATION, FOG_OF_WAR } from "../data/terrainFeatures.js";
import { getIconImage } from "../rendering/icons.js";

const { TILE_W, TILE_H, HEIGHT_PX, MAP_COLS, MAP_ROWS, GAME_W, GAME_H } = ISO_CONFIG;

// ─── DIAMOND PATH HELPER ───

function diamondPath(ctx, sx, sy) {
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
  ctx.lineTo(sx, sy + TILE_H);
  ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
  ctx.closePath();
}

// ─── ROAD OVERLAY ───

function renderRoads(ctx, terrainData, cameraX, cameraY) {
  const { roads, heightMap } = terrainData;
  if (!roads || roads.length === 0) return;

  for (const tile of roads) {
    const h = getHeightAt(heightMap, tile.col, tile.row);
    const screen = worldToScreen(tile.col, tile.row, cameraX, cameraY, h);
    if (screen.x < -TILE_W || screen.x > GAME_W + TILE_W ||
        screen.y < -TILE_H * 2 || screen.y > GAME_H + TILE_H * 2) continue;

    const style = ROAD_STYLES[tile.style] || ROAD_STYLES.dirt;

    ctx.globalAlpha = 0.65;
    diamondPath(ctx, screen.x, screen.y);
    ctx.fillStyle = style.color;
    ctx.fill();

    // Pattern detail
    if (style.pattern === "cobble") {
      ctx.globalAlpha = 0.15;
      // Small rectangle grid
      for (let ox = -12; ox <= 12; ox += 8) {
        for (let oy = -4; oy <= 4; oy += 6) {
          ctx.fillStyle = "#000";
          ctx.fillRect(screen.x + ox - 2, screen.y + TILE_H / 2 + oy - 1, 5, 3);
        }
      }
    } else if (style.pattern === "plank") {
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.5;
      for (let oy = -6; oy <= 6; oy += 4) {
        ctx.beginPath();
        ctx.moveTo(screen.x - 15, screen.y + TILE_H / 2 + oy);
        ctx.lineTo(screen.x + 15, screen.y + TILE_H / 2 + oy);
        ctx.stroke();
      }
    } else if (style.pattern === "cracked") {
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = style.glowColor || "#ff4400";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screen.x - 8, screen.y + TILE_H / 2 - 3);
      ctx.lineTo(screen.x + 2, screen.y + TILE_H / 2 + 2);
      ctx.lineTo(screen.x + 10, screen.y + TILE_H / 2 - 1);
      ctx.stroke();
    }

    // Border
    ctx.globalAlpha = 0.25;
    diamondPath(ctx, screen.x, screen.y);
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ─── WATER OVERLAY ───

function renderWater(ctx, terrainData, cameraX, cameraY, time) {
  const { waterTiles, heightMap } = terrainData;
  if (!waterTiles || waterTiles.length === 0) return;

  for (const tile of waterTiles) {
    const h = getHeightAt(heightMap, tile.col, tile.row);
    const screen = worldToScreen(tile.col, tile.row, cameraX, cameraY, h);
    if (screen.x < -TILE_W || screen.x > GAME_W + TILE_W ||
        screen.y < -TILE_H * 2 || screen.y > GAME_H + TILE_H * 2) continue;

    const feature = WATER_FEATURES[tile.featureId];
    if (!feature) continue;

    // Base water color with depth variation
    const depthAlpha = 0.5 + Math.min(0.4, (tile.depth || 0) * 0.3);
    ctx.globalAlpha = depthAlpha;

    diamondPath(ctx, screen.x, screen.y);
    ctx.fillStyle = feature.color;
    ctx.fill();

    // Animated ripples
    if (feature.animated) {
      const ripplePhase = time * (feature.rippleSpeed || 0.8) + tile.col * 0.7 + tile.row * 0.5;
      const rippleAlpha = 0.08 + Math.sin(ripplePhase) * 0.06;
      ctx.globalAlpha = rippleAlpha;
      ctx.fillStyle = feature.shallowColor || "#80b0d0";
      // Small ripple ellipse
      ctx.beginPath();
      const rx = 8 + Math.sin(ripplePhase * 1.3) * 4;
      const ry = 3 + Math.sin(ripplePhase * 0.9) * 2;
      ctx.ellipse(screen.x, screen.y + TILE_H / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bubbles for swamp
    if (feature.bubbles) {
      const bubblePhase = time * 0.4 + tile.col * 2.1;
      if (Math.sin(bubblePhase) > 0.7) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#5a7a40";
        const bx = screen.x + Math.sin(bubblePhase * 2.3) * 8;
        const by = screen.y + TILE_H / 2 - Math.abs(Math.sin(bubblePhase * 1.5)) * 4;
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glow for lava
    if (feature.glow) {
      ctx.globalAlpha = 0.15 + Math.sin(time * 2 + tile.col) * 0.08;
      const grad = ctx.createRadialGradient(
        screen.x, screen.y + TILE_H / 2, 0,
        screen.x, screen.y + TILE_H / 2, TILE_W * 0.6
      );
      grad.addColorStop(0, feature.glowColor);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(screen.x - TILE_W, screen.y - TILE_H, TILE_W * 2, TILE_H * 3);
    }

    // Coral decorations
    if (feature.coralColors) {
      const ci = Math.abs((tile.col * 3 + tile.row * 7) % feature.coralColors.length);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = feature.coralColors[ci];
      ctx.beginPath();
      const cx = screen.x + (tile.col % 3 - 1) * 5;
      const cy = screen.y + TILE_H / 2 + (tile.row % 3 - 1) * 2;
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ice cracks
    if (feature.crackChance && ((tile.col * 13 + tile.row * 7) % 100) < feature.crackChance * 100) {
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(screen.x - 6, screen.y + TILE_H / 2 - 2);
      ctx.lineTo(screen.x + 3, screen.y + TILE_H / 2 + 1);
      ctx.lineTo(screen.x + 8, screen.y + TILE_H / 2 - 3);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── CLIFF EDGE OVERLAY ───

function renderCliffs(ctx, terrainData, cameraX, cameraY) {
  const { cliffs, heightMap } = terrainData;
  if (!cliffs || cliffs.length === 0) return;

  for (const cliff of cliffs) {
    const h = getHeightAt(heightMap, cliff.col, cliff.row);
    const screen = worldToScreen(cliff.col, cliff.row, cameraX, cameraY, h);
    if (screen.x < -TILE_W || screen.x > GAME_W + TILE_W ||
        screen.y < -TILE_H * 3 || screen.y > GAME_H + TILE_H * 2) continue;

    const wallHeight = Math.round(cliff.heightDiff * HEIGHT_PX);

    // Dark cliff face wall
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#2a1a10";

    const { dx, dy } = cliff.dropDir;
    if (dy > 0) {
      // Cliff faces south (visible face)
      ctx.beginPath();
      ctx.moveTo(screen.x - TILE_W / 2, screen.y + TILE_H / 2);
      ctx.lineTo(screen.x, screen.y + TILE_H);
      ctx.lineTo(screen.x, screen.y + TILE_H + wallHeight);
      ctx.lineTo(screen.x - TILE_W / 2, screen.y + TILE_H / 2 + wallHeight);
      ctx.closePath();
      ctx.fill();
    }
    if (dx > 0) {
      // Cliff faces east (visible face)
      ctx.beginPath();
      ctx.moveTo(screen.x + TILE_W / 2, screen.y + TILE_H / 2);
      ctx.lineTo(screen.x, screen.y + TILE_H);
      ctx.lineTo(screen.x, screen.y + TILE_H + wallHeight);
      ctx.lineTo(screen.x + TILE_W / 2, screen.y + TILE_H / 2 + wallHeight);
      ctx.closePath();
      ctx.fillStyle = "#3a2a18";
      ctx.fill();
    }

    // Edge highlight
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#1a0a05";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screen.x - TILE_W / 4, screen.y + TILE_H * 0.75);
    ctx.lineTo(screen.x + TILE_W / 4, screen.y + TILE_H * 0.75);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ─── BRIDGE OVERLAY ───

function renderBridges(ctx, terrainData, cameraX, cameraY) {
  const { overlays, heightMap, cols } = terrainData;
  if (!overlays) return;

  for (let i = 0; i < overlays.length; i++) {
    if (overlays[i] !== 4) continue; // 4 = bridge
    const col = i % cols;
    const row = Math.floor(i / cols);
    const h = getHeightAt(heightMap, col, row);
    const screen = worldToScreen(col, row, cameraX, cameraY, h + 0.3);
    if (screen.x < -TILE_W || screen.x > GAME_W + TILE_W) continue;

    // Wooden plank bridge
    ctx.globalAlpha = 0.8;
    diamondPath(ctx, screen.x, screen.y);
    ctx.fillStyle = "#8a6830";
    ctx.fill();

    // Plank lines
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "#4a3018";
    ctx.lineWidth = 0.5;
    for (let oy = -4; oy <= 4; oy += 3) {
      ctx.beginPath();
      ctx.moveTo(screen.x - 12, screen.y + TILE_H / 2 + oy);
      ctx.lineTo(screen.x + 12, screen.y + TILE_H / 2 + oy);
      ctx.stroke();
    }

    // Railing dots
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#5a3818";
    ctx.beginPath();
    ctx.arc(screen.x - TILE_W / 4, screen.y + TILE_H / 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x + TILE_W / 4, screen.y + TILE_H / 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── VEGETATION RENDERING ───

function renderVegetation(ctx, terrainData, cameraX, cameraY, time) {
  const { vegetation, heightMap } = terrainData;
  if (!vegetation || vegetation.length === 0) return;

  // Sort by depth (far first)
  const sorted = [...vegetation].sort((a, b) => (a.wx + a.wy) - (b.wx + b.wy));

  for (const veg of sorted) {
    if (!veg.alive) continue;

    const h = veg.height || 0;
    const screen = worldToScreen(veg.wx, veg.wy, cameraX, cameraY, h);
    if (screen.x < -80 || screen.x > GAME_W + 80 ||
        screen.y < -100 || screen.y > GAME_H + 80) continue;

    const def = VEGETATION[veg.type];
    if (!def) continue;

    // Wind sway animation
    let swayX = 0;
    if (def.sway) {
      swayX = Math.sin(time * def.sway.speed * 1000 + veg.swayPhase) * def.sway.amplitude;
    }

    // Shadow on ground
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#000";
    const shadowW = (def.shadowRadius || 1) * TILE_W * 0.4;
    const shadowH = shadowW * 0.3;
    ctx.beginPath();
    ctx.ellipse(screen.x + swayX * 0.3, screen.y + TILE_H / 2 + 2, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Icon rendering (main vegetation sprite)
    const iconSize = Math.round(24 + (def.heightOffset || 1) * 12 * veg.scale);
    const iconX = screen.x + swayX - iconSize / 2;
    const iconY = screen.y + TILE_H / 2 - iconSize - (def.heightOffset || 0) * HEIGHT_PX * 0.5;

    ctx.globalAlpha = 0.85;
    const img = getIconImage(veg.icon, iconSize);
    if (img) {
      ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
    }

    // Glow effect for magical vegetation
    if (veg.glow) {
      const pulseAlpha = 0.1 + Math.sin(time * veg.glow.pulse * 1000 + veg.swayPhase) * 0.06;
      ctx.globalAlpha = pulseAlpha;
      const grad = ctx.createRadialGradient(
        screen.x + swayX, iconY + iconSize / 2, 0,
        screen.x + swayX, iconY + iconSize / 2, veg.glow.radius
      );
      grad.addColorStop(0, veg.glow.color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(
        screen.x + swayX - veg.glow.radius,
        iconY + iconSize / 2 - veg.glow.radius,
        veg.glow.radius * 2,
        veg.glow.radius * 2
      );
    }

    // Damage indicator (if destructible and damaged)
    if (veg.destructible && veg.hp < veg.maxHp && veg.hp > 0) {
      ctx.globalAlpha = 0.6;
      const hpPct = veg.hp / veg.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? "#44aa44" : hpPct > 0.25 ? "#aaaa44" : "#aa4444";
      const barW = 20;
      ctx.fillRect(screen.x - barW / 2, iconY - 4, barW * hpPct, 2);
    }
  }
  ctx.globalAlpha = 1;
}

// ─── FOG OF WAR RENDERING ───

function renderFogOfWar(ctx, terrainData, cameraX, cameraY) {
  const { fogGrid, cols, rows } = terrainData;
  if (!fogGrid) return;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const visibility = fogGrid[row * cols + col];
      if (visibility >= 0.95) continue; // fully visible, skip

      const screen = worldToScreen(col, row, cameraX, cameraY);
      if (screen.x < -TILE_W || screen.x > GAME_W + TILE_W ||
          screen.y < -TILE_H || screen.y > GAME_H + TILE_H) continue;

      if (visibility <= 0.01) {
        // Fully hidden
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#000008";
      } else if (visibility <= 0.5) {
        // Explored but not visible
        ctx.globalAlpha = 0.35 * (1 - visibility / 0.5);
        ctx.fillStyle = "#000010";
      } else {
        // Partially visible (edge)
        ctx.globalAlpha = 0.2 * (1 - (visibility - 0.5) / 0.5);
        ctx.fillStyle = "#000010";
      }

      diamondPath(ctx, screen.x, screen.y);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── MAIN RENDER FUNCTION ───
// Call after renderIsoBiome to overlay terrain features

export function renderTerrainOverlays(ctx, terrainData, cameraX, cameraY, enableFog) {
  if (!terrainData) return;

  const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;

  // Layer order: roads → water → cliffs → bridges → vegetation → fog
  renderRoads(ctx, terrainData, cameraX, cameraY);
  renderWater(ctx, terrainData, cameraX, cameraY, time);
  renderCliffs(ctx, terrainData, cameraX, cameraY);
  renderBridges(ctx, terrainData, cameraX, cameraY);
  renderVegetation(ctx, terrainData, cameraX, cameraY, time);

  if (enableFog) {
    renderFogOfWar(ctx, terrainData, cameraX, cameraY);
  }
}

// IsometricUtils — Isometric coordinate system for 2:1 projection
// Converts between world space (flat 2D grid) and screen space (diamond view)

// ─── CONFIGURATION ───

export const ISO_CONFIG = {
  // Tile dimensions in pixels (2:1 ratio for standard isometric)
  TILE_W: 64,
  TILE_H: 32,

  // Map size in tiles
  MAP_COLS: 40,
  MAP_ROWS: 40,

  // Game viewport
  GAME_W: 1280,
  GAME_H: 720,
};

// ─── WORLD TO SCREEN ───
// Converts world coordinates (wx, wy) to screen pixel coordinates
// Camera offset shifts the viewport over the world
//
// Standard isometric projection (2:1):
//   screenX = (wx - wy) * TILE_W/2
//   screenY = (wx + wy) * TILE_H/2

export function worldToScreen(wx, wy, cameraX, cameraY) {
  const { TILE_W, TILE_H, GAME_W, GAME_H } = ISO_CONFIG;
  const sx = (wx - wy) * (TILE_W / 2) - cameraX + GAME_W / 2;
  const sy = (wx + wy) * (TILE_H / 2) - cameraY + GAME_H / 2;
  return { x: sx, y: sy };
}

// ─── SCREEN TO WORLD ───
// Inverse of worldToScreen — converts screen click to world coordinates

export function screenToWorld(sx, sy, cameraX, cameraY) {
  const { TILE_W, TILE_H, GAME_W, GAME_H } = ISO_CONFIG;
  const adjX = sx - GAME_W / 2 + cameraX;
  const adjY = sy - GAME_H / 2 + cameraY;
  const wx = (adjX / (TILE_W / 2) + adjY / (TILE_H / 2)) / 2;
  const wy = (adjY / (TILE_H / 2) - adjX / (TILE_W / 2)) / 2;
  return { x: wx, y: wy };
}

// ─── ISO DEPTH ───
// Depth value for painter's algorithm sorting
// Higher wx+wy = rendered later = visually in front

export function isoDepth(wx, wy) {
  return wx + wy;
}

// ─── WORLD TO TILE ───
// Converts continuous world coordinates to discrete tile indices

export function worldToTile(wx, wy) {
  return {
    col: Math.floor(wx),
    row: Math.floor(wy),
  };
}

// ─── TILE TO WORLD ───
// Returns center of tile in world coordinates

export function tileToWorld(col, row) {
  return {
    x: col + 0.5,
    y: row + 0.5,
  };
}

// ─── IS IN MAP BOUNDS ───
// Checks if tile coordinates are within the map

export function isInMapBounds(col, row) {
  return col >= 0 && col < ISO_CONFIG.MAP_COLS &&
         row >= 0 && row < ISO_CONFIG.MAP_ROWS;
}

// ─── DISTANCE WORLD ───
// Euclidean distance between two world points

export function distanceWorld(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

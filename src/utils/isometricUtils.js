// IsometricUtils — Isometric coordinate system for 2:1 projection
// Converts between world space (flat 2D grid) and screen space (diamond view)
// Supports terrain height (elevation) for 3D-like terrain effects

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

  // Height unit in pixels (how much 1 height unit offsets Y on screen)
  HEIGHT_PX: 16,

  // Maximum terrain height levels
  MAX_HEIGHT: 4,
};

// ─── WORLD TO SCREEN ───
// Converts world coordinates (wx, wy) to screen pixel coordinates
// Camera offset shifts the viewport over the world
// Optional height parameter lifts the sprite vertically (terrain elevation)
//
// Standard isometric projection (2:1):
//   screenX = (wx - wy) * TILE_W/2
//   screenY = (wx + wy) * TILE_H/2 - height * HEIGHT_PX

export function worldToScreen(wx, wy, cameraX, cameraY, height) {
  const { TILE_W, TILE_H, GAME_W, GAME_H, HEIGHT_PX } = ISO_CONFIG;
  const sx = (wx - wy) * (TILE_W / 2) - cameraX + GAME_W / 2;
  const sy = (wx + wy) * (TILE_H / 2) - cameraY + GAME_H / 2;
  if (height) {
    return { x: sx, y: sy - height * HEIGHT_PX };
  }
  return { x: sx, y: sy };
}

// ─── SCREEN TO WORLD ───
// Inverse of worldToScreen — converts screen click to world coordinates
// Assumes ground level (height = 0) for click detection

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
// Height adds to depth so elevated objects render on top

export function isoDepth(wx, wy, height) {
  return wx + wy + (height || 0) * 0.01;
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

// ─── TERRAIN HEIGHT MAP ───
// Generates a procedural height map for a biome room
// Uses seeded noise for deterministic terrain per room

export function generateHeightMap(room, biome, cols, rows) {
  cols = cols || ISO_CONFIG.MAP_COLS;
  rows = rows || ISO_CONFIG.MAP_ROWS;
  const map = new Float32Array(cols * rows);

  // Seed from room number for deterministic generation
  let seed = room * 137 + 42;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Terrain profile per biome type
  const terrain = biome?.terrain || "forest";
  const profiles = {
    forest: { amplitude: 2.5, frequency: 0.08, flatCenter: true, octaves: 3 },
    mine: { amplitude: 3.5, frequency: 0.06, flatCenter: false, octaves: 3 },
    desert: { amplitude: 1.8, frequency: 0.10, flatCenter: true, octaves: 2 },
    swamp: { amplitude: 1.0, frequency: 0.12, flatCenter: true, octaves: 2 },
    mountain: { amplitude: 4.5, frequency: 0.05, flatCenter: false, octaves: 4 },
    coast: { amplitude: 2.0, frequency: 0.09, flatCenter: true, octaves: 2 },
    volcanic: { amplitude: 3.5, frequency: 0.07, flatCenter: false, octaves: 3 },
    // Dungeon terrain profiles — lower amplitude, tunnel-like features
    dungeon_mine: { amplitude: 2.0, frequency: 0.06, flatCenter: true, octaves: 2, dungeon: true },
    dungeon_crypt: { amplitude: 1.5, frequency: 0.08, flatCenter: true, octaves: 2, dungeon: true },
    dungeon_cave: { amplitude: 2.5, frequency: 0.07, flatCenter: true, octaves: 3, dungeon: true },
    dungeon_ruins: { amplitude: 1.8, frequency: 0.09, flatCenter: true, octaves: 2, dungeon: true },
  };
  const profile = profiles[terrain] || profiles.forest;

  // Simple value noise with interpolation
  const noiseGrid = 8;
  const noiseValues = [];
  for (let i = 0; i < noiseGrid * noiseGrid; i++) {
    noiseValues.push(rng());
  }

  const sampleNoise = (fx, fy) => {
    // Wrap coordinates to 0-1 range for safe array access
    fx = fx - Math.floor(fx);
    fy = fy - Math.floor(fy);
    const gx = fx * (noiseGrid - 1);
    const gy = fy * (noiseGrid - 1);
    const ix = Math.max(0, Math.min(noiseGrid - 2, Math.floor(gx)));
    const iy = Math.max(0, Math.min(noiseGrid - 2, Math.floor(gy)));
    const fx2 = gx - ix;
    const fy2 = gy - iy;
    const ix1 = ix + 1;
    const iy1 = iy + 1;
    const v00 = noiseValues[iy * noiseGrid + ix];
    const v10 = noiseValues[iy * noiseGrid + ix1];
    const v01 = noiseValues[iy1 * noiseGrid + ix];
    const v11 = noiseValues[iy1 * noiseGrid + ix1];
    const top = v00 + (v10 - v00) * fx2;
    const bot = v01 + (v11 - v01) * fx2;
    return top + (bot - top) * fy2;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nx = col / cols;
      const ny = row / rows;

      // Multi-octave noise for richer terrain
      let h = sampleNoise(nx, ny) * profile.amplitude;
      const octaves = profile.octaves || 2;
      let amp = profile.amplitude * 0.4;
      let freq = 2.3;
      for (let oct = 1; oct < octaves; oct++) {
        h += sampleNoise(nx * freq + oct * 0.5, ny * freq + oct * 0.3) * amp;
        amp *= 0.45;
        freq *= 2.1;
      }

      // Flatten center for caravan area
      if (profile.flatCenter) {
        const cx = cols / 2;
        const cy = rows / 2;
        const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2);
        const flatRadius = Math.min(cols, rows) * 0.2;
        if (dist < flatRadius) {
          h *= dist / flatRadius;
        }
      }

      // Edge falloff — terrain drops to 0 at map edges
      const edgeDist = Math.min(col, row, cols - 1 - col, rows - 1 - row);
      const edgeFade = Math.min(1, edgeDist / 4);
      h *= edgeFade;

      // Quantize to discrete height levels for clean isometric look
      map[row * cols + col] = Math.round(Math.max(0, h) * 2) / 2;
    }
  }

  return { data: map, cols, rows };
}

// Get height at a world position (interpolated from height map)
export function getHeightAt(heightMap, wx, wy) {
  if (!heightMap) return 0;
  const { data, cols, rows } = heightMap;
  const col = Math.floor(wx);
  const row = Math.floor(wy);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return 0;
  return data[row * cols + col];
}

// Get height at a world position with bilinear interpolation (smooth)
export function getHeightSmooth(heightMap, wx, wy) {
  if (!heightMap) return 0;
  const { data, cols, rows } = heightMap;
  const col = Math.max(0, Math.min(cols - 2, Math.floor(wx)));
  const row = Math.max(0, Math.min(rows - 2, Math.floor(wy)));
  const fx = wx - col;
  const fy = wy - row;
  const h00 = data[row * cols + col];
  const h10 = data[row * cols + Math.min(col + 1, cols - 1)];
  const h01 = data[Math.min(row + 1, rows - 1) * cols + col];
  const h11 = data[Math.min(row + 1, rows - 1) * cols + Math.min(col + 1, cols - 1)];
  const top = h00 + (h10 - h00) * fx;
  const bot = h01 + (h11 - h01) * fx;
  return top + (bot - top) * fy;
}

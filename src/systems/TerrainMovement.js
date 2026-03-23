// TerrainMovement — Movement speed modifiers based on terrain type
// Roads give speed bonus, water slows, cliffs block, vegetation impedes
// Also provides A* pathfinding for enemies to navigate around obstacles

import { ISO_CONFIG, getHeightAt, isInMapBounds } from "../utils/isometricUtils.js";

const { MAP_COLS, MAP_ROWS } = ISO_CONFIG;

// ─── TERRAIN SPEED MULTIPLIERS ───

export const TERRAIN_SPEED = {
  road: 1.30,      // +30% speed on roads
  bridge: 1.20,    // +20% speed on bridges
  water: 0.55,     // -45% speed in water (wading)
  cliff: 0.0,      // impassable — must go around
  lava: 0.40,      // -60% speed in lava (also damages)
  ice: 1.15,       // +15% speed on ice (slippery, less control)
  swamp: 0.50,     // -50% speed in swamp water
  vegetation: 0.80, // -20% speed through dense vegetation
  sand: 0.90,      // -10% speed on sand
  normal: 1.0,     // base terrain
};

// Height difference penalty: steep slopes slow movement
const SLOPE_PENALTY_PER_UNIT = 0.12; // -12% per height unit climbed
const MAX_SLOPE_PENALTY = 0.40;       // cap at -40%
const MAX_WALKABLE_SLOPE = 2.5;       // height diff > this = impassable

// ─── GET TILE SPEED MODIFIER ───
// Returns speed multiplier for a given tile based on overlays and features

export function getTileSpeedMod(col, row, terrainData) {
  if (!terrainData || !isInMapBounds(col, row)) return 0;
  const { overlays, cols, waterTiles, vegetation } = terrainData;
  const idx = row * cols + col;
  const overlay = overlays[idx];

  // Overlay-based modifiers
  switch (overlay) {
    case 1: return TERRAIN_SPEED.road;
    case 2: {
      // Check water type for specific modifier
      const wt = waterTiles?.find(t => t.col === col && t.row === row);
      if (wt) {
        if (wt.featureId === "lava_pool") return TERRAIN_SPEED.lava;
        if (wt.featureId === "swamp_pool") return TERRAIN_SPEED.swamp;
        if (wt.featureId === "ice_sheet") return TERRAIN_SPEED.ice;
      }
      return TERRAIN_SPEED.water;
    }
    case 3: return TERRAIN_SPEED.cliff;
    case 4: return TERRAIN_SPEED.bridge;
    case 5: return TERRAIN_SPEED.ice; // frozen water (from TerrainDestruction)
    default: break;
  }

  // Check dense vegetation blocking
  if (vegetation) {
    for (let v = 0; v < vegetation.length; v++) {
      const veg = vegetation[v];
      if (!veg.alive) continue;
      if (veg.col === col && veg.row === row && veg.blocksLOS) {
        return TERRAIN_SPEED.vegetation;
      }
    }
  }

  return TERRAIN_SPEED.normal;
}

// ─── GET SLOPE MODIFIER ───
// Penalizes uphill movement, small bonus downhill

export function getSlopeModifier(fromCol, fromRow, toCol, toRow, heightMap) {
  if (!heightMap) return 1.0;
  const fromH = getHeightAt(heightMap, fromCol, fromRow);
  const toH = getHeightAt(heightMap, toCol, toRow);
  const diff = toH - fromH;

  if (Math.abs(diff) > MAX_WALKABLE_SLOPE) return 0; // too steep

  if (diff > 0) {
    // Uphill — penalty
    return Math.max(1 - MAX_SLOPE_PENALTY, 1 - diff * SLOPE_PENALTY_PER_UNIT);
  } else if (diff < -0.5) {
    // Downhill — slight bonus
    return Math.min(1.15, 1 + Math.abs(diff) * 0.05);
  }
  return 1.0;
}

// ─── APPLY TERRAIN MOVEMENT ───
// Main function: modifies walker speed based on current terrain
// Call each frame for each walker in iso mode

export function applyTerrainMovement(walker, terrainData) {
  if (!terrainData || walker.x == null) return 1.0;

  const col = Math.floor(walker.x);
  const row = Math.floor(walker.y ?? MAP_ROWS / 2);

  const tileMod = getTileSpeedMod(col, row, terrainData);

  // If tile is impassable, return 0
  if (tileMod <= 0) return 0;

  return tileMod;
}

// ─── WALKABILITY GRID ───
// Build a cached walkability grid for pathfinding
// 0 = impassable, >0 = cost multiplier (lower = faster)

export function buildWalkGrid(terrainData) {
  if (!terrainData) return null;
  const { vegetation, cols, rows } = terrainData;
  const grid = new Float32Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const speedMod = getTileSpeedMod(col, row, terrainData);

      if (speedMod <= 0) {
        grid[idx] = 0; // impassable
        continue;
      }

      // Cost = inverse of speed (slower terrain = higher cost)
      grid[idx] = 1 / speedMod;
    }
  }

  // Mark vegetation as higher cost
  if (vegetation) {
    for (const veg of vegetation) {
      if (!veg.alive) continue;
      const idx = veg.row * cols + veg.col;
      if (veg.blocksLOS) {
        // Dense vegetation: passable but slow
        grid[idx] = Math.max(grid[idx], 1 / TERRAIN_SPEED.vegetation);
      }
    }
  }

  return grid;
}

// ─── A* PATHFINDING ───
// Returns array of {col, row} from start to end, navigating around obstacles
// Uses walk grid costs for optimal pathing

const NEIGHBORS = [
  { dc: -1, dr: 0, cost: 1.0 },
  { dc: 1,  dr: 0, cost: 1.0 },
  { dc: 0,  dr: -1, cost: 1.0 },
  { dc: 0,  dr: 1, cost: 1.0 },
  { dc: -1, dr: -1, cost: 1.414 },
  { dc: 1,  dr: -1, cost: 1.414 },
  { dc: -1, dr: 1, cost: 1.414 },
  { dc: 1,  dr: 1, cost: 1.414 },
];

export function findPath(startCol, startRow, endCol, endRow, walkGrid, cols, rows, maxSteps) {
  maxSteps = maxSteps || 200;

  if (!walkGrid) return null;

  // Clamp to bounds
  startCol = Math.max(0, Math.min(cols - 1, Math.floor(startCol)));
  startRow = Math.max(0, Math.min(rows - 1, Math.floor(startRow)));
  endCol = Math.max(0, Math.min(cols - 1, Math.floor(endCol)));
  endRow = Math.max(0, Math.min(rows - 1, Math.floor(endRow)));

  // Check if destination is reachable
  if (walkGrid[endRow * cols + endCol] <= 0) {
    // Find nearest walkable tile to destination
    let bestCol = endCol, bestRow = endRow, bestDist = Infinity;
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const nc = endCol + dc, nr = endRow + dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        if (walkGrid[nr * cols + nc] <= 0) continue;
        const d = Math.abs(dc) + Math.abs(dr);
        if (d < bestDist) { bestDist = d; bestCol = nc; bestRow = nr; }
      }
    }
    endCol = bestCol;
    endRow = bestRow;
  }

  if (startCol === endCol && startRow === endRow) return [{ col: endCol, row: endRow }];

  // A* with binary heap approximation (simple sorted open list for small grids)
  const openSet = [{ col: startCol, row: startRow, g: 0, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map();
  const startKey = startRow * cols + startCol;
  gScore.set(startKey, 0);
  let steps = 0;

  const heuristic = (c, r) => Math.abs(c - endCol) + Math.abs(r - endRow);

  while (openSet.length > 0 && steps < maxSteps) {
    steps++;
    // Find lowest f-score
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
    }
    const current = openSet[bestIdx];
    openSet.splice(bestIdx, 1);

    if (current.col === endCol && current.row === endRow) {
      // Reconstruct path
      const path = [];
      let key = current.row * cols + current.col;
      path.push({ col: current.col, row: current.row });
      while (cameFrom.has(key)) {
        const prev = cameFrom.get(key);
        path.push(prev);
        key = prev.row * cols + prev.col;
      }
      path.reverse();
      return path;
    }

    for (const n of NEIGHBORS) {
      const nc = current.col + n.dc;
      const nr = current.row + n.dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

      const nIdx = nr * cols + nc;
      const tileCost = walkGrid[nIdx];
      if (tileCost <= 0) continue; // impassable

      const tentativeG = current.g + n.cost * tileCost;
      const nKey = nIdx;

      if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, { col: current.col, row: current.row });
        const f = tentativeG + heuristic(nc, nr);
        // Check if already in open set
        const existing = openSet.findIndex(o => o.col === nc && o.row === nr);
        if (existing >= 0) {
          openSet[existing].g = tentativeG;
          openSet[existing].f = f;
        } else {
          openSet.push({ col: nc, row: nr, g: tentativeG, f });
        }
      }
    }
  }

  // No path found — fallback to direct movement
  return null;
}

// ─── CHOKEPOINT DETECTION ───
// Finds narrow passages where enemies must pass through
// Useful for trap placement hints and strategic positioning

export function detectChokepoints(walkGrid, cols, rows) {
  const chokepoints = [];

  for (let row = 2; row < rows - 2; row++) {
    for (let col = 2; col < cols - 2; col++) {
      const idx = row * cols + col;
      if (walkGrid[idx] <= 0) continue; // skip impassable

      // Count walkable neighbors in a 5x5 area
      let walkableCount = 0;
      let totalChecked = 0;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dc === 0 && dr === 0) continue;
          const nc = col + dc, nr = row + dr;
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
          totalChecked++;
          if (walkGrid[nr * cols + nc] > 0) walkableCount++;
        }
      }

      // Chokepoint: walkable tile surrounded by mostly impassable terrain
      const openRatio = walkableCount / totalChecked;
      if (openRatio < 0.45 && openRatio > 0.15) {
        // Check if it forms a bottleneck (at least 2 sides blocked)
        const left = col > 0 ? walkGrid[row * cols + col - 1] : 0;
        const right = col < cols - 1 ? walkGrid[row * cols + col + 1] : 0;
        const up = row > 0 ? walkGrid[(row - 1) * cols + col] : 0;
        const down = row < rows - 1 ? walkGrid[(row + 1) * cols + col] : 0;

        const blockedSides = (left <= 0 ? 1 : 0) + (right <= 0 ? 1 : 0) +
                            (up <= 0 ? 1 : 0) + (down <= 0 ? 1 : 0);

        if (blockedSides >= 2) {
          chokepoints.push({
            col, row,
            narrowness: 1 - openRatio, // 0-1, higher = narrower
            blockedSides,
          });
        }
      }
    }
  }

  return chokepoints;
}

// ─── NEXT MOVE WITH TERRAIN ───
// Given a walker's current position and target, returns the next movement delta
// accounting for terrain speed modifiers and basic obstacle avoidance

export function getTerrainAwareMove(wx, wy, targetX, targetY, speed, terrainData, walkGrid) {
  if (!terrainData) return { dx: 0, dy: 0, speedMod: 1.0 };

  const col = Math.floor(wx);
  const row = Math.floor(wy);
  const { cols, rows, heightMap } = terrainData;

  // Get current tile speed modifier
  const tileMod = getTileSpeedMod(col, row, terrainData);
  if (tileMod <= 0) {
    // Stuck on impassable — try to escape to nearest walkable
    return _escapeImpassable(col, row, terrainData, walkGrid, speed);
  }

  // Direction to target
  const dx = targetX - wx;
  const dy = targetY - wy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return { dx: 0, dy: 0, speedMod: tileMod };

  const ndx = dx / dist;
  const ndy = dy / dist;

  // Check if next tile in direction is walkable
  const nextCol = Math.floor(wx + ndx * 0.8);
  const nextRow = Math.floor(wy + ndy * 0.8);

  if (walkGrid && nextCol >= 0 && nextCol < cols && nextRow >= 0 && nextRow < rows) {
    const nextTileCost = walkGrid[nextRow * cols + nextCol];
    if (nextTileCost <= 0) {
      // Next tile blocked — try to steer around
      // Try perpendicular directions
      const alt1Col = Math.floor(wx + ndy * 0.8);
      const alt1Row = Math.floor(wy - ndx * 0.8);
      const alt2Col = Math.floor(wx - ndy * 0.8);
      const alt2Row = Math.floor(wy + ndx * 0.8);

      const alt1Ok = alt1Col >= 0 && alt1Col < cols && alt1Row >= 0 && alt1Row < rows &&
                     walkGrid[alt1Row * cols + alt1Col] > 0;
      const alt2Ok = alt2Col >= 0 && alt2Col < cols && alt2Row >= 0 && alt2Row < rows &&
                     walkGrid[alt2Row * cols + alt2Col] > 0;

      if (alt1Ok && !alt2Ok) {
        return { dx: ndy * speed * tileMod, dy: -ndx * speed * tileMod, speedMod: tileMod };
      } else if (alt2Ok && !alt1Ok) {
        return { dx: -ndy * speed * tileMod, dy: ndx * speed * tileMod, speedMod: tileMod };
      } else if (alt1Ok && alt2Ok) {
        // Pick the one closer to target
        const d1 = Math.abs(alt1Col - Math.floor(targetX)) + Math.abs(alt1Row - Math.floor(targetY));
        const d2 = Math.abs(alt2Col - Math.floor(targetX)) + Math.abs(alt2Row - Math.floor(targetY));
        if (d1 <= d2) {
          return { dx: ndy * speed * tileMod, dy: -ndx * speed * tileMod, speedMod: tileMod };
        } else {
          return { dx: -ndy * speed * tileMod, dy: ndx * speed * tileMod, speedMod: tileMod };
        }
      }
      // Both blocked — stay put
      return { dx: 0, dy: 0, speedMod: 0 };
    }
  }

  // Slope modifier
  const slopeMod = getSlopeModifier(col, row, nextCol, nextRow, heightMap);
  const finalMod = tileMod * slopeMod;

  return {
    dx: ndx * speed * finalMod,
    dy: ndy * speed * finalMod,
    speedMod: finalMod,
  };
}

function _escapeImpassable(col, row, terrainData, walkGrid, speed) {
  if (!walkGrid) return { dx: 0, dy: 0, speedMod: 0 };
  const { cols, rows } = terrainData;
  // Find nearest walkable tile
  for (let r = 1; r <= 3; r++) {
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue;
        const nc = col + dc, nr = row + dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        if (walkGrid[nr * cols + nc] > 0) {
          const dist = Math.sqrt(dc * dc + dr * dr);
          return { dx: (dc / dist) * speed * 0.5, dy: (dr / dist) * speed * 0.5, speedMod: 0.5 };
        }
      }
    }
  }
  return { dx: 0, dy: 0, speedMod: 0 };
}

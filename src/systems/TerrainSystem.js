// TerrainSystem — Procedural terrain overlay generation for isometric view
// Generates roads, water features, vegetation, and cliff edges per room
// All data is deterministic based on room seed

import { ISO_CONFIG, generateHeightMap, getHeightAt } from "../utils/isometricUtils.js";
import {
  BIOME_TERRAIN, ROAD_STYLES, WATER_FEATURES, VEGETATION,
  HEIGHT_ADVANTAGE, FOG_OF_WAR,
} from "../data/terrainFeatures.js";

// ─── SEEDED RNG ───

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ─── GENERATE FULL TERRAIN DATA ───
// Returns a complete terrain state for one room

export function generateTerrainData(room, biome) {
  const biomeId = biome?.id || "jungle";
  const profile = BIOME_TERRAIN[biomeId] || BIOME_TERRAIN.jungle;
  const { MAP_COLS, MAP_ROWS } = ISO_CONFIG;

  // Generate base height map
  const heightMap = generateHeightMap(room, biome);

  // Generate overlay layers
  const rng = makeRng(room * 257 + 73);
  const overlays = new Uint8Array(MAP_COLS * MAP_ROWS); // 0=none, 1=road, 2=water, 3=cliff, 4=bridge

  // Roads
  const roads = generateRoads(rng, profile, heightMap, MAP_COLS, MAP_ROWS);
  for (const tile of roads) {
    overlays[tile.row * MAP_COLS + tile.col] = 1;
  }

  // Water features
  const waterTiles = generateWater(rng, profile, heightMap, MAP_COLS, MAP_ROWS);
  for (const tile of waterTiles) {
    const idx = tile.row * MAP_COLS + tile.col;
    if (overlays[idx] === 0) overlays[idx] = 2;
  }

  // Cliff edges (height difference > threshold)
  const cliffs = detectCliffs(heightMap, profile.cliffThreshold, MAP_COLS, MAP_ROWS);
  for (const tile of cliffs) {
    const idx = tile.row * MAP_COLS + tile.col;
    if (overlays[idx] === 0) overlays[idx] = 3;
  }

  // Bridges (where roads cross water)
  for (let i = 0; i < overlays.length; i++) {
    // Check if a road tile has water neighbors
    if (overlays[i] === 1) {
      const col = i % MAP_COLS;
      const row = Math.floor(i / MAP_COLS);
      const hasWaterNeighbor = getNeighbors(col, row, MAP_COLS, MAP_ROWS)
        .some(n => overlays[n.row * MAP_COLS + n.col] === 2);
      if (hasWaterNeighbor) overlays[i] = 4; // bridge
    }
  }

  // Vegetation placement
  const vegetation = generateVegetation(rng, profile, heightMap, overlays, MAP_COLS, MAP_ROWS);

  // Fog of war disabled — initialize fully revealed
  const fogGrid = new Float32Array(MAP_COLS * MAP_ROWS);
  fogGrid.fill(1.0);

  return {
    heightMap,
    overlays,
    roads,
    waterTiles,
    cliffs,
    vegetation,
    fogGrid,
    profile,
    biomeId,
    cols: MAP_COLS,
    rows: MAP_ROWS,
  };
}

// ─── ROAD GENERATION ───

function generateRoads(rng, profile, heightMap, cols, rows) {
  const roadTiles = [];
  const roadCount = profile.roadCount || 0;
  if (roadCount === 0) return roadTiles;

  const style = ROAD_STYLES[profile.roadStyle] || ROAD_STYLES.dirt;
  const halfW = Math.floor(style.width / 2);

  for (let r = 0; r < roadCount; r++) {
    // Random start and end on map edges
    const horizontal = rng() > 0.5;
    const startPos = Math.floor(rng() * (horizontal ? rows : cols) * 0.6 + (horizontal ? rows : cols) * 0.2);

    if (horizontal) {
      // Road from left to right with wandering
      let row = startPos;
      for (let col = 0; col < cols; col++) {
        // Wander based on noise
        if (rng() < 0.25) row += rng() > 0.5 ? 1 : -1;
        row = Math.max(2, Math.min(rows - 3, row));

        for (let dy = -halfW; dy <= halfW; dy++) {
          const tileRow = row + dy;
          if (tileRow >= 0 && tileRow < rows) {
            roadTiles.push({ col, row: tileRow, style: profile.roadStyle });
          }
        }
      }
    } else {
      // Road from top to bottom
      let col = startPos;
      for (let row = 0; row < rows; row++) {
        if (rng() < 0.25) col += rng() > 0.5 ? 1 : -1;
        col = Math.max(2, Math.min(cols - 3, col));

        for (let dx = -halfW; dx <= halfW; dx++) {
          const tileCol = col + dx;
          if (tileCol >= 0 && tileCol < cols) {
            roadTiles.push({ col: tileCol, row, style: profile.roadStyle });
          }
        }
      }
    }
  }

  return roadTiles;
}

// ─── WATER GENERATION ───

function generateWater(rng, profile, heightMap, cols, rows) {
  const waterTiles = [];
  const features = profile.waterFeatures || [];
  if (features.length === 0) return waterTiles;

  const density = profile.waterDensity || 0.05;
  const poolCount = Math.max(1, Math.floor(cols * rows * density * 0.01));

  for (let p = 0; p < poolCount; p++) {
    const featureId = features[Math.floor(rng() * features.length)];
    const feature = WATER_FEATURES[featureId];
    if (!feature) continue;

    // Find a low-height area for the pool
    let bestCol = Math.floor(rng() * (cols - 4) + 2);
    let bestRow = Math.floor(rng() * (rows - 4) + 2);
    let bestH = getHeightAt(heightMap, bestCol, bestRow);

    // Try a few positions and pick the lowest
    for (let attempt = 0; attempt < 5; attempt++) {
      const tc = Math.floor(rng() * (cols - 4) + 2);
      const tr = Math.floor(rng() * (rows - 4) + 2);
      const th = getHeightAt(heightMap, tc, tr);
      if (th < bestH) {
        bestCol = tc;
        bestRow = tr;
        bestH = th;
      }
    }

    // Only place if terrain is low enough
    if (feature.maxHeight !== undefined && bestH > feature.maxHeight) continue;

    // Flood fill from center to create natural shape
    const poolSize = feature.minTiles + Math.floor(rng() * (feature.maxTiles - feature.minTiles + 1));
    const visited = new Set();
    const queue = [{ col: bestCol, row: bestRow }];
    let placed = 0;

    while (queue.length > 0 && placed < poolSize) {
      const { col, row } = queue.shift();
      const key = `${col},${row}`;
      if (visited.has(key)) continue;
      if (col < 1 || col >= cols - 1 || row < 1 || row >= rows - 1) continue;
      visited.add(key);

      const h = getHeightAt(heightMap, col, row);
      if (feature.maxHeight !== undefined && h > feature.maxHeight + 0.5) continue;

      waterTiles.push({ col, row, featureId, depth: Math.max(0, feature.maxHeight - h) });
      placed++;

      // Add neighbors with probability
      const neighbors = getNeighbors(col, row, cols, rows);
      for (const n of neighbors) {
        if (!visited.has(`${n.col},${n.row}`) && rng() < 0.7) {
          queue.push(n);
        }
      }
    }
  }

  return waterTiles;
}

// ─── CLIFF DETECTION ───

function detectCliffs(heightMap, threshold, cols, rows) {
  const cliffs = [];
  if (!threshold) return cliffs;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const h = getHeightAt(heightMap, col, row);
      const neighbors = getNeighbors(col, row, cols, rows);
      for (const n of neighbors) {
        const nh = getHeightAt(heightMap, n.col, n.row);
        if (h - nh >= threshold) {
          cliffs.push({
            col, row,
            dropDir: { dx: n.col - col, dy: n.row - row },
            heightDiff: h - nh,
          });
          break; // one cliff edge per tile
        }
      }
    }
  }

  return cliffs;
}

// ─── VEGETATION PLACEMENT ───

function generateVegetation(rng, profile, heightMap, overlays, cols, rows) {
  const vegList = [];
  const types = profile.vegetation || [];
  if (types.length === 0) return vegList;

  const density = profile.vegetationDensity || 0.05;
  const count = Math.floor(cols * rows * density);
  const centerX = cols / 2;
  const centerY = rows / 2;
  const safeRadius = 4; // keep vegetation away from spawn center

  for (let i = 0; i < count; i++) {
    const col = Math.floor(rng() * (cols - 2) + 1);
    const row = Math.floor(rng() * (rows - 2) + 1);

    // Skip if on road, water, or too close to center
    const idx = row * cols + col;
    if (overlays[idx] !== 0) continue;
    const distCenter = Math.sqrt((col - centerX) ** 2 + (row - centerY) ** 2);
    if (distCenter < safeRadius) continue;

    const typeId = types[Math.floor(rng() * types.length)];
    const def = VEGETATION[typeId];
    if (!def) continue;

    const h = getHeightAt(heightMap, col, row);

    vegList.push({
      id: `veg_${i}`,
      type: typeId,
      col,
      row,
      wx: col + 0.5,
      wy: row + 0.5,
      height: h,
      heightOffset: def.heightOffset,
      icon: def.icon,
      blocksLOS: def.blocksLOS,
      destructible: def.destructible,
      hp: def.hp || 0,
      maxHp: def.hp || 0,
      alive: true,
      swayPhase: rng() * Math.PI * 2,
      scale: 0.8 + rng() * 0.4,
      glow: def.glow || null,
    });
  }

  return vegList;
}

// ─── FOG OF WAR ───

export function updateFogOfWar(terrainData, revealPoints) {
  if (!terrainData || !terrainData.fogGrid) return;
  const { fogGrid, heightMap, cols, rows } = terrainData;

  // Mark currently visible areas as explored (0.5) first
  for (let i = 0; i < fogGrid.length; i++) {
    if (fogGrid[i] > 0.5) {
      fogGrid[i] = Math.max(0.5, fogGrid[i] - FOG_OF_WAR.revealSpeed);
    }
  }

  // Reveal around each point
  for (const point of revealPoints) {
    const { wx, wy, radius } = point;
    const h = getHeightAt(heightMap, Math.floor(wx), Math.floor(wy));
    const effectiveRadius = radius + h * FOG_OF_WAR.heightVisionBonus;
    const r2 = effectiveRadius * effectiveRadius;

    const minCol = Math.max(0, Math.floor(wx - effectiveRadius));
    const maxCol = Math.min(cols - 1, Math.ceil(wx + effectiveRadius));
    const minRow = Math.max(0, Math.floor(wy - effectiveRadius));
    const maxRow = Math.min(rows - 1, Math.ceil(wy + effectiveRadius));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const dx = col + 0.5 - wx;
        const dy = row + 0.5 - wy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          const idx = row * cols + col;
          // Soft edge fade
          const edgeDist = Math.sqrt(d2) / effectiveRadius;
          const targetAlpha = edgeDist < 0.8 ? 1.0 : 1.0 - (edgeDist - 0.8) / 0.2;
          fogGrid[idx] = Math.max(fogGrid[idx], targetAlpha);
        }
      }
    }
  }
}

// ─── HEIGHT ADVANTAGE COMBAT ───

export function calcHeightAdvantage(attackerWx, attackerWy, targetWx, targetWy, heightMap) {
  const attackerH = getHeightAt(heightMap, Math.floor(attackerWx), Math.floor(attackerWy));
  const targetH = getHeightAt(heightMap, Math.floor(targetWx), Math.floor(targetWy));
  const diff = attackerH - targetH;

  if (diff > 0) {
    // Attacker is higher — bonus
    return {
      damageMult: 1 + Math.min(diff * HEIGHT_ADVANTAGE.damageBonus, HEIGHT_ADVANTAGE.maxBonus),
      rangeBonusTiles: diff * HEIGHT_ADVANTAGE.rangeBonus,
      accuracyBonus: Math.min(diff * HEIGHT_ADVANTAGE.accuracyBonus, 0.15),
      dodgePenalty: Math.min(diff * HEIGHT_ADVANTAGE.dodgePenalty, 0.10),
    };
  } else if (diff < 0) {
    // Attacker is lower — penalty
    const absDiff = Math.abs(diff);
    return {
      damageMult: 1 - Math.min(absDiff * HEIGHT_ADVANTAGE.damagePenalty, HEIGHT_ADVANTAGE.maxPenalty),
      rangeBonusTiles: 0,
      accuracyBonus: 0,
      dodgePenalty: 0,
    };
  }

  return { damageMult: 1, rangeBonusTiles: 0, accuracyBonus: 0, dodgePenalty: 0 };
}

// ─── LINE OF SIGHT ───

export function hasLineOfSight(x1, y1, x2, y2, terrainData, terrainDestruction) {
  if (!terrainData) return true;
  const { vegetation, heightMap } = terrainData;

  // Bresenham-like line march through tiles
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist * 2);
  if (steps === 0) return true;

  const stepX = dx / steps;
  const stepY = dy / steps;

  // Check height along the line
  const startH = getHeightAt(heightMap, Math.floor(x1), Math.floor(y1));
  const endH = getHeightAt(heightMap, Math.floor(x2), Math.floor(y2));

  for (let i = 1; i < steps; i++) {
    const cx = x1 + stepX * i;
    const cy = y1 + stepY * i;
    const col = Math.floor(cx);
    const row = Math.floor(cy);

    // Check if terrain blocks LOS (hill between attacker and target)
    const midH = getHeightAt(heightMap, col, row);
    const expectedH = startH + (endH - startH) * (i / steps);
    if (midH > expectedH + 0.8) return false;

    // Check vegetation blocking
    for (const veg of vegetation) {
      if (!veg.alive || !veg.blocksLOS) continue;
      const vdx = veg.wx - cx;
      const vdy = veg.wy - cy;
      if (vdx * vdx + vdy * vdy < 0.6) return false;
    }

    // Check terrain destruction effects (smoke blocks LOS)
    if (terrainDestruction && terrainDestruction.doesEffectBlockLOS(col, row, terrainData.cols)) {
      return false;
    }
  }

  return true;
}

// ─── HELPERS ───

function getNeighbors(col, row, cols, rows) {
  const n = [];
  if (col > 0) n.push({ col: col - 1, row });
  if (col < cols - 1) n.push({ col: col + 1, row });
  if (row > 0) n.push({ col, row: row - 1 });
  if (row < rows - 1) n.push({ col, row: row + 1 });
  return n;
}

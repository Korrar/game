// DungeonState — Manages dungeon progression, level transitions, and persistence
// Handles saving/restoring per-level terrain state, fog of war, and destruction data

import { ISO_CONFIG } from "../utils/isometricUtils.js";
import { generateTerrainData } from "./TerrainSystem.js";
import { TerrainDestructionState } from "./TerrainDestruction.js";
import { createDungeonBiome, generateBossArenaLayout, DUNGEON_TYPES } from "./DungeonGenerator.js";

// ─── DUNGEON TERRAIN GENERATION ───
// Generates terrain data for a specific dungeon level with dungeon-specific modifications

export function generateDungeonTerrain(dungeonState, level) {
  const config = DUNGEON_TYPES[dungeonState.dungeonType];
  if (!config) return null;

  const mapSize = dungeonState.mapSize;
  const dungeonBiome = createDungeonBiome(
    dungeonState.dungeonType, level, dungeonState
  );

  // Use room + level as seed for unique terrain per floor
  const seed = dungeonState.surfaceRoom * 1000 + level * 137;

  // Generate base terrain using existing system with dungeon biome
  const terrainData = generateTerrainData(seed, dungeonBiome);

  // Apply dungeon-specific modifications
  applyDungeonModifications(terrainData, dungeonState, level, config);

  // Mark stairs positions as special overlays
  const levelData = dungeonState.levels[level];
  if (levelData.stairs.down) {
    markStairsOnTerrain(terrainData, levelData.stairs.down, "down");
  }
  if (levelData.stairs.up) {
    markStairsOnTerrain(terrainData, levelData.stairs.up, "up");
  }
  if (levelData.exitPos) {
    markStairsOnTerrain(terrainData, levelData.exitPos, "exit");
  }

  // Boss arena layout for boss levels
  if (levelData.bossLevel) {
    applyBossArenaLayout(terrainData, mapSize);
  }

  return terrainData;
}

// ─── DUNGEON TERRAIN MODIFICATIONS ───

function applyDungeonModifications(terrainData, dungeonState, level, config) {
  const { heightMap } = terrainData;
  const { cols, rows, data } = heightMap;

  // Dungeon floors have more dramatic height variation with tunnel-like features
  // Create "walls" at edges by raising edge tiles significantly
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const edgeDist = Math.min(col, row, cols - 1 - col, rows - 1 - row);

      // Create cave walls at edges (steep rise)
      if (edgeDist < 3) {
        const wallHeight = (3 - edgeDist) * 1.2;
        data[row * cols + col] = Math.min(ISO_CONFIG.MAX_HEIGHT, wallHeight + data[row * cols + col] * 0.3);
      }

      // Deeper levels have lower base elevation (feeling of going underground)
      if (edgeDist >= 3) {
        data[row * cols + col] = Math.max(0, data[row * cols + col] - level * 0.3);
      }
    }
  }

  // Add tunnel-like corridors by carving low-height paths
  carveTunnels(heightMap, dungeonState.surfaceRoom * 1000 + level * 53, level);
}

// ─── TUNNEL CARVING ───

function carveTunnels(heightMap, seed, level) {
  const { data, cols, rows } = heightMap;
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  // Number of tunnels increases with depth
  const tunnelCount = 2 + level;

  for (let t = 0; t < tunnelCount; t++) {
    let cx = Math.floor(rng() * (cols - 8) + 4);
    let cy = Math.floor(rng() * (rows - 8) + 4);
    const length = Math.floor(rng() * 15 + 10);
    const width = Math.floor(rng() * 2 + 1);

    for (let step = 0; step < length; step++) {
      // Carve a low area
      for (let dy = -width; dy <= width; dy++) {
        for (let dx = -width; dx <= width; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 2 && nx < cols - 2 && ny >= 2 && ny < rows - 2) {
            const idx = ny * cols + nx;
            data[idx] = Math.min(data[idx], 0.5);
          }
        }
      }

      // Wander direction
      const dir = rng();
      if (dir < 0.35) cx += 1;
      else if (dir < 0.55) cx -= 1;
      else if (dir < 0.8) cy += 1;
      else cy -= 1;

      cx = Math.max(3, Math.min(cols - 4, cx));
      cy = Math.max(3, Math.min(rows - 4, cy));
    }
  }
}

// ─── STAIRS TERRAIN MARKING ───

function markStairsOnTerrain(terrainData, stairsPos, type) {
  const { heightMap } = terrainData;
  const { data, cols } = heightMap;
  const { col, row } = stairsPos;

  // Flatten area around stairs (3x3)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nc = col + dx;
      const nr = row + dy;
      if (nc >= 0 && nc < heightMap.cols && nr >= 0 && nr < heightMap.rows) {
        const idx = nr * cols + nc;
        data[idx] = Math.max(0, Math.min(data[idx], 0.5));
      }
    }
  }

  // Store stairs info in terrain data for rendering
  if (!terrainData.dungeonFeatures) {
    terrainData.dungeonFeatures = { stairs: [], lightSources: [] };
  }
  terrainData.dungeonFeatures.stairs.push({
    col, row, type,
    wx: col + 0.5,
    wy: row + 0.5,
  });
}

// ─── BOSS ARENA LAYOUT ───

function applyBossArenaLayout(terrainData, mapSize) {
  const layout = generateBossArenaLayout(mapSize);
  const { heightMap } = terrainData;
  const { data, cols } = heightMap;
  const center = layout.arenaCenter;

  // Flatten central arena
  for (let row = 0; row < heightMap.rows; row++) {
    for (let col = 0; col < heightMap.cols; col++) {
      const dx = col - center.col;
      const dy = row - center.row;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < layout.arenaRadius) {
        // Flat arena floor
        data[row * cols + col] = 1.0;
      } else if (dist < layout.arenaRadius + 2) {
        // Gradual rise at edge
        const t = (dist - layout.arenaRadius) / 2;
        data[row * cols + col] = 1.0 + t * 1.5;
      }
    }
  }

  // Elevated platforms
  for (const platform of layout.platforms) {
    for (let dy = 0; dy < platform.height; dy++) {
      for (let dx = 0; dx < platform.width; dx++) {
        const c = platform.col + dx;
        const r = platform.row + dy;
        if (c >= 0 && c < cols && r >= 0 && r < heightMap.rows) {
          data[r * cols + c] = platform.elevation;
        }
      }
    }
  }

  // Ramps (gradual slope between two points)
  for (const ramp of layout.ramps) {
    const steps = Math.max(
      Math.abs(ramp.toCol - ramp.fromCol),
      Math.abs(ramp.toRow - ramp.fromRow)
    ) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const c = Math.round(ramp.fromCol + (ramp.toCol - ramp.fromCol) * t);
      const r = Math.round(ramp.fromRow + (ramp.toRow - ramp.fromRow) * t);
      if (c >= 0 && c < cols && r >= 0 && r < heightMap.rows) {
        // Slope from arena floor (1.0) to platform height (3.0)
        data[r * cols + c] = 1.0 + t * 2.0;
      }
    }
  }

  // Store boss arena data for rendering
  if (!terrainData.dungeonFeatures) {
    terrainData.dungeonFeatures = { stairs: [], lightSources: [] };
  }
  terrainData.dungeonFeatures.bossArena = layout;
}

// ─── LEVEL TRANSITION ───
// Saves current level state and loads target level

export function transitionDungeonLevel(dungeonState, targetLevel, terrainDataRef, terrainDestructionRef) {
  const currentLevel = dungeonState.currentLevel;
  const currentLevelData = dungeonState.levels[currentLevel];

  // Save current level state
  if (currentLevelData && terrainDataRef.current) {
    currentLevelData.terrainData = terrainDataRef.current;
    currentLevelData.fogSnapshot = terrainDataRef.current.fogGrid
      ? new Float32Array(terrainDataRef.current.fogGrid)
      : null;
    // Save destruction state reference (not serialized — kept in memory)
    currentLevelData.destructionState = terrainDestructionRef.current;
  }

  // Load or generate target level
  const targetLevelData = dungeonState.levels[targetLevel];
  if (!targetLevelData.terrainData) {
    // First visit - generate terrain
    targetLevelData.terrainData = generateDungeonTerrain(dungeonState, targetLevel);
    targetLevelData.discovered = true;
  } else if (targetLevelData.fogSnapshot) {
    // Restore fog of war from snapshot
    targetLevelData.terrainData.fogGrid = new Float32Array(targetLevelData.fogSnapshot);
  }

  // Update terrain refs
  terrainDataRef.current = targetLevelData.terrainData;

  // Restore or create new destruction state
  if (targetLevelData.destructionState) {
    terrainDestructionRef.current = targetLevelData.destructionState;
  } else {
    terrainDestructionRef.current = new TerrainDestructionState();
  }

  // Determine spawn position
  let spawnPos;
  if (targetLevel > currentLevel) {
    // Going deeper — spawn near stairs up
    spawnPos = targetLevelData.stairs.up || { col: dungeonState.mapSize / 2, row: dungeonState.mapSize / 2 };
  } else if (targetLevel < currentLevel) {
    // Going up — spawn near stairs down
    spawnPos = targetLevelData.stairs.down || targetLevelData.exitPos || { col: dungeonState.mapSize / 2, row: dungeonState.mapSize / 2 };
  } else {
    spawnPos = { col: dungeonState.mapSize / 2, row: dungeonState.mapSize / 2 };
  }

  // Update dungeon state
  const updatedState = {
    ...dungeonState,
    currentLevel: targetLevel,
  };

  return {
    dungeonState: updatedState,
    spawnPos: { x: spawnPos.col + 0.5, y: spawnPos.row + 0.5 },
    terrainData: targetLevelData.terrainData,
    isFirstVisit: !targetLevelData.cleared && targetLevelData.enemyCount > 0,
    isBossLevel: targetLevelData.bossLevel,
  };
}

// ─── STAIRS PROXIMITY CHECK ───
// Checks if caravan is near any stairs/exit on current level

export function checkStairsProximity(caravanPos, dungeonState, interactRadius) {
  if (!dungeonState) return null;
  const radius = interactRadius || 2.0;
  const currentLevelData = dungeonState.levels[dungeonState.currentLevel];
  if (!currentLevelData) return null;

  const dist = (a, b) => {
    const dx = a.x - (b.col + 0.5);
    const dy = a.y - (b.row + 0.5);
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Check stairs down
  if (currentLevelData.stairs.down) {
    if (dist(caravanPos, currentLevelData.stairs.down) < radius) {
      return {
        type: "descend",
        targetLevel: dungeonState.currentLevel + 1,
        position: currentLevelData.stairs.down,
      };
    }
  }

  // Check stairs up
  if (currentLevelData.stairs.up) {
    if (dist(caravanPos, currentLevelData.stairs.up) < radius) {
      return {
        type: "ascend",
        targetLevel: dungeonState.currentLevel - 1,
        position: currentLevelData.stairs.up,
      };
    }
  }

  // Check surface exit (level 0 only)
  if (currentLevelData.exitPos && dungeonState.currentLevel === 0) {
    if (dist(caravanPos, currentLevelData.exitPos) < radius) {
      return {
        type: "exit_dungeon",
        position: currentLevelData.exitPos,
      };
    }
  }

  return null;
}

// ─── DUNGEON COMPLETION CHECK ───

export function checkDungeonCompletion(dungeonState) {
  if (!dungeonState || dungeonState.completed) return false;

  // Dungeon is complete when boss level is cleared
  const bossLevel = dungeonState.levels.find(l => l.bossLevel);
  return bossLevel?.cleared || false;
}

// ─── DUNGEON REWARDS CALCULATION ───

export function calculateDungeonRewards(dungeonState) {
  if (!dungeonState) return null;
  const config = dungeonState.rewards;
  const levelsCleared = dungeonState.levels.filter(l => l.cleared).length;
  const totalLevels = dungeonState.maxLevels;
  const completionRatio = levelsCleared / totalLevels;

  const copper = Math.floor(
    (config.copperBase + config.copperPerLevel * levelsCleared) * completionRatio
  );
  const silver = Math.random() < config.silverChance * completionRatio
    ? Math.ceil(levelsCleared * 0.5)
    : 0;
  const relic = Math.random() < config.relicChance * completionRatio;

  return {
    copper,
    silver,
    relic,
    levelsCleared,
    totalLevels,
    enemiesKilled: dungeonState.totalEnemiesKilled,
    completionRatio,
    timeSpent: Date.now() - dungeonState.enterTime,
  };
}

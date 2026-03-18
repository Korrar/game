// DepthSystem — 2.5D depth lane system for pseudo-3D rendering
// Higher Y% = closer to camera = bigger scale, higher z-index, less fog

// ─── CONFIGURATION ───

export const DEPTH_CONFIG = {
  // Y percentage range for depth calculation (ground area of the screen)
  minY: 25,   // Horizon line — furthest from camera
  maxY: 90,   // Foreground — closest to camera

  // Scale range: sprites scale based on depth
  minScale: 0.7,   // Scale at horizon (far away)
  maxScale: 1.3,   // Scale at foreground (close up)

  // Z-index range for PixiJS sorting
  zMin: 0,
  zMax: 100,

  // Number of discrete depth lanes
  laneCount: 5,

  // Shadow parameters
  shadowAlphaMin: 0.1,
  shadowAlphaMax: 0.35,

  // Atmospheric fog
  fogMin: 0.0,    // Fog at foreground (none)
  fogMax: 0.35,   // Fog at horizon (moderate haze)
};

// ─── DEPTH FROM Y ───
// Converts a Y percentage (25-90) to a normalized depth value (0-1)
// 0 = far (horizon), 1 = near (foreground)

export function depthFromY(yPct) {
  const { minY, maxY } = DEPTH_CONFIG;
  const clamped = Math.max(minY, Math.min(maxY, yPct));
  return (clamped - minY) / (maxY - minY);
}

// ─── SCALE AT DEPTH ───
// Returns scale multiplier for a given depth (0-1)

export function scaleAtDepth(depth) {
  const d = Math.max(0, Math.min(1, depth));
  const { minScale, maxScale } = DEPTH_CONFIG;
  return minScale + (maxScale - minScale) * d;
}

// ─── Z-INDEX AT DEPTH ───
// Returns integer z-index for PixiJS container sorting

export function zIndexAtDepth(depth) {
  const d = Math.max(0, Math.min(1, depth));
  const { zMin, zMax } = DEPTH_CONFIG;
  return Math.round(zMin + (zMax - zMin) * d);
}

// ─── SHADOW AT DEPTH ───
// Returns shadow rendering parameters based on depth

export function shadowAtDepth(depth) {
  const d = Math.max(0, Math.min(1, depth));
  const { shadowAlphaMin, shadowAlphaMax, minScale, maxScale } = DEPTH_CONFIG;
  const scale = minScale + (maxScale - minScale) * d;
  return {
    scaleX: scale,
    scaleY: scale * 0.4,   // Shadow is flatter than sprite
    alpha: shadowAlphaMin + (shadowAlphaMax - shadowAlphaMin) * d,
    offsetY: 2 + d * 4,    // Closer objects cast shadow further from feet
  };
}

// ─── FOG AT DEPTH ───
// Returns fog intensity (0 = clear, 1 = fully fogged)
// Far objects (depth=0) get more fog, near objects (depth=1) get less

export function fogAtDepth(depth) {
  const d = Math.max(0, Math.min(1, depth));
  const { fogMin, fogMax } = DEPTH_CONFIG;
  return fogMax - (fogMax - fogMin) * d;
}

// ─── Y TO SCREEN Y ───
// Converts yPct to actual pixel screen Y coordinate

export function yToScreenY(yPct, H) {
  const GY = H * 0.25; // Horizon line at 25% from top
  const groundH = H - GY; // Ground area height in pixels
  // Map yPct (minY..maxY) to pixel range (GY..H)
  const { minY, maxY } = DEPTH_CONFIG;
  const clamped = Math.max(minY, Math.min(maxY, yPct));
  const t = (clamped - minY) / (maxY - minY);
  return GY + t * groundH;
}

// ─── ASSIGN DEPTH LANE ───
// Maps yPct to a discrete lane number (0 = back, laneCount-1 = front)

export function assignDepthLane(yPct) {
  const depth = depthFromY(yPct);
  const { laneCount } = DEPTH_CONFIG;
  const lane = Math.floor(depth * laneCount);
  return Math.min(lane, laneCount - 1);
}

// ─── SORT BY DEPTH ───
// Sorts an array of objects with yPct property by depth (far first)
// Non-mutating, stable sort

export function sortByDepth(items) {
  return [...items].sort((a, b) => a.yPct - b.yPct);
}

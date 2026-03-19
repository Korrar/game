/**
 * Panoramic 360° wrapping utilities.
 *
 * The panoramic world is PANORAMA_WORLD_W times wider than the viewport.
 * Objects exist at fixed world positions and wrap around when the camera pans.
 *
 * Key invariant: screen position changes SMOOTHLY as panOffset increases.
 * No jumps between "copies" — just a single modulo-wrapped linear offset.
 */

export const PANORAMA_WORLD_W = 3; // world is 3× the viewport width

/**
 * Wrap a percentage-based X position (0–100) into screen-space,
 * accounting for the panoramic camera offset.
 *
 * @param {number} pct      – object position in viewport-percentage (0–100)
 * @param {number} panOffset – camera pan offset in pixels
 * @param {number} gameW     – viewport width in pixels (e.g. 1280)
 * @returns {number|null}    – screen-space percentage (can be slightly outside 0–100
 *                             for margin), or null if entirely off-screen
 */
export function wrapPctToScreen(pct, panOffset, gameW) {
  if (!panOffset) return pct; // no panning → pass-through

  const panPct = (panOffset / gameW) * 100;
  const worldPct = 100 * PANORAMA_WORLD_W; // 300

  // Screen position = objPos - cameraPan, wrapped into [-10, 290) range
  let sx = ((pct - panPct + 10) % worldPct + worldPct) % worldPct - 10;
  return (sx <= 110) ? sx : null;
}

/**
 * Wrap a pixel-based X position into screen-space for PixiJS rendering.
 *
 * @param {number} physX     – object position in pixels (typically 0–gameW)
 * @param {number} panOffset – camera pan offset in pixels
 * @param {number} gameW     – viewport width in pixels (e.g. 1280)
 * @returns {number|null}    – screen-space pixel X, or null if off-screen
 */
/**
 * Convert a screen-space pixel X back to world-space pixel X.
 * Inverse of wrapPxToScreen — used to convert click positions to world coords.
 *
 * @param {number} screenX  – screen-space pixel X
 * @param {number} panOffset – camera pan offset in pixels
 * @param {number} gameW     – viewport width in pixels
 * @returns {number}         – world-space pixel X (wrapped into [0, worldW))
 */
export function screenPxToWorld(screenX, panOffset, gameW) {
  if (!panOffset) return screenX;
  const worldW = gameW * PANORAMA_WORLD_W;
  return ((screenX + panOffset) % worldW + worldW) % worldW;
}

export function wrapPxToScreen(physX, panOffset, gameW) {
  if (!panOffset) return physX; // no panning → pass-through

  const worldW = gameW * PANORAMA_WORLD_W;
  const margin = 80;

  // Screen position = objPos - cameraPan, wrapped into [-margin, worldW-margin) range
  let sx = ((physX - panOffset + margin) % worldW + worldW) % worldW - margin;
  return (sx <= gameW + margin) ? sx : null;
}

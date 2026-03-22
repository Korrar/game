// IsoCamera — Camera system for isometric view
// Manages viewport position over the isometric world

import { ISO_CONFIG, worldToScreen } from "../utils/isometricUtils.js";

// Water margin in tiles around the map — camera can see this far beyond the map edge
const WATER_MARGIN = 16;

export class IsoCamera {
  constructor(x, y) {
    // Default to center of map in screen space
    if (x === undefined || y === undefined) {
      const center = worldToScreen(
        ISO_CONFIG.MAP_COLS / 2,
        ISO_CONFIG.MAP_ROWS / 2,
        0, 0
      );
      this.x = x ?? center.x - ISO_CONFIG.GAME_W / 2;
      this.y = y ?? center.y - ISO_CONFIG.GAME_H / 2;
    } else {
      this.x = x;
      this.y = y;
    }
    this._bounds = null;
    // Auto-calculate bounds based on map size so camera stays near the map
    this._initMapBounds();
  }

  // Calculate camera bounds so the viewport stays within map + water margin
  _initMapBounds() {
    const { MAP_COLS, MAP_ROWS, GAME_W, GAME_H } = ISO_CONFIG;
    // Screen positions of the four map corners (with water margin)
    const topCorner = worldToScreen(-WATER_MARGIN, -WATER_MARGIN, 0, 0);
    const rightCorner = worldToScreen(MAP_COLS + WATER_MARGIN, -WATER_MARGIN, 0, 0);
    const bottomCorner = worldToScreen(MAP_COLS + WATER_MARGIN, MAP_ROWS + WATER_MARGIN, 0, 0);
    const leftCorner = worldToScreen(-WATER_MARGIN, MAP_ROWS + WATER_MARGIN, 0, 0);

    // Camera x,y represents the top-left of the viewport in screen space offset
    // Find the bounding box of the map diamond in screen space
    const screenMinX = leftCorner.x - GAME_W / 2;
    const screenMaxX = rightCorner.x - GAME_W / 2;
    const screenMinY = topCorner.y - GAME_H / 2;
    const screenMaxY = bottomCorner.y - GAME_H / 2;

    // Clamp so camera can't scroll beyond the map + water margin
    this._bounds = {
      minX: screenMinX,
      minY: screenMinY,
      maxX: screenMaxX,
      maxY: screenMaxY,
    };
    this._clamp();
  }

  // Move camera by delta (used for drag panning)
  pan(dx, dy) {
    this.x += dx;
    this.y += dy;
    this._clamp();
  }

  // Set absolute camera position
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this._clamp();
  }

  // Center camera on a world coordinate
  centerOnWorld(wx, wy) {
    const screen = worldToScreen(wx, wy, 0, 0);
    this.x = screen.x - ISO_CONFIG.GAME_W / 2;
    this.y = screen.y - ISO_CONFIG.GAME_H / 2;
    this._clamp();
  }

  // Set camera movement bounds (override auto-calculated bounds)
  setBounds(minX, minY, maxX, maxY) {
    this._bounds = { minX, minY, maxX, maxY };
    this._clamp();
  }

  // Smooth follow a target position (lerp)
  followTarget(targetX, targetY, factor) {
    this.x += (targetX - this.x) * factor;
    this.y += (targetY - this.y) * factor;
    this._clamp();
  }

  // Get camera offset for rendering
  getScreenOffset() {
    return { x: this.x, y: this.y };
  }

  _clamp() {
    if (!this._bounds) return;
    const { minX, minY, maxX, maxY } = this._bounds;
    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }
}

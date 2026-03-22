// IsoCamera — Camera system for isometric view
// Manages viewport position over the isometric world

import { ISO_CONFIG, worldToScreen } from "../utils/isometricUtils.js";

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

  // Set camera movement bounds
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

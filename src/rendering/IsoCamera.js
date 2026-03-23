// IsoCamera — Advanced camera system for isometric view
// Manages viewport position, zoom, smooth follow, and screen shake

import { ISO_CONFIG, worldToScreen } from "../utils/isometricUtils.js";

// Water margin in tiles around the map — camera can see this far beyond the map edge
const WATER_MARGIN = 16;

// Zoom constraints
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_DEFAULT = 1.0;
const ZOOM_STEP = 0.1;
const ZOOM_LERP = 0.12; // smooth zoom interpolation speed

// Follow camera settings
const FOLLOW_LERP_DEFAULT = 0.08;
const FOLLOW_DEADZONE = 2; // pixels — don't move camera if target is within this range

// Screen shake settings
const SHAKE_DECAY = 0.92;
const SHAKE_MIN_INTENSITY = 0.5;

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

    // Zoom state
    this.zoom = ZOOM_DEFAULT;
    this._targetZoom = ZOOM_DEFAULT;

    // Follow target (world coordinates)
    this._followWx = null;
    this._followWy = null;
    this._followLerp = FOLLOW_LERP_DEFAULT;
    this._followEnabled = false;

    // Screen shake
    this._shakeIntensity = 0;
    this._shakeOffsetX = 0;
    this._shakeOffsetY = 0;

    // Bounds
    this._bounds = null;
    this._initMapBounds();
  }

  // ─── ZOOM ───

  // Set target zoom level (will interpolate smoothly)
  setZoom(level) {
    this._targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
  }

  // Zoom in/out by steps (for mouse wheel / pinch)
  zoomBy(delta, focusScreenX, focusScreenY) {
    const oldZoom = this.zoom;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this._targetZoom + delta * ZOOM_STEP));
    this._targetZoom = newZoom;

    // Zoom toward focus point (mouse position or pinch center)
    if (focusScreenX !== undefined && focusScreenY !== undefined) {
      const { GAME_W, GAME_H } = ISO_CONFIG;
      // Calculate world point under focus
      const worldFocusX = (focusScreenX - GAME_W / 2) / oldZoom + this.x + GAME_W / 2;
      const worldFocusY = (focusScreenY - GAME_H / 2) / oldZoom + this.y + GAME_H / 2;
      // Adjust camera so the same world point stays under focus after zoom
      this.x = worldFocusX - (focusScreenX - GAME_W / 2) / newZoom - GAME_W / 2;
      this.y = worldFocusY - (focusScreenY - GAME_H / 2) / newZoom - GAME_H / 2;
      this._clamp();
    }
  }

  // Reset zoom to default
  resetZoom() {
    this._targetZoom = ZOOM_DEFAULT;
  }

  // ─── FOLLOW TARGET ───

  // Start following a world coordinate (e.g. caravan position)
  startFollow(wx, wy, lerp) {
    this._followWx = wx;
    this._followWy = wy;
    this._followLerp = lerp || FOLLOW_LERP_DEFAULT;
    this._followEnabled = true;
  }

  // Update follow target position (call each frame when target moves)
  updateFollowTarget(wx, wy) {
    this._followWx = wx;
    this._followWy = wy;
  }

  // Stop following
  stopFollow() {
    this._followEnabled = false;
    this._followWx = null;
    this._followWy = null;
  }

  // ─── SCREEN SHAKE ───

  // Trigger screen shake (e.g. on big explosion, boss attack)
  shake(intensity) {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  // ─── UPDATE (call each frame) ───

  update() {
    // Smooth zoom interpolation
    if (Math.abs(this.zoom - this._targetZoom) > 0.001) {
      this.zoom += (this._targetZoom - this.zoom) * ZOOM_LERP;
    } else {
      this.zoom = this._targetZoom;
    }

    // Follow target
    if (this._followEnabled && this._followWx !== null) {
      const targetScreen = worldToScreen(this._followWx, this._followWy, 0, 0);
      const targetX = targetScreen.x - ISO_CONFIG.GAME_W / 2;
      const targetY = targetScreen.y - ISO_CONFIG.GAME_H / 2;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      if (Math.abs(dx) > FOLLOW_DEADZONE || Math.abs(dy) > FOLLOW_DEADZONE) {
        this.x += dx * this._followLerp;
        this.y += dy * this._followLerp;
      }
    }

    // Screen shake decay
    if (this._shakeIntensity > SHAKE_MIN_INTENSITY) {
      this._shakeOffsetX = (Math.random() - 0.5) * 2 * this._shakeIntensity;
      this._shakeOffsetY = (Math.random() - 0.5) * 2 * this._shakeIntensity;
      this._shakeIntensity *= SHAKE_DECAY;
    } else {
      this._shakeIntensity = 0;
      this._shakeOffsetX = 0;
      this._shakeOffsetY = 0;
    }

    this._clamp();
  }

  // ─── CAMERA BOUNDS ───

  // Calculate camera bounds so the viewport stays within map + water margin
  _initMapBounds() {
    this._recalcBounds(ISO_CONFIG.MAP_COLS, ISO_CONFIG.MAP_ROWS);
  }

  // Recalculate bounds for a given map size (supports dynamic arena sizes)
  _recalcBounds(cols, rows) {
    const { GAME_W, GAME_H } = ISO_CONFIG;
    const topCorner = worldToScreen(-WATER_MARGIN, -WATER_MARGIN, 0, 0);
    const rightCorner = worldToScreen(cols + WATER_MARGIN, -WATER_MARGIN, 0, 0);
    const bottomCorner = worldToScreen(cols + WATER_MARGIN, rows + WATER_MARGIN, 0, 0);
    const leftCorner = worldToScreen(-WATER_MARGIN, rows + WATER_MARGIN, 0, 0);

    this._bounds = {
      minX: leftCorner.x - GAME_W / 2,
      minY: topCorner.y - GAME_H / 2,
      maxX: rightCorner.x - GAME_W / 2,
      maxY: bottomCorner.y - GAME_H / 2,
    };
    this._clamp();
  }

  // Update bounds for dynamic arena size (e.g. boss arena, different room sizes)
  setMapSize(cols, rows) {
    this._recalcBounds(cols, rows);
  }

  // ─── PANNING ───

  // Move camera by delta (used for drag panning)
  pan(dx, dy) {
    this.x += dx / this.zoom;
    this.y += dy / this.zoom;
    this._clamp();
  }

  // Set absolute camera position
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this._clamp();
  }

  // Center camera on a world coordinate (instant, no lerp)
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

  // Smooth follow a target position (lerp) — legacy API, prefer startFollow + update
  followTarget(targetX, targetY, factor) {
    this.x += (targetX - this.x) * factor;
    this.y += (targetY - this.y) * factor;
    this._clamp();
  }

  // ─── GETTERS ───

  // Get effective camera offset for rendering (includes shake)
  getScreenOffset() {
    return {
      x: this.x + this._shakeOffsetX,
      y: this.y + this._shakeOffsetY,
    };
  }

  // Get raw position without shake
  getRawPosition() {
    return { x: this.x, y: this.y };
  }

  // Get current zoom level
  getZoom() {
    return this.zoom;
  }

  // Check if a screen-space rectangle is visible (for culling)
  isVisible(screenX, screenY, width, height) {
    const { GAME_W, GAME_H } = ISO_CONFIG;
    const margin = 64; // extra margin for sprites partially on-screen
    return screenX + width > -margin &&
           screenX < GAME_W + margin &&
           screenY + height > -margin &&
           screenY < GAME_H + margin;
  }

  // Convert screen coordinates to world (accounting for zoom)
  screenToWorldWithZoom(sx, sy) {
    const { GAME_W, GAME_H, TILE_W, TILE_H } = ISO_CONFIG;
    // Undo zoom transform
    const unzoomedX = (sx - GAME_W / 2) / this.zoom + GAME_W / 2;
    const unzoomedY = (sy - GAME_H / 2) / this.zoom + GAME_H / 2;
    // Standard screen-to-world
    const adjX = unzoomedX - GAME_W / 2 + this.x;
    const adjY = unzoomedY - GAME_H / 2 + this.y;
    const wx = (adjX / (TILE_W / 2) + adjY / (TILE_H / 2)) / 2;
    const wy = (adjY / (TILE_H / 2) - adjX / (TILE_W / 2)) / 2;
    return { x: wx, y: wy };
  }

  _clamp() {
    if (!this._bounds) return;
    const { minX, minY, maxX, maxY } = this._bounds;
    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }
}

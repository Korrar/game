// IsoMinimap — small overview map for isometric view navigation
import { ISO_CONFIG } from "../utils/isometricUtils.js";

const MINIMAP_W = 140;
const MINIMAP_H = 80;
const SCALE_X = MINIMAP_W / ISO_CONFIG.MAP_COLS;
const SCALE_Y = MINIMAP_H / ISO_CONFIG.MAP_ROWS;

export default function IsoMinimap({ walkers, walkData, caravanPos, cameraX, cameraY, biome, isMobile }) {
  if (isMobile) return null; // too small on mobile

  const { MAP_COLS, MAP_ROWS, TILE_W, TILE_H, GAME_W, GAME_H } = ISO_CONFIG;

  // Calculate viewport rect in world coords from camera offset
  // Camera offset = worldToScreen(center) - GAME_W/2
  // We reverse: screenToWorld of screen corners
  // Simplified: camera shows area centered around the world point that maps to screen center
  const camCenterWx = (cameraX + GAME_W / 2) / (TILE_W / 2) * 0.5;
  const camCenterWy = (cameraY + GAME_H / 2) / (TILE_H / 2) * 0.5;
  // Approximate viewport bounds in world coords
  const vpHalfW = (GAME_W / TILE_W) * 1.2;
  const vpHalfH = (GAME_H / TILE_H) * 1.5;

  const dots = [];

  // Caravan
  if (caravanPos) {
    dots.push(
      <circle key="caravan" cx={caravanPos.x * SCALE_X} cy={caravanPos.y * SCALE_Y}
        r={3} fill="#40e060" stroke="#000" strokeWidth={0.5} />
    );
  }

  // Enemies and friendlies
  if (walkers && walkData) {
    for (const w of walkers) {
      if (!w.alive || w.dying) continue;
      const d = walkData[w.id];
      if (!d) continue;
      const wx = d.wx ?? d.x;
      const wy = d.wy ?? d.y;
      if (wx < 0 || wx > MAP_COLS || wy < 0 || wy > MAP_ROWS) continue;
      const color = d.friendly ? "#4488ff" : "#e04040";
      const r = d.friendly ? 2 : 1.5;
      dots.push(
        <circle key={w.id} cx={wx * SCALE_X} cy={wy * SCALE_Y}
          r={r} fill={color} opacity={0.85} />
      );
    }
  }

  // Viewport indicator
  const vpX = Math.max(0, (camCenterWx - vpHalfW)) * SCALE_X;
  const vpY = Math.max(0, (camCenterWy - vpHalfH)) * SCALE_Y;
  const vpW = Math.min(MINIMAP_W, vpHalfW * 2 * SCALE_X);
  const vpH = Math.min(MINIMAP_H, vpHalfH * 2 * SCALE_Y);

  const groundCol = biome?.groundCol || "#3a5a2a";

  return (
    <div style={{
      position: "absolute", top: 8, right: 8, zIndex: 22,
      width: MINIMAP_W, height: MINIMAP_H,
      background: "rgba(0,0,0,0.7)",
      border: "1px solid #5a3818",
      borderRadius: 4,
      overflow: "hidden",
      pointerEvents: "none",
    }}>
      <svg width={MINIMAP_W} height={MINIMAP_H} viewBox={`0 0 ${MINIMAP_W} ${MINIMAP_H}`}>
        {/* Map background */}
        <rect x={0} y={0} width={MINIMAP_W} height={MINIMAP_H} fill={groundCol} opacity={0.4} />
        {/* Map border (diamond shape) */}
        <polygon
          points={`${MINIMAP_W / 2},2 ${MINIMAP_W - 2},${MINIMAP_H / 2} ${MINIMAP_W / 2},${MINIMAP_H - 2} 2,${MINIMAP_H / 2}`}
          fill={groundCol} opacity={0.3} stroke="#5a3818" strokeWidth={1}
        />
        {/* Viewport rectangle */}
        <rect x={vpX} y={vpY} width={vpW} height={vpH}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1}
          strokeDasharray="3,2" />
        {/* Entities */}
        {dots}
      </svg>
    </div>
  );
}

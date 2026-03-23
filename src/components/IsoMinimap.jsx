// IsoMinimap — Isometric overview map with terrain visualization and click-to-navigate
import { useRef, useEffect, useCallback } from "react";
import { ISO_CONFIG, screenToWorld } from "../utils/isometricUtils.js";
import { getHeightAt } from "../utils/isometricUtils.js";

const MINIMAP_W = 160;
const MINIMAP_H = 90;
const SCALE_X = MINIMAP_W / ISO_CONFIG.MAP_COLS;
const SCALE_Y = MINIMAP_H / ISO_CONFIG.MAP_ROWS;

export default function IsoMinimap({
  walkers, walkData, caravanPos, cameraX, cameraY,
  biome, isMobile, heightMap, onNavigate
}) {
  const canvasRef = useRef(null);
  const terrainCacheRef = useRef(null);
  const lastBiomeRef = useRef(null);

  // Pre-render terrain to offscreen canvas (only when biome/heightMap changes)
  useEffect(() => {
    if (!canvasRef.current) return;
    const biomeId = biome?.id;
    if (biomeId === lastBiomeRef.current && terrainCacheRef.current) return;
    lastBiomeRef.current = biomeId;

    const offscreen = document.createElement("canvas");
    offscreen.width = MINIMAP_W;
    offscreen.height = MINIMAP_H;
    const octx = offscreen.getContext("2d");

    const groundCol = biome?.groundCol || "#3a5a2a";
    const baseR = parseInt(groundCol.slice(1, 3), 16);
    const baseG = parseInt(groundCol.slice(3, 5), 16);
    const baseB = parseInt(groundCol.slice(5, 7), 16);

    // Draw terrain pixels
    const { MAP_COLS, MAP_ROWS } = ISO_CONFIG;
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const h = getHeightAt(heightMap, col, row);
        // Brighten based on height
        const bright = 1.0 + h * 0.15;
        const r = Math.min(255, Math.round(baseR * bright));
        const g = Math.min(255, Math.round(baseG * bright));
        const b = Math.min(255, Math.round(baseB * bright));
        octx.fillStyle = `rgb(${r},${g},${b})`;
        const px = col * SCALE_X;
        const py = row * SCALE_Y;
        octx.fillRect(px, py, Math.ceil(SCALE_X), Math.ceil(SCALE_Y));
      }
    }

    // Water border
    octx.strokeStyle = "#1a4a7a";
    octx.lineWidth = 2;
    octx.strokeRect(0, 0, MINIMAP_W, MINIMAP_H);

    terrainCacheRef.current = offscreen;
  }, [biome?.id, heightMap]);

  // Render minimap each frame (entities + viewport)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Terrain
    if (terrainCacheRef.current) {
      ctx.drawImage(terrainCacheRef.current, 0, 0);
    }

    const { MAP_COLS, MAP_ROWS, TILE_W, TILE_H, GAME_W, GAME_H } = ISO_CONFIG;

    // Viewport indicator
    const camCenterWx = (cameraX + GAME_W / 2) / (TILE_W / 2) * 0.5;
    const camCenterWy = (cameraY + GAME_H / 2) / (TILE_H / 2) * 0.5;
    const vpHalfW = (GAME_W / TILE_W) * 1.2;
    const vpHalfH = (GAME_H / TILE_H) * 1.5;
    const vpX = Math.max(0, (camCenterWx - vpHalfW)) * SCALE_X;
    const vpY = Math.max(0, (camCenterWy - vpHalfH)) * SCALE_Y;
    const vpW = Math.min(MINIMAP_W, vpHalfW * 2 * SCALE_X);
    const vpH = Math.min(MINIMAP_H, vpHalfH * 2 * SCALE_Y);

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(vpX, vpY, vpW, vpH);
    ctx.setLineDash([]);

    // Caravan
    if (caravanPos) {
      ctx.fillStyle = "#40e060";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(caravanPos.x * SCALE_X, caravanPos.y * SCALE_Y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Entities
    if (walkers && walkData) {
      for (const w of walkers) {
        if (!w.alive || w.dying) continue;
        const d = walkData[w.id];
        if (!d) continue;
        const wx = d.wx ?? d.x;
        const wy = d.wy ?? d.y;
        if (wx < 0 || wx > MAP_COLS || wy < 0 || wy > MAP_ROWS) continue;
        ctx.fillStyle = d.friendly ? "#4488ff" : "#e04040";
        ctx.beginPath();
        ctx.arc(wx * SCALE_X, wy * SCALE_Y, d.friendly ? 2 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [walkers, walkData, caravanPos, cameraX, cameraY, biome]);

  // Click to navigate
  const handleClick = useCallback((e) => {
    if (!onNavigate) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width * MINIMAP_W;
    const my = (e.clientY - rect.top) / rect.height * MINIMAP_H;
    const wx = mx / SCALE_X;
    const wy = my / SCALE_Y;
    onNavigate(wx, wy);
  }, [onNavigate]);

  if (isMobile) return null;

  return (
    <div style={{
      position: "absolute", top: 8, right: 8, zIndex: 22,
      width: MINIMAP_W, height: MINIMAP_H,
      border: "2px solid #5a3818",
      borderRadius: 4,
      overflow: "hidden",
      cursor: onNavigate ? "pointer" : "default",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
    }}>
      <canvas
        ref={canvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ width: MINIMAP_W, height: MINIMAP_H, display: "block" }}
        onClick={handleClick}
      />
    </div>
  );
}

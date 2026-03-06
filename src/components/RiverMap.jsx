import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { RIVER_NODE_TYPES, FORK_HINT_ICONS, NODE_SEGMENT_MODIFIERS, generateRiverMap, findNode, getNextNodes } from "../data/riverMap";
import GameIcon from "./GameIcon";

// Slay the Spire style branching river map before sailing
// Player sees the entire river path and picks their route through forks

const MAP_W = 600;
const MAP_H = 500;
const NODE_R = 24;
const PAD_X = 80;
const PAD_TOP = 60;
const PAD_BOT = 60;

function nodeScreenPos(node, totalRows) {
  const rowSpacing = (MAP_H - PAD_TOP - PAD_BOT) / (totalRows - 1);
  // Row 0 at bottom, last row at top (sailing upward)
  const y = MAP_H - PAD_BOT - node.row * rowSpacing;
  const x = PAD_X + node.x * (MAP_W - PAD_X * 2);
  return { x, y };
}

function RiverMapCanvas({ riverMap, selectedPath, currentNode, onNodeClick, hasScout }) {
  const canvasRef = useRef(null);
  const [hoverNode, setHoverNode] = useState(null);
  const nodesRef = useRef([]);

  // Pre-calculate node positions
  const nodePositions = useMemo(() => {
    const positions = {};
    for (const row of riverMap.rows) {
      for (const node of row) {
        positions[node.id] = nodeScreenPos(node, riverMap.totalRows);
      }
    }
    return positions;
  }, [riverMap]);

  // Determine which nodes are available to select
  const availableNodes = useMemo(() => {
    if (!currentNode) return new Set(riverMap.rows[0].map(n => n.id));
    const nextNodes = getNextNodes(riverMap, currentNode);
    return new Set(nextNodes.map(n => n.id));
  }, [riverMap, currentNode]);

  const selectedIds = useMemo(() => new Set(selectedPath.map(n => n.id)), [selectedPath]);

  // Draw the map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, MAP_W, MAP_H);

    // Background: dark parchment
    const bg = ctx.createLinearGradient(0, 0, 0, MAP_H);
    bg.addColorStop(0, "#0a1828");
    bg.addColorStop(0.5, "#0c2035");
    bg.addColorStop(1, "#081420");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Water texture
    ctx.globalAlpha = 0.06;
    for (let y = 0; y < MAP_H; y += 30) {
      ctx.strokeStyle = "#4090c0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= MAP_W; x += 6) {
        const wy = y + Math.sin(x * 0.03 + y * 0.01) * 8;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Draw edges (connections)
    for (const row of riverMap.rows) {
      for (const node of row) {
        const from = nodePositions[node.id];
        for (const connId of node.connections) {
          const to = nodePositions[connId];
          if (!to) continue;

          const isOnPath = selectedIds.has(node.id) && selectedIds.has(connId);
          const isAvailable = selectedIds.has(node.id) && availableNodes.has(connId);

          ctx.strokeStyle = isOnPath ? "#ffd700" : isAvailable ? "rgba(255,215,0,0.4)" : "rgba(100,140,180,0.25)";
          ctx.lineWidth = isOnPath ? 3 : isAvailable ? 2.5 : 1.5;

          if (!isOnPath && !isAvailable) {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }

          // Draw curved connection
          ctx.beginPath();
          const midY = (from.y + to.y) / 2;
          const midX = (from.x + to.x) / 2 + (from.x === to.x ? 0 : (Math.random() > 0.5 ? 10 : -10));
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(midX, midY, to.x, to.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Arrow on available paths
          if (isAvailable || isOnPath) {
            const t = 0.6;
            const ax = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
            const ay = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const angle = Math.atan2(dy, dx);
            ctx.fillStyle = isOnPath ? "#ffd700" : "rgba(255,215,0,0.5)";
            ctx.beginPath();
            ctx.moveTo(ax + Math.cos(angle) * 6, ay + Math.sin(angle) * 6);
            ctx.lineTo(ax + Math.cos(angle + 2.5) * 5, ay + Math.sin(angle + 2.5) * 5);
            ctx.lineTo(ax + Math.cos(angle - 2.5) * 5, ay + Math.sin(angle - 2.5) * 5);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // Draw nodes
    nodesRef.current = [];
    for (const row of riverMap.rows) {
      for (const node of row) {
        const pos = nodePositions[node.id];
        const typeDef = RIVER_NODE_TYPES[node.type] || RIVER_NODE_TYPES.calm;
        const isSelected = selectedIds.has(node.id);
        const isAvail = availableNodes.has(node.id);
        const isHovered = hoverNode === node.id;
        const isCurrent = currentNode === node.id;

        // Store for hit-testing
        nodesRef.current.push({ id: node.id, x: pos.x, y: pos.y, r: NODE_R });

        // Glow for available/selected
        if (isAvail || isSelected) {
          ctx.save();
          ctx.shadowColor = isSelected ? "#ffd700" : typeDef.color;
          ctx.shadowBlur = isHovered ? 18 : (isAvail ? 12 : 8);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, NODE_R + 2, 0, Math.PI * 2);
          ctx.fillStyle = "transparent";
          ctx.fill();
          ctx.restore();
        }

        // Node circle
        const r = isHovered ? NODE_R + 3 : NODE_R;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = typeDef.color;
          ctx.fill();
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (isAvail) {
          const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
          grad.addColorStop(0, typeDef.color);
          grad.addColorStop(1, `${typeDef.color}88`);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = isHovered ? "#fff" : "rgba(255,215,0,0.6)";
          ctx.lineWidth = isHovered ? 3 : 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(20,30,40,0.8)";
          ctx.fill();
          ctx.strokeStyle = "rgba(80,100,120,0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Current node indicator (pulsing ring)
        if (isCurrent) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Icon text inside node (using typeDef icon name as text placeholder)
        const iconSize = 14;
        ctx.fillStyle = isSelected ? "#fff" : isAvail ? "#e0d8c8" : "rgba(120,140,160,0.6)";
        ctx.font = `bold ${iconSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Use a simple symbol mapping
        const symbols = {
          anchor: "⚓", water: "~", skull: "☠", treasure: "♦", swords: "⚔",
          heart: "♥", shop: "$", compass: "✦", wind: "≋", vortex: "◎",
          rock: "▲", kraken: "🐙", flag: "⚑",
        };
        const sym = symbols[typeDef.icon] || "●";
        ctx.fillText(sym, pos.x, pos.y + 1);

        // Label below node (only for available/selected)
        if (isAvail || isSelected || isHovered) {
          ctx.fillStyle = isSelected ? "#ffd700" : "rgba(200,190,170,0.7)";
          ctx.font = "10px monospace";
          ctx.fillText(typeDef.name, pos.x, pos.y + r + 14);
        }

        // Turn indicator (small icon)
        if (node.turn && node.turn !== "straight" && (isAvail || isSelected)) {
          const turnSymbols = {
            gentle_l: "↰", gentle_r: "↱", sharp_l: "⤺", sharp_r: "⤻",
            s_curve: "∿", waterfall: "▼", delta: "◇",
          };
          const ts = turnSymbols[node.turn];
          if (ts) {
            ctx.fillStyle = "rgba(160,200,255,0.5)";
            ctx.font = "9px monospace";
            ctx.fillText(ts, pos.x + r + 8, pos.y - 4);
          }
        }

        // Hint icons for scouting (if player has crow's nest upgrade)
        if (hasScout && isAvail && !isSelected) {
          const hint = FORK_HINT_ICONS[node.type];
          if (hint) {
            ctx.fillStyle = hint.color + "80";
            ctx.font = "bold 9px monospace";
            ctx.fillText(hint.label, pos.x, pos.y - r - 6);
          }
        }
      }
    }

    // Direction labels
    ctx.fillStyle = "rgba(100,140,180,0.3)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("▲ CEL", MAP_W / 2, 18);
    ctx.fillText("▼ START", MAP_W / 2, MAP_H - 12);

  }, [riverMap, nodePositions, selectedPath, selectedIds, currentNode, availableNodes, hoverNode, hasScout]);

  // Hit testing
  const getNodeAt = useCallback((ex, ey) => {
    for (const n of nodesRef.current) {
      const dx = ex - n.x;
      const dy = ey - n.y;
      if (dx * dx + dy * dy < (n.r + 6) * (n.r + 6)) return n.id;
    }
    return null;
  }, []);

  const handleClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const nodeId = getNodeAt(mx, my);
    if (nodeId && availableNodes.has(nodeId)) {
      onNodeClick(nodeId);
    }
  }, [getNodeAt, availableNodes, onNodeClick]);

  const handleMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    setHoverNode(getNodeAt(mx, my));
  }, [getNodeAt]);

  return (
    <canvas
      ref={canvasRef}
      width={MAP_W}
      height={MAP_H}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverNode(null)}
      style={{
        width: "100%", maxWidth: MAP_W, height: "auto",
        cursor: "pointer", border: "2px solid #3a5070",
        borderRadius: 8,
      }}
    />
  );
}

export default function RiverMap({ roomNumber, onConfirm, onCancel, onSkip, isMobile, shipUpgrades = [] }) {
  const hasScout = shipUpgrades.includes("crow_nest");

  const riverMap = useMemo(() => generateRiverMap(roomNumber), [roomNumber]);

  // Selected path: list of node objects the player has chosen
  const [selectedPath, setSelectedPath] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);
  // Auto-select start node via useMemo to avoid effect setState
  const _initDone = useMemo(() => {
    const startNode = riverMap.rows[0][0];
    // defer to avoid sync setState in render
    setTimeout(() => {
      setSelectedPath([startNode]);
      setCurrentNode(startNode.id);
    }, 0);
    return true;
  }, [riverMap]);

  const handleNodeClick = useCallback((nodeId) => {
    const node = findNode(riverMap, nodeId);
    if (!node) return;

    // Check if this is a valid next step
    const available = getNextNodes(riverMap, currentNode);
    if (!available.find(n => n.id === nodeId)) return;

    setSelectedPath(prev => [...prev, node]);
    setCurrentNode(nodeId);

    // If we reached the end node, the path is complete
    if (node.type === "end") {
      // Path complete — no auto-confirm, let player review
    }
  }, [riverMap, currentNode]);

  const handleUndo = useCallback(() => {
    if (selectedPath.length <= 1) return;
    const newPath = selectedPath.slice(0, -1);
    setSelectedPath(newPath);
    setCurrentNode(newPath[newPath.length - 1].id);
  }, [selectedPath]);

  const isPathComplete = selectedPath.length > 0 && selectedPath[selectedPath.length - 1].type === "end";

  // Path summary
  const pathSummary = useMemo(() => {
    if (selectedPath.length < 2) return null;
    let danger = 0, loot = 0, healing = 0;
    for (const node of selectedPath) {
      const mod = NODE_SEGMENT_MODIFIERS[node.type];
      if (mod) {
        danger += mod.obstacleMult + mod.enemyMult;
        loot += mod.lootMult;
        healing += mod.hpRegenPerSec;
      }
    }
    return {
      danger: Math.round(danger * 10),
      loot: Math.round(loot * 10),
      healing: Math.round(healing * 10),
      segments: selectedPath.length - 2, // exclude start/end
    };
  }, [selectedPath]);

  const handleConfirm = useCallback(() => {
    if (!isPathComplete) return;
    // Convert path to segment definitions for the river mini-game
    const segments = selectedPath.slice(1, -1).map(node => ({
      nodeId: node.id,
      type: node.type,
      turn: node.turn,
      modifiers: NODE_SEGMENT_MODIFIERS[node.type] || NODE_SEGMENT_MODIFIERS.calm,
    }));
    onConfirm({ path: selectedPath, segments, map: riverMap });
  }, [isPathComplete, selectedPath, riverMap, onConfirm]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10001,
      background: "rgba(0,0,0,0.92)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "monospace", color: "#d8c8a8",
    }}>
      {/* Title */}
      <div style={{
        fontSize: isMobile ? 18 : 24, fontWeight: "bold", color: "#ffd700",
        marginBottom: 8, textShadow: "2px 2px 0 #000",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <GameIcon name="compass" size={isMobile ? 20 : 28} />
        Mapa Rzeki — Wybierz Trasę
      </div>
      <div style={{
        fontSize: isMobile ? 10 : 12, color: "#8a7a6a", marginBottom: 12,
      }}>
        Kliknij węzły żeby wybrać swoją drogę. Każdy odcinek ma inne przeszkody i nagrody.
      </div>

      {/* Map + Info panel */}
      <div style={{
        display: "flex", gap: 16, alignItems: "flex-start",
        flexDirection: isMobile ? "column" : "row",
        maxWidth: "95vw",
      }}>
        {/* Map canvas */}
        <RiverMapCanvas
          riverMap={riverMap}
          selectedPath={selectedPath}
          currentNode={currentNode}
          onNodeClick={handleNodeClick}
          hasScout={hasScout}
        />

        {/* Side panel — path info */}
        <div style={{
          width: isMobile ? "100%" : 220,
          background: "rgba(10,20,30,0.9)", border: "1px solid #3a5070",
          borderRadius: 8, padding: 12,
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#c0b898", marginBottom: 8 }}>
            Wybrana Trasa
          </div>

          {/* Path nodes list */}
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
            {selectedPath.map((node, i) => {
              const typeDef = RIVER_NODE_TYPES[node.type];
              return (
                <div key={node.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "3px 0", fontSize: 11,
                  color: node.type === "end" ? "#40cc60" : typeDef.color,
                }}>
                  <span style={{ color: "#5a6a7a", width: 16 }}>{i + 1}.</span>
                  <GameIcon name={typeDef.icon} size={12} />
                  <span>{typeDef.name}</span>
                  {node.turn && node.turn !== "straight" && (
                    <span style={{ color: "rgba(100,150,200,0.5)", fontSize: 9, marginLeft: "auto" }}>
                      {node.turn.replace("_", " ")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Path summary */}
          {pathSummary && (
            <div style={{
              borderTop: "1px solid #2a3a4a", paddingTop: 8, marginTop: 4,
              fontSize: 11,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#8a7a6a" }}>Odcinki:</span>
                <span>{pathSummary.segments}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#cc4040" }}>Niebezpieczeństwo:</span>
                <span style={{ color: pathSummary.danger > 30 ? "#cc4040" : pathSummary.danger > 15 ? "#cca040" : "#40a040" }}>
                  {"▮".repeat(Math.min(10, Math.ceil(pathSummary.danger / 5)))}{"▯".repeat(Math.max(0, 10 - Math.ceil(pathSummary.danger / 5)))}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#d4a030" }}>Łup:</span>
                <span style={{ color: "#d4a030" }}>
                  {"▮".repeat(Math.min(10, Math.ceil(pathSummary.loot / 5)))}{"▯".repeat(Math.max(0, 10 - Math.ceil(pathSummary.loot / 5)))}
                </span>
              </div>
              {pathSummary.healing > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#40a060" }}>Leczenie:</span>
                  <span style={{ color: "#40a060" }}>+{pathSummary.healing}</span>
                </div>
              )}
            </div>
          )}

          {/* Legend for node types */}
          {hasScout && (
            <div style={{
              borderTop: "1px solid #2a3a4a", paddingTop: 8, marginTop: 8,
              fontSize: 10, color: "#5a6a7a",
            }}>
              <div style={{ marginBottom: 4, color: "#8a7a6a" }}>Legenda (Bocianowe Gniazdo):</div>
              {Object.entries(FORK_HINT_ICONS).slice(0, 6).map(([key, hint]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <GameIcon name={hint.icon} size={10} />
                  <span style={{ color: hint.color }}>{hint.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{
        display: "flex", gap: 12, marginTop: 16,
      }}>
        <button
          onClick={handleUndo}
          disabled={selectedPath.length <= 1}
          style={{
            background: selectedPath.length <= 1 ? "#2a2a2a" : "#4a3020",
            color: selectedPath.length <= 1 ? "#5a5a5a" : "#d8c8a8",
            border: "2px solid #5a4030", padding: "8px 20px",
            fontFamily: "monospace", fontSize: 14, cursor: selectedPath.length <= 1 ? "default" : "pointer",
            borderRadius: 4,
          }}
        >
          ← Cofnij
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isPathComplete}
          style={{
            background: isPathComplete ? "#2a5a20" : "#2a2a2a",
            color: isPathComplete ? "#d8f8a8" : "#5a5a5a",
            border: `2px solid ${isPathComplete ? "#40a030" : "#3a3a3a"}`,
            padding: "8px 28px",
            fontFamily: "monospace", fontSize: 14, fontWeight: "bold",
            cursor: isPathComplete ? "pointer" : "default",
            borderRadius: 4,
            boxShadow: isPathComplete ? "0 0 12px rgba(60,160,40,0.3)" : "none",
          }}
        >
          ⚓ Płyń!
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "#3a2020",
            color: "#d8a8a8",
            border: "2px solid #5a3030", padding: "8px 20px",
            fontFamily: "monospace", fontSize: 14, cursor: "pointer",
            borderRadius: 4,
          }}
        >
          ✕ Anuluj
        </button>
      </div>
      {/* Quick travel — skip mini-game */}
      {onSkip && (
        <button
          onClick={onSkip}
          title="Pomiń żeglugę i dotrzyj natychmiast (mniejsza nagroda)"
          style={{
            marginTop: 10, background: "none",
            color: "#8a7a6a", border: "1px solid #3a3a3a",
            padding: "5px 16px", fontFamily: "monospace", fontSize: 12,
            cursor: "pointer", borderRadius: 4,
            transition: "color 0.2s, border-color 0.2s",
          }}
          onMouseEnter={e => { e.target.style.color = "#ffd700"; e.target.style.borderColor = "#8a6a20"; }}
          onMouseLeave={e => { e.target.style.color = "#8a7a6a"; e.target.style.borderColor = "#3a3a3a"; }}
        >
          <GameIcon name="feather" size={12} /> Szybka Podróż (mniejsza nagroda)
        </button>
      )}
    </div>
  );
}

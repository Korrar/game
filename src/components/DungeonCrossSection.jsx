// DungeonCrossSection — Side-view visualization of dungeon levels
// Shows layered structure with stairs connections, current position, and boss indicator
// Displayed when entering a dungeon or via dungeon HUD

import React from "react";

const LAYER_HEIGHT = 64;
const LAYER_GAP = 8;
const MARGIN = 24;
const WIDTH = 340;

// Visual styles per dungeon type
const TYPE_STYLES = {
  mine: { wallColor: "#5a4a30", dirtColors: ["#8a7a60", "#6a5a40", "#4a3a28"], stoneColor: "#6a6050" },
  crypt: { wallColor: "#3a2a40", dirtColors: ["#5a4a60", "#3a2a40", "#2a1a30"], stoneColor: "#4a3a50" },
  cave: { wallColor: "#2a4a4a", dirtColors: ["#3a6a5a", "#2a5a4a", "#1a3a3a"], stoneColor: "#3a5a5a" },
  ruins: { wallColor: "#4a4838", dirtColors: ["#6a6850", "#4a4838", "#3a3828"], stoneColor: "#5a5848" },
};

export default function DungeonCrossSection({ dungeonState, onSelectLevel, onClose }) {
  if (!dungeonState) return null;

  const { levels, currentLevel, dungeonType, dungeonName, maxLevels } = dungeonState;
  const style = TYPE_STYLES[dungeonType] || TYPE_STYLES.mine;
  const totalHeight = maxLevels * (LAYER_HEIGHT + LAYER_GAP) + MARGIN * 2 + 40;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.75)", zIndex: 9000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#1a1510", border: "2px solid #8a7a50",
        borderRadius: 12, padding: 16, minWidth: WIDTH, maxWidth: 400,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ color: "#ffd700", fontSize: 16, fontWeight: "bold" }}>
            {dungeonName}
          </div>
          <div style={{ color: "#a09070", fontSize: 11, marginTop: 2 }}>
            Widok Przekrojowy — {maxLevels} poziomów
          </div>
        </div>

        {/* Cross-section canvas */}
        <div style={{ position: "relative", height: totalHeight, width: WIDTH }}>
          {/* Surface layer */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 32,
            background: "linear-gradient(180deg, #4a8a30 0%, #3a6a20 100%)",
            borderRadius: "6px 6px 0 0",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#c0e0a0", fontSize: 11, fontWeight: "bold",
          }}>
            ☀ Powierzchnia
          </div>

          {/* Connection shaft from surface */}
          <div style={{
            position: "absolute", top: 32, left: WIDTH / 2 - 8, width: 16,
            height: MARGIN - 8,
            background: `repeating-linear-gradient(180deg, ${style.wallColor} 0px, ${style.stoneColor} 4px, ${style.wallColor} 8px)`,
            borderLeft: `2px solid ${style.stoneColor}`,
            borderRight: `2px solid ${style.stoneColor}`,
          }} />

          {/* Dungeon levels */}
          {levels.map((levelData, idx) => {
            const y = 32 + MARGIN + idx * (LAYER_HEIGHT + LAYER_GAP);
            const isCurrent = idx === currentLevel;
            const isDiscovered = levelData.discovered;
            const isCleared = levelData.cleared;
            const isBoss = levelData.bossLevel;
            const dirtColor = style.dirtColors[Math.min(idx, style.dirtColors.length - 1)];

            return (
              <React.Fragment key={idx}>
                {/* Level block */}
                <div
                  onClick={() => isDiscovered && onSelectLevel?.(idx)}
                  style={{
                    position: "absolute",
                    top: y,
                    left: 16,
                    right: 16,
                    height: LAYER_HEIGHT,
                    background: isDiscovered
                      ? `linear-gradient(180deg, ${dirtColor} 0%, ${darken(dirtColor, 20)} 100%)`
                      : "#1a1a1a",
                    border: isCurrent
                      ? "2px solid #ffd700"
                      : isDiscovered
                        ? `1px solid ${style.stoneColor}`
                        : "1px solid #333",
                    borderRadius: 6,
                    cursor: isDiscovered ? "pointer" : "default",
                    opacity: isDiscovered ? 1 : 0.5,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "0 12px",
                    transition: "border-color 0.3s",
                    boxShadow: isCurrent ? "0 0 12px rgba(255,215,0,0.3)" : "none",
                  }}
                >
                  {/* Level header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>
                      {isBoss ? "💀" : isCleared ? "✅" : isDiscovered ? "⚔️" : "❓"}
                    </span>
                    <div>
                      <div style={{
                        color: isCurrent ? "#ffd700" : "#c0b090",
                        fontSize: 13,
                        fontWeight: isCurrent ? "bold" : "normal",
                      }}>
                        Poziom {idx + 1}
                        {isBoss && <span style={{ color: "#ff4444", marginLeft: 6 }}>BOSS</span>}
                      </div>
                      <div style={{ color: "#807060", fontSize: 10 }}>
                        {!isDiscovered ? "Nieodkryty"
                          : isCleared ? "Oczyszczony"
                          : isCurrent ? "Jesteś tutaj"
                          : "Odkryty"}
                      </div>
                    </div>
                    {/* Caravan indicator */}
                    {isCurrent && (
                      <div style={{
                        marginLeft: "auto",
                        background: "#ffd700",
                        color: "#1a1510",
                        fontSize: 10,
                        fontWeight: "bold",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}>
                        KARAWANA
                      </div>
                    )}
                  </div>
                </div>

                {/* Shaft between levels */}
                {idx < levels.length - 1 && (
                  <div style={{
                    position: "absolute",
                    top: y + LAYER_HEIGHT,
                    left: levelData.stairs.down
                      ? 16 + (levelData.stairs.down.col / dungeonState.mapSize) * (WIDTH - 32)
                      : WIDTH / 2 - 8,
                    width: 16,
                    height: LAYER_GAP,
                    background: `repeating-linear-gradient(180deg, ${style.wallColor} 0px, ${style.stoneColor} 3px, ${style.wallColor} 6px)`,
                    borderLeft: `1px solid ${style.stoneColor}`,
                    borderRight: `1px solid ${style.stoneColor}`,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 8,
          color: "#807060", fontSize: 10,
        }}>
          Kliknij odkryty poziom, aby zobaczyć szczegóły
        </div>

        {/* Close button */}
        <div
          onClick={onClose}
          style={{
            textAlign: "center", marginTop: 8,
            color: "#c0a060", fontSize: 12, cursor: "pointer",
            padding: "6px 16px", border: "1px solid #c0a060",
            borderRadius: 6, display: "inline-block",
            margin: "8px auto 0", width: "fit-content",
          }}
        >
          Zamknij
        </div>
      </div>
    </div>
  );
}

// Darken a hex color by amount (0-255)
function darken(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

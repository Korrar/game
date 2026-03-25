// DungeonHUD — Overlay showing current dungeon level, progress, and minimap toggle
// Displayed at top of screen when player is inside a dungeon

import React from "react";

export default function DungeonHUD({ dungeonState, onShowCrossSection }) {
  if (!dungeonState) return null;

  const { dungeonName, dungeonIcon, currentLevel, maxLevels, levels, dungeonType } = dungeonState;
  const currentLevelData = levels[currentLevel];
  const levelsCleared = levels.filter(l => l.cleared).length;
  const isBossLevel = currentLevelData?.bossLevel;

  // Dungeon type colors
  const typeColors = {
    mine: { bg: "#3a2a18", border: "#8a7a50", text: "#ffd080" },
    crypt: { bg: "#2a1a30", border: "#8a5aaa", text: "#cc99ff" },
    cave: { bg: "#1a2a30", border: "#4a8a8a", text: "#80cccc" },
    ruins: { bg: "#2a2818", border: "#8a8050", text: "#ccc088" },
  };
  const colors = typeColors[dungeonType] || typeColors.mine;

  // Dungeon type icons
  const typeIcons = {
    mine: "⛏",
    crypt: "💀",
    cave: "🌊",
    ruins: "🏛",
  };

  return (
    <div style={{
      position: "fixed",
      top: 48,
      left: 8,
      zIndex: 7000,
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      {/* Main dungeon info bar */}
      <div style={{
        background: `${colors.bg}ee`,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
      }}>
        {/* Icon */}
        <span style={{ fontSize: 18 }}>{typeIcons[dungeonType] || "🏴"}</span>

        {/* Name and level */}
        <div>
          <div style={{
            color: colors.text,
            fontSize: 12,
            fontWeight: "bold",
          }}>
            {dungeonName}
          </div>
          <div style={{
            color: "#a09070",
            fontSize: 10,
          }}>
            Poziom {currentLevel + 1}/{maxLevels}
            {isBossLevel && <span style={{ color: "#ff4444", marginLeft: 4 }}>★ BOSS</span>}
          </div>
        </div>

        {/* Level progress dots */}
        <div style={{
          display: "flex",
          gap: 3,
          marginLeft: 8,
        }}>
          {levels.map((l, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === currentLevel
                  ? "#ffd700"
                  : l.cleared
                    ? "#44ff44"
                    : l.discovered
                      ? "#888"
                      : "#333",
                border: l.bossLevel ? "1px solid #ff4444" : "1px solid #555",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Cross-section button */}
        <div
          onClick={onShowCrossSection}
          style={{
            marginLeft: 8,
            width: 24,
            height: 24,
            borderRadius: 4,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid #666",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 14,
            color: "#c0b090",
          }}
          title="Pokaż widok przekrojowy"
        >
          ≡
        </div>
      </div>

      {/* Level status */}
      {currentLevelData && !currentLevelData.cleared && (
        <div style={{
          background: "rgba(30,20,10,0.85)",
          border: "1px solid #555",
          borderRadius: 6,
          padding: "3px 10px",
          color: isBossLevel ? "#ff6644" : "#c0a060",
          fontSize: 10,
          textAlign: "center",
        }}>
          {isBossLevel
            ? "⚠ Arena Bossa — punkt bez powrotu!"
            : `Wrogowie na tym piętrze • Oświetlenie: ${Math.round((currentLevelData.config?.ambientLight || 0.5) * 100)}%`
          }
        </div>
      )}

      {/* Cleared indicator */}
      {currentLevelData?.cleared && (
        <div style={{
          background: "rgba(20,40,20,0.85)",
          border: "1px solid #4a8a4a",
          borderRadius: 6,
          padding: "3px 10px",
          color: "#88cc88",
          fontSize: 10,
          textAlign: "center",
        }}>
          ✓ Piętro oczyszczone — {levelsCleared}/{maxLevels}
        </div>
      )}
    </div>
  );
}

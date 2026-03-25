// StairsPrompt — Interaction prompt when caravan is near stairs/exit
// Shows directional arrow, level info, and action button

import React from "react";

export default function StairsPrompt({ interaction, dungeonState, onConfirm, onCancel }) {
  if (!interaction || !dungeonState) return null;

  const { type, targetLevel } = interaction;

  let title, desc, icon, color, buttonText;

  if (type === "descend") {
    const targetData = dungeonState.levels[targetLevel];
    const isFirstVisit = !targetData?.discovered;
    const isBoss = targetData?.bossLevel;
    title = "Zejść na niższy poziom?";
    desc = isFirstVisit
      ? `Poziom ${targetLevel + 1} — Nieznane zagrożenia czekają w głębinach${isBoss ? " (BOSS!)" : ""}`
      : `Poziom ${targetLevel + 1} — ${targetData.cleared ? "Oczyszczony" : "Wrogowie wciąż czyhają"}`;
    icon = "▼";
    color = "#ff6644";
    buttonText = "Zejdź w dół";
  } else if (type === "ascend") {
    title = "Wejść na wyższy poziom?";
    desc = `Powrót na Poziom ${targetLevel + 1}`;
    icon = "▲";
    color = "#44aaff";
    buttonText = "Wejdź w górę";
  } else if (type === "exit_dungeon") {
    title = "Opuścić dungeon?";
    desc = "Powrót na powierzchnię — postęp w dungeonie zostanie zachowany";
    icon = "★";
    color = "#44ff88";
    buttonText = "Wyjdź na powierzchnię";
  }

  return (
    <div style={{
      position: "fixed",
      bottom: 120,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 8000,
      background: "rgba(20,15,10,0.92)",
      border: `2px solid ${color}`,
      borderRadius: 12,
      padding: "12px 20px",
      minWidth: 280,
      maxWidth: 380,
      boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 15px ${color}40`,
      textAlign: "center",
      animation: "stairsPromptPulse 2s ease-in-out infinite",
    }}>
      {/* Icon */}
      <div style={{
        fontSize: 28,
        color,
        marginBottom: 4,
        textShadow: `0 0 10px ${color}`,
      }}>
        {icon}
      </div>

      {/* Title */}
      <div style={{
        color: "#f0e0c0",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 4,
      }}>
        {title}
      </div>

      {/* Description */}
      <div style={{
        color: "#a09070",
        fontSize: 11,
        marginBottom: 10,
      }}>
        {desc}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button
          onClick={onConfirm}
          style={{
            background: color,
            color: "#1a1510",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {buttonText}
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            color: "#a09070",
            border: "1px solid #a09070",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Anuluj
        </button>
      </div>

      <style>{`
        @keyframes stairsPromptPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 15px ${color}40; }
          50% { box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 25px ${color}60; }
        }
      `}</style>
    </div>
  );
}

import { useState } from "react";
import { getIconUrl } from "../rendering/icons";

export default function LevelUpPicker({ choices, onSelect, playerLevel, isMobile }) {
  const [hovered, setHovered] = useState(null);

  if (!choices || choices.length === 0) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 210,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "eventAppear 0.4s ease-out",
      padding: isMobile ? "8px 6px" : 0,
    }}>
      <div style={{
        fontSize: isMobile ? 18 : 24, fontWeight: "bold", marginBottom: 4,
        background: "linear-gradient(90deg, #40e060, #80ff80, #40e060)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite",
        letterSpacing: 3,
      }}>
        AWANS! POZIOM {playerLevel}
      </div>
      <div style={{ fontSize: isMobile ? 11 : 13, color: "#777", marginBottom: isMobile ? 10 : 22 }}>
        Wybierz ulepszenie dla swojej drużyny
      </div>

      <div style={{ display: "flex", gap: isMobile ? 6 : 20, flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: "center", maxWidth: isMobile ? "100%" : "none" }}>
        {choices.map((perk, i) => {
          const isHov = hovered === i;
          const color = perk.color || "#40e060";
          return (
            <div
              key={perk.id + i}
              onClick={() => onSelect(perk)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: isMobile ? 140 : 180, padding: isMobile ? "12px 8px" : "22px 16px", cursor: "pointer",
                background: "linear-gradient(180deg, rgba(14,8,10,0.97), rgba(8,4,6,0.97))",
                border: `2px solid ${isHov ? color : color + "80"}`,
                borderRadius: 10,
                boxShadow: isHov
                  ? `0 0 30px ${color}66, 0 0 60px ${color}22, inset 0 0 20px ${color}18`
                  : `0 0 10px ${color}33, inset 0 0 12px rgba(0,0,0,0.5)`,
                transform: isHov ? "scale(1.08) translateY(-4px)" : "scale(1)",
                transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 4 : 8,
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
              <div style={{ filter: `drop-shadow(0 0 10px ${color}88)`, zIndex: 1 }}>
                {getIconUrl(perk.icon, isMobile ? 32 : 44) ? <img src={getIconUrl(perk.icon, isMobile ? 32 : 44)} width={isMobile ? 32 : 44} height={isMobile ? 32 : 44} alt="" /> : null}
              </div>
              <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: "bold", color, zIndex: 1, textShadow: `0 0 8px ${color}44` }}>
                {perk.name}
              </div>
              <div style={{ fontSize: isMobile ? 10 : 12, color: "#a09888", lineHeight: 1.5, zIndex: 1 }}>
                {perk.desc}
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

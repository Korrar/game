import { useState } from "react";
import { RELIC_RARITY_COLOR } from "../data/relics";
import { getIconUrl } from "../rendering/icons";

const RARITY_LABEL = { common: "Zwykły", rare: "Rzadki", epic: "Epicki" };

export default function RelicPicker({ choices, onSelect, isMobile }) {
  const [hovered, setHovered] = useState(null);

  if (!choices || choices.length === 0) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "eventAppear 0.4s ease-out",
      padding: isMobile ? "8px 6px" : 0,
    }}>
      <div style={{
        fontSize: isMobile ? 18 : 24, fontWeight: "bold", marginBottom: 6,
        background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite",
        letterSpacing: 3, textShadow: "none",
      }}>
        WYBIERZ RELIKT
      </div>
      <div style={{ fontSize: isMobile ? 11 : 13, color: "#777", marginBottom: isMobile ? 10 : 22 }}>
        Kliknij kartę, aby aktywować pasywny bonus
      </div>

      <div style={{ display: "flex", gap: isMobile ? 6 : 20, flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: "center", maxWidth: isMobile ? "100%" : "none" }}>
        {choices.map((relic, i) => {
          const color = RELIC_RARITY_COLOR[relic.rarity] || "#888";
          const isHov = hovered === i;
          const isEpic = relic.rarity === "epic";
          return (
            <div
              key={relic.id}
              onClick={() => onSelect(relic)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: isMobile ? 140 : 190, padding: isMobile ? "12px 8px" : "22px 16px", cursor: "pointer",
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
              {/* Top accent line */}
              <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
              {/* Corner gems */}
              <div style={{ position: "absolute", top: 4, left: 6, fontSize: 7, color, opacity: 0.6 }}>◆</div>
              <div style={{ position: "absolute", top: 4, right: 6, fontSize: 7, color, opacity: 0.6 }}>◆</div>

              {/* Epic shimmer overlay */}
              {isEpic && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: `linear-gradient(135deg, transparent 30%, ${color}08 50%, transparent 70%)`,
                  backgroundSize: "200% 200%", animation: "shimmer 3s ease-in-out infinite",
                  pointerEvents: "none", borderRadius: 8,
                }} />
              )}

              <div style={{ filter: `drop-shadow(0 0 10px ${color}88)`, zIndex: 1 }}>
                {getIconUrl(relic.icon, isMobile ? 32 : 44) ? <img src={getIconUrl(relic.icon, isMobile ? 32 : 44)} width={isMobile ? 32 : 44} height={isMobile ? 32 : 44} alt="" /> : null}
              </div>
              <div style={{
                fontSize: isMobile ? 13 : 16, fontWeight: "bold", color, zIndex: 1,
                textShadow: `0 0 8px ${color}44`,
              }}>
                {relic.name}
              </div>
              <div style={{
                fontSize: isMobile ? 9 : 10, color, textTransform: "uppercase",
                letterSpacing: 3, fontWeight: "bold", opacity: 0.7, zIndex: 1,
              }}>
                ◆ {RARITY_LABEL[relic.rarity] || relic.rarity} ◆
              </div>
              <div style={{
                fontSize: isMobile ? 10 : 12, color: "#a09888", lineHeight: 1.5, marginTop: isMobile ? 2 : 4, zIndex: 1,
              }}>
                {relic.desc}
              </div>

              {/* Bottom accent */}
              <div style={{ position: "absolute", bottom: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

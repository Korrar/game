import { useState } from "react";
import { RELIC_RARITY_COLOR } from "../data/relics";

const RARITY_LABEL = { common: "Zwykły", rare: "Rzadki", epic: "Epicki" };

export default function RelicPicker({ choices, onSelect }) {
  const [hovered, setHovered] = useState(null);

  if (!choices || choices.length === 0) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.82)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "eventAppear 0.4s ease-out",
    }}>
      <div style={{
        fontSize: 22, color: "#d4a030", fontWeight: "bold", marginBottom: 6,
        textShadow: "0 0 12px rgba(200,150,50,0.5)", letterSpacing: 2,
      }}>
        WYBIERZ RELIKT
      </div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Kliknij kartę, aby aktywować pasywny bonus
      </div>

      <div style={{ display: "flex", gap: 18 }}>
        {choices.map((relic, i) => {
          const color = RELIC_RARITY_COLOR[relic.rarity] || "#888";
          const isHov = hovered === i;
          return (
            <div
              key={relic.id}
              onClick={() => onSelect(relic)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 180, padding: "20px 14px", cursor: "pointer",
                background: "rgba(14,8,10,0.95)",
                border: `2px solid ${color}`,
                borderRadius: 10,
                boxShadow: isHov
                  ? `0 0 24px ${color}88, inset 0 0 20px ${color}22`
                  : `0 0 8px ${color}44, inset 0 0 10px rgba(0,0,0,0.4)`,
                transform: isHov ? "scale(1.07)" : "scale(1)",
                transition: "transform 0.18s, box-shadow 0.18s",
                textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              }}
            >
              <div style={{ fontSize: 40, filter: `drop-shadow(0 0 8px ${color}88)` }}>
                {relic.emoji}
              </div>
              <div style={{ fontSize: 15, fontWeight: "bold", color: color }}>
                {relic.name}
              </div>
              <div style={{
                fontSize: 10, color: color, textTransform: "uppercase",
                letterSpacing: 2, fontWeight: "bold", opacity: 0.8,
              }}>
                {RARITY_LABEL[relic.rarity] || relic.rarity}
              </div>
              <div style={{
                fontSize: 12, color: "#a09888", lineHeight: 1.4, marginTop: 4,
              }}>
                {relic.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

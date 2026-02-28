import { useState } from "react";
import { getIconUrl } from "../rendering/icons";
import { SPELL_ICON_MAP } from "../rendering/icons";

export default function SpellUpgradePicker({ choices, onSelect }) {
  const [hovered, setHovered] = useState(null);

  if (!choices || choices.length === 0) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 205,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "eventAppear 0.4s ease-out",
    }}>
      <div style={{
        fontSize: 24, fontWeight: "bold", marginBottom: 4,
        background: "linear-gradient(90deg, #60c0ff, #a0e0ff, #60c0ff)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite",
        letterSpacing: 3,
      }}>
        ULEPSZENIE AKCJI
      </div>
      <div style={{ fontSize: 13, color: "#777", marginBottom: 22 }}>
        Wybierz ulepszenie dla jednej z akcji
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {choices.map((choice, i) => {
          const isHov = hovered === i;
          const spellColor = choice.spell.color || "#aaa";
          const upColor = choice.upgrade.color || "#aaa";
          return (
            <div
              key={choice.spellId + choice.upgrade.id + i}
              onClick={() => onSelect(choice)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 190, padding: "22px 16px", cursor: "pointer",
                background: "linear-gradient(180deg, rgba(14,8,10,0.97), rgba(8,4,6,0.97))",
                border: `2px solid ${isHov ? upColor : upColor + "80"}`,
                borderRadius: 10,
                boxShadow: isHov
                  ? `0 0 30px ${upColor}66, 0 0 60px ${upColor}22, inset 0 0 20px ${upColor}18`
                  : `0 0 10px ${upColor}33, inset 0 0 12px rgba(0,0,0,0.5)`,
                transform: isHov ? "scale(1.08) translateY(-4px)" : "scale(1)",
                transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${upColor}60, transparent)` }} />
              {/* Spell icon */}
              <div style={{ filter: `drop-shadow(0 0 8px ${spellColor}88)`, zIndex: 1 }}>
                {SPELL_ICON_MAP[choice.spell.id] && getIconUrl(SPELL_ICON_MAP[choice.spell.id], 36)
                  ? <img src={getIconUrl(SPELL_ICON_MAP[choice.spell.id], 36)} width={36} height={36} alt="" />
                  : <span style={{ fontSize: 32 }}>{choice.spell.icon}</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: "bold", color: spellColor, zIndex: 1 }}>{choice.spell.name}</div>
              {/* Upgrade info */}
              <div style={{
                padding: "6px 10px", borderRadius: 6,
                background: `${upColor}12`, border: `1px solid ${upColor}40`,
                width: "100%",
              }}>
                <div style={{ filter: `drop-shadow(0 0 6px ${upColor}88)` }}>
                  {getIconUrl(choice.upgrade.icon, 24) ? <img src={getIconUrl(choice.upgrade.icon, 24)} width={24} height={24} alt="" /> : null}
                </div>
                <div style={{ fontSize: 13, fontWeight: "bold", color: upColor }}>{choice.upgrade.name}</div>
                <div style={{ fontSize: 11, color: "#a09888" }}>{choice.upgrade.desc}</div>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${upColor}40, transparent)` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

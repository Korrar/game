import { useState, useEffect, useRef } from "react";
import { RELIC_RARITY_COLOR } from "../data/relics";
import { getIconUrl } from "../rendering/icons";

const RARITY_LABEL = {
  common: "Zwykły",
  rare: "Rzadki",
  epic: "Epicki",
  legendary: "Legendarny",
};

// Rarity tier ordering for visual emphasis
const RARITY_TIER = { common: 0, rare: 1, epic: 2, legendary: 3 };

// Rarity-specific icon background colors
const RARITY_BG = {
  common:    "rgba(80,80,80,0.25)",
  rare:      "rgba(40,140,160,0.25)",
  epic:      "rgba(130,50,200,0.28)",
  legendary: "rgba(200,150,0,0.30)",
};

// Orbiting sparkle counts per rarity
const SPARKLE_COUNT = { common: 0, rare: 0, epic: 4, legendary: 6 };

// Small CSS-based sparkles rendered as absolutely positioned divs
function RelicSparkles({ color, count }) {
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const delay = (i / count) * 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              width: 4, height: 4,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 6px ${color}`,
              animation: `relicOrbit 3s ${delay}s linear infinite`,
              transformOrigin: "0 0",
              marginLeft: -2, marginTop: -2,
              pointerEvents: "none",
              "--orbit-angle": `${angle}deg`,
            }}
          />
        );
      })}
    </>
  );
}

export default function RelicPicker({ choices, onSelect, isMobile }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  if (!choices || choices.length === 0) return null;

  function handleSelect(relic, i) {
    setSelected(i);
    setTimeout(() => onSelect(relic), 350);
  }

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.88)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "eventAppear 0.4s ease-out",
      padding: isMobile ? "8px 6px" : 0,
    }}>
      {/* Inject CSS animations */}
      <style>{`
        @keyframes relicOrbit {
          from { transform: rotate(calc(var(--orbit-angle) + 0deg)) translateX(52px) rotate(0deg); }
          to   { transform: rotate(calc(var(--orbit-angle) + 360deg)) translateX(52px) rotate(-360deg); }
        }
        @keyframes legendaryPulse {
          0%, 100% { box-shadow: 0 0 30px #ffd70088, 0 0 80px #ffd70022, inset 0 0 25px #ffd70018; }
          50%       { box-shadow: 0 0 50px #ffd700cc, 0 0 100px #ffd70044, inset 0 0 35px #ffd70030; }
        }
        @keyframes epicPulse {
          0%, 100% { box-shadow: 0 0 22px #a050e088, 0 0 55px #a050e022, inset 0 0 18px #a050e018; }
          50%       { box-shadow: 0 0 38px #a050e0cc, 0 0 75px #a050e044, inset 0 0 28px #a050e030; }
        }
        @keyframes relicAcquire {
          0%   { transform: scale(1); filter: brightness(1); }
          40%  { transform: scale(1.15); filter: brightness(2); }
          100% { transform: scale(0.9); filter: brightness(0.5); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

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

      <div style={{
        display: "flex", gap: isMobile ? 6 : 22,
        flexWrap: isMobile ? "wrap" : "nowrap",
        justifyContent: "center",
        maxWidth: isMobile ? "100%" : "none",
      }}>
        {choices.map((relic, i) => {
          const color = RELIC_RARITY_COLOR[relic.rarity] || "#888";
          const isHov = hovered === i;
          const isSel = selected === i;
          const tier = RARITY_TIER[relic.rarity] || 0;
          const isLegendary = relic.rarity === "legendary";
          const isEpic = relic.rarity === "epic";
          const sparkleCount = SPARKLE_COUNT[relic.rarity] || 0;

          // Rarity-specific animation
          let animationStyle = {};
          if (isLegendary && isHov) animationStyle = { animation: "legendaryPulse 1.5s ease-in-out infinite" };
          else if (isEpic && isHov) animationStyle = { animation: "epicPulse 2s ease-in-out infinite" };

          return (
            <div
              key={relic.id}
              onClick={() => handleSelect(relic, i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: isMobile ? 140 : (isLegendary ? 210 : 195),
                padding: isMobile ? "12px 8px" : isLegendary ? "26px 18px" : "22px 16px",
                cursor: "pointer",
                background: isLegendary
                  ? "linear-gradient(160deg, rgba(30,18,0,0.98), rgba(18,10,0,0.98))"
                  : "linear-gradient(180deg, rgba(14,8,10,0.97), rgba(8,4,6,0.97))",
                border: `${isLegendary ? 2.5 : 2}px solid ${isHov ? color : color + (tier > 0 ? "90" : "55")}`,
                borderRadius: isLegendary ? 14 : 10,
                boxShadow: isHov
                  ? `0 0 30px ${color}77, 0 0 65px ${color}22, inset 0 0 22px ${color}18`
                  : `0 0 ${6 + tier * 4}px ${color}${tier > 1 ? "44" : "22"}, inset 0 0 12px rgba(0,0,0,0.5)`,
                transform: isSel
                  ? "scale(0.95)"
                  : isHov ? "scale(1.08) translateY(-5px)" : "scale(1)",
                transition: "transform 0.2s, box-shadow 0.25s, border-color 0.2s",
                textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: isMobile ? 4 : 8,
                position: "relative", overflow: "hidden",
                animation: isSel ? "relicAcquire 0.35s ease-out forwards" : undefined,
                ...animationStyle,
              }}
            >
              {/* Top accent line */}
              <div style={{ position: "absolute", top: 0, left: 12, right: 12, height: isLegendary ? 2 : 1, background: `linear-gradient(90deg, transparent, ${color}70, transparent)` }} />

              {/* Corner gems */}
              <div style={{ position: "absolute", top: 4, left: 6, fontSize: isLegendary ? 9 : 7, color, opacity: isLegendary ? 0.9 : 0.6 }}>◆</div>
              <div style={{ position: "absolute", top: 4, right: 6, fontSize: isLegendary ? 9 : 7, color, opacity: isLegendary ? 0.9 : 0.6 }}>◆</div>
              {isLegendary && <>
                <div style={{ position: "absolute", bottom: 4, left: 6, fontSize: 9, color, opacity: 0.9 }}>◆</div>
                <div style={{ position: "absolute", bottom: 4, right: 6, fontSize: 9, color, opacity: 0.9 }}>◆</div>
              </>}

              {/* Shimmer overlay for epic/legendary */}
              {tier >= 2 && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: `linear-gradient(135deg, transparent 30%, ${color}${isLegendary ? "12" : "09"} 50%, transparent 70%)`,
                  backgroundSize: "200% 200%", animation: "shimmer 2.5s ease-in-out infinite",
                  pointerEvents: "none", borderRadius: isLegendary ? 12 : 8,
                }} />
              )}

              {/* Orbiting sparkles */}
              <RelicSparkles color={color} count={isMobile ? 0 : sparkleCount} />

              {/* Icon container with rarity background */}
              <div style={{
                width: isMobile ? 40 : isLegendary ? 60 : 52,
                height: isMobile ? 40 : isLegendary ? 60 : 52,
                borderRadius: "50%",
                background: RARITY_BG[relic.rarity] || "transparent",
                border: `1px solid ${color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                filter: `drop-shadow(0 0 ${isLegendary ? 14 : 8}px ${color}${isHov ? "cc" : "66"})`,
                transition: "filter 0.2s",
                zIndex: 1,
                boxShadow: isLegendary ? `0 0 20px ${color}30, inset 0 0 12px ${color}15` : undefined,
              }}>
                {getIconUrl(relic.icon, isMobile ? 26 : isLegendary ? 36 : 30) ?
                  <img
                    src={getIconUrl(relic.icon, isMobile ? 26 : isLegendary ? 36 : 30)}
                    width={isMobile ? 26 : isLegendary ? 36 : 30}
                    height={isMobile ? 26 : isLegendary ? 36 : 30}
                    alt=""
                  /> : null}
              </div>

              {/* Name */}
              <div style={{
                fontSize: isMobile ? 13 : isLegendary ? 18 : 16,
                fontWeight: "bold", color, zIndex: 1,
                textShadow: isLegendary
                  ? `0 0 12px ${color}88, 0 1px 2px #000`
                  : `0 0 8px ${color}44`,
              }}>
                {relic.name}
              </div>

              {/* Rarity badge */}
              <div style={{
                fontSize: isMobile ? 9 : isLegendary ? 11 : 10,
                color,
                textTransform: "uppercase",
                letterSpacing: isLegendary ? 4 : 3,
                fontWeight: "bold",
                opacity: 0.85,
                zIndex: 1,
                padding: isLegendary ? "2px 8px" : "1px 6px",
                border: `1px solid ${color}50`,
                borderRadius: 3,
                background: `${color}12`,
              }}>
                {isLegendary ? "★ " : "◆ "}{RARITY_LABEL[relic.rarity] || relic.rarity}{isLegendary ? " ★" : " ◆"}
              </div>

              {/* Description */}
              <div style={{
                fontSize: isMobile ? 10 : 12, color: "#b0a898", lineHeight: 1.5,
                marginTop: isMobile ? 2 : 4, zIndex: 1,
              }}>
                {relic.desc}
              </div>

              {/* Bottom accent */}
              <div style={{ position: "absolute", bottom: 0, left: 12, right: 12, height: 1, background: `linear-gradient(90deg, transparent, ${color}45, transparent)` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

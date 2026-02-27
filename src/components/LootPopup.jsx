import { RARITY_C, RARITY_L } from "../data/treasures";
import { formatValHTML } from "../utils/helpers";

const RARITY_GLOW = {
  common: "rgba(136,136,136,0.15)", uncommon: "rgba(80,168,80,0.25)",
  rare: "rgba(64,168,184,0.35)", epic: "rgba(160,80,224,0.4)", legendary: "rgba(212,160,48,0.5)",
};

export default function LootPopup({ loot, onClose }) {
  if (!loot) return null;
  const rc = RARITY_C[loot.rarity];
  const glow = RARITY_GLOW[loot.rarity] || RARITY_GLOW.common;
  const isLeg = loot.rarity === "legendary";

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        padding: "32px 40px", textAlign: "center",
        background: "linear-gradient(180deg, #0e0808, #080406)",
        border: `2px solid ${rc}`, borderRadius: 6, minWidth: 300, position: "relative",
        boxShadow: `inset 0 0 20px rgba(0,0,0,0.5), 0 0 30px ${glow}, 0 4px 20px rgba(0,0,0,0.7)`,
        animation: `rarityGlow-${loot.rarity} 2.5s ease-in-out infinite`,
      }}>
        {/* Shimmer overlay for legendary */}
        {isLeg && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 5, overflow: "hidden", background: "linear-gradient(105deg, transparent 40%, rgba(255,224,128,0.08) 45%, rgba(255,224,128,0.15) 50%, rgba(255,224,128,0.08) 55%, transparent 60%)", backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite" }} />}
        <div style={{ fontSize: 60, filter: `drop-shadow(0 0 12px ${glow})`, position: "relative", zIndex: 1 }}>{loot.icon}</div>
        <div style={{
          fontWeight: "bold", fontSize: 20, color: rc, marginBottom: 4, position: "relative", zIndex: 1,
          textShadow: `0 0 12px ${glow}`,
          ...(isLeg ? { background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite" } : {}),
        }}>{loot.name}</div>
        <div style={{ fontSize: 16, color: "#888", position: "relative", zIndex: 1 }}>{loot.desc}</div>
        <div style={{ fontSize: 15, color: rc, marginTop: 4, letterSpacing: 2, position: "relative", zIndex: 1 }}>◆ {RARITY_L[loot.rarity]} ◆</div>
        <div style={{ fontSize: 14, color: "#777", marginTop: 6, position: "relative", zIndex: 1 }}>Wartość: {formatValHTML(loot.value)}</div>
        <button onClick={onClose} style={{
          marginTop: 14, background: "linear-gradient(180deg, rgba(40,25,10,0.9), rgba(20,12,6,0.9))",
          border: `1px solid ${rc}66`, color: rc, fontWeight: "bold", fontSize: 16, padding: "6px 24px",
          cursor: "pointer", borderRadius: 4, position: "relative", zIndex: 1,
        }}>Dobrze</button>
      </div>
    </div>
  );
}

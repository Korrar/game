import { RARITY_C, RARITY_L } from "../data/treasures";
import { formatValHTML } from "../utils/helpers";

export default function ItemDetail({ item, onSell, onStore, canStore }) {
  if (!item) return null;
  const rc = RARITY_C[item.rarity];
  const isLeg = item.rarity === "legendary";

  return (
    <div style={{
      marginTop: 12, padding: 14, border: `2px solid ${rc}44`, borderRadius: 6,
      background: "linear-gradient(180deg, rgba(14,8,8,0.95), rgba(8,4,6,0.95))",
      textAlign: "center", position: "relative",
      boxShadow: `inset 0 0 15px rgba(0,0,0,0.4), 0 0 12px ${rc}22`,
    }}>
      <div style={{ fontSize: 44, filter: `drop-shadow(0 0 8px ${rc}44)` }}>{item.icon}</div>
      <div style={{
        fontWeight: "bold", fontSize: 17, color: rc,
        textShadow: `0 0 8px ${rc}44`,
        ...(isLeg ? { background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite" } : {}),
      }}>{item.name}</div>
      <div style={{ fontSize: 15, color: "#888" }}>{item.desc}</div>
      <div style={{ fontSize: 14, color: rc, marginTop: 2, letterSpacing: 2 }}>◆ {RARITY_L[item.rarity]} ◆</div>
      <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{item.biome} • Komnata #{item.room}</div>
      <div style={{ fontSize: 14, color: "#999", marginTop: 6 }}>Wartość: {formatValHTML(item.value)}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button onClick={onSell} style={{
          background: "linear-gradient(180deg, rgba(60,35,15,0.8), rgba(30,18,8,0.8))",
          border: "1px solid #cd7f32", color: "#cd7f32", fontWeight: "bold", fontSize: 14, padding: "6px 16px",
          cursor: "pointer", borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}>💰 Sprzedaj</button>
        <button onClick={onStore} disabled={!canStore} style={{
          background: canStore ? "linear-gradient(180deg, rgba(15,35,45,0.8), rgba(8,18,25,0.8))" : "rgba(20,15,10,0.5)",
          border: `1px solid ${canStore ? "#40a8b8" : "#333"}`, color: canStore ? "#40a8b8" : "#555",
          fontWeight: "bold", fontSize: 14, padding: "6px 16px",
          cursor: canStore ? "pointer" : "not-allowed", borderRadius: 4,
        }}>🏰 Do Kryjówki</button>
      </div>
    </div>
  );
}

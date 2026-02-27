import { RARITY_C, RARITY_L } from "../data/treasures";
import { formatValHTML } from "../utils/helpers";

export default function ItemDetail({ item, onSell, onStore, canStore }) {
  if (!item) return null;
  return (
    <div style={{ marginTop: 12, padding: 12, border: "3px solid #5a4030", background: "#1a0e12", textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>{item.icon}</div>
      <div style={{ fontWeight: "bold", fontSize: 17, color: RARITY_C[item.rarity] }}>{item.name}</div>
      <div style={{ fontSize: 15, color: "#888" }}>{item.desc}</div>
      <div style={{ fontSize: 14, color: RARITY_C[item.rarity], marginTop: 2 }}>★ {RARITY_L[item.rarity]} ★</div>
      <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{item.biome} • Komnata #{item.room}</div>
      <div style={{ fontSize: 14, color: "#999", marginTop: 6 }}>Wartość: {formatValHTML(item.value)}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
        <button onClick={onSell} style={{ background: "none", border: "2px solid #b87333", color: "#b87333", fontWeight: "bold", fontSize: 14, padding: "5px 14px", cursor: "pointer" }}>💰 Sprzedaj</button>
        <button onClick={onStore} disabled={!canStore} style={{ background: "none", border: `2px solid ${canStore ? "#40a8b8" : "#333"}`, color: canStore ? "#40a8b8" : "#555", fontWeight: "bold", fontSize: 14, padding: "5px 14px", cursor: canStore ? "pointer" : "not-allowed" }}>🏰 Do Kryjówki</button>
      </div>
    </div>
  );
}

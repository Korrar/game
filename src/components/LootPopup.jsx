import { RARITY_C, RARITY_L } from "../data/treasures";
import { formatValHTML } from "../utils/helpers";

export default function LootPopup({ loot, onClose }) {
  if (!loot) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        padding: "28px 36px", textAlign: "center", background: "#1a0e12", border: "3px solid #5a4030",
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.6)", minWidth: 280,
      }}>
        <div style={{ fontSize: 56 }}>{loot.icon}</div>
        <div style={{ fontWeight: "bold", fontSize: 19, color: RARITY_C[loot.rarity], marginBottom: 4 }}>{loot.name}</div>
        <div style={{ fontSize: 16, color: "#888" }}>{loot.desc}</div>
        <div style={{ fontSize: 15, color: RARITY_C[loot.rarity], marginTop: 3 }}>★ {RARITY_L[loot.rarity]} ★</div>
        <div style={{ fontSize: 14, color: "#777", marginTop: 5 }}>Wartość: {formatValHTML(loot.value)}</div>
        <button onClick={onClose} style={{ marginTop: 12, background: "none", border: "2px solid #4a3a28", color: "#d8c8a8", fontWeight: "bold", fontSize: 16, padding: "5px 22px", cursor: "pointer" }}>Dobrze</button>
      </div>
    </div>
  );
}

import { RARITY_C } from "../data/treasures";

export default function ItemSlot({ item, selected, onClick, size = 50, locked }) {
  const border = item ? RARITY_C[item.rarity] : locked ? "#1a1210" : "#2a2018";
  const bg = selected ? "rgba(212,160,48,0.1)" : locked ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.02)";
  return (
    <div onClick={item ? onClick : undefined} style={{
      width: size, height: size, border: `2px solid ${border}`, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.52,
      cursor: item ? "pointer" : "default", position: "relative", transition: "all 0.15s", flexShrink: 0,
    }}>
      {item ? item.icon : locked ? <span style={{ fontSize: 10, opacity: 0.3 }}>🔒</span> : null}
      {item && <span style={{ position: "absolute", bottom: 1, right: 3, fontSize: 8, color: RARITY_C[item.rarity] }}>●</span>}
    </div>
  );
}

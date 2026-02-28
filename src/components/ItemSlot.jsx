import { RARITY_C } from "../data/treasures";
import { getIconUrl } from "../rendering/icons";

function SIcon({ name, size = 26 }) {
  const url = getIconUrl(name, size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle", display: "inline-block" }} alt={name} />;
}

const RARITY_GLOW = {
  common: "rarityGlow-common 3s ease-in-out infinite",
  uncommon: "rarityGlow-uncommon 2.8s ease-in-out infinite",
  rare: "rarityGlow-rare 2.5s ease-in-out infinite",
  epic: "rarityGlow-epic 2.2s ease-in-out infinite",
  legendary: "rarityGlow-legendary 2s ease-in-out infinite",
};

export default function ItemSlot({ item, selected, onClick, size = 50, locked }) {
  const border = item ? RARITY_C[item.rarity] : locked ? "#1a1210" : "#1a1408";
  const isLegendary = item?.rarity === "legendary";
  const isEpic = item?.rarity === "epic";

  const bg = selected ? "rgba(212,160,48,0.12)"
    : item ? (isLegendary ? "linear-gradient(135deg, rgba(212,160,48,0.1), rgba(80,50,10,0.04), rgba(212,160,48,0.1))"
      : isEpic ? "rgba(160,80,224,0.06)" : "rgba(255,255,255,0.02)")
    : locked ? "rgba(0,0,0,0.3)" : "rgba(10,8,6,0.6)";

  return (
    <div onClick={item ? onClick : undefined} style={{
      width: size, height: size, border: `2px solid ${border}`, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.52,
      cursor: item ? "pointer" : "default", position: "relative", transition: "all 0.15s", flexShrink: 0,
      animation: item ? RARITY_GLOW[item.rarity] : "none", borderRadius: 3,
    }}>
      {isLegendary && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 2, overflow: "hidden",
          background: "linear-gradient(105deg, transparent 40%, rgba(255,224,128,0.15) 45%, rgba(255,224,128,0.25) 50%, rgba(255,224,128,0.15) 55%, transparent 60%)",
          backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite",
        }} />
      )}
      {item ? <SIcon name={item.icon} size={size * 0.52} /> : locked ? <span style={{ opacity: 0.3 }}><SIcon name="shield" size={10} /></span> : null}
      {item && (
        <span style={{
          position: "absolute", bottom: 1, right: 2, fontSize: 6, color: RARITY_C[item.rarity],
          textShadow: `0 0 4px ${RARITY_C[item.rarity]}`, animation: "floatGem 2s ease-in-out infinite",
        }}>◆</span>
      )}
      {selected && (
        <div style={{ position: "absolute", inset: -1, border: "2px solid #ffe080", borderRadius: 4, boxShadow: "0 0 12px rgba(212,160,48,0.5)", pointerEvents: "none" }} />
      )}
    </div>
  );
}

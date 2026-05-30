import { useState, useMemo } from "react";
import {
  COLLECTIBLES, COLLECTIBLE_SETS,
  COLLECTIBLE_RARITY_C, COLLECTIBLE_RARITY_L, COLLECTIBLE_RARITY_TIER,
  getCompletedSets, getCollectionStats,
} from "../data/collectibles";
import { getIconUrl } from "../rendering/icons";
import { BIOMES } from "../data/biomes";

const BIOME_NAME_MAP = BIOMES.reduce((acc, b) => { acc[b.id] = { name: b.name, icon: b.icon }; return acc; }, {});

function CollectibleSparkles({ color, count }) {
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const delay = (i / count) * 2;
        return (
          <div key={i} style={{
            position: "absolute", top: "50%", left: "50%",
            width: 3, height: 3, borderRadius: "50%",
            background: color, boxShadow: `0 0 6px ${color}`,
            animation: `cabOrbit 3s ${delay}s linear infinite`,
            transformOrigin: "0 0", marginLeft: -1.5, marginTop: -1.5,
            pointerEvents: "none",
            "--cab-angle": `${angle}deg`,
          }} />
        );
      })}
    </>
  );
}

function ItemTile({ item, owned, count, firstFound, onClick, large }) {
  const rc = COLLECTIBLE_RARITY_C[item.rarity];
  const isMythicPlus = item.rarity === "mythic" || item.rarity === "antique";
  const tier = COLLECTIBLE_RARITY_TIER[item.rarity] || 0;
  const sparkles = !owned ? 0 : isMythicPlus ? 6 : tier >= 3 ? 4 : 0;
  const size = large ? 64 : 44;
  const iconSize = large ? 40 : 28;

  return (
    <div
      onClick={() => onClick && onClick(item)}
      style={{
        position: "relative",
        width: size + 16, padding: 6,
        background: owned
          ? `linear-gradient(160deg, rgba(20,12,8,0.95), rgba(8,4,6,0.95))`
          : "linear-gradient(160deg, rgba(10,8,8,0.6), rgba(4,4,4,0.6))",
        border: `1.5px solid ${owned ? rc : "#222"}${owned ? "" : "88"}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.2s",
        boxShadow: owned
          ? `0 0 ${4 + tier * 3}px ${rc}${tier >= 3 ? "66" : "33"}, inset 0 0 8px rgba(0,0,0,0.5)`
          : "inset 0 0 8px rgba(0,0,0,0.6)",
        textAlign: "center",
        filter: owned ? "none" : "grayscale(1) brightness(0.4)",
        animation: owned && isMythicPlus ? "cabPulseMythic 2s ease-in-out infinite" : owned && item.rarity === "legendary" ? "cabPulseLegendary 2.4s ease-in-out infinite" : "none",
        overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {/* Corner gems for rare+ */}
      {owned && tier >= 2 && <>
        <div style={{ position: "absolute", top: 1, left: 3, fontSize: 6, color: rc, opacity: 0.8 }}>◆</div>
        <div style={{ position: "absolute", top: 1, right: 3, fontSize: 6, color: rc, opacity: 0.8 }}>◆</div>
      </>}
      {/* Shimmer for epic+ */}
      {owned && tier >= 3 && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(135deg, transparent 30%, ${rc}18 50%, transparent 70%)`,
          backgroundSize: "200% 200%", animation: "cabShimmer 2.8s ease-in-out infinite",
        }} />
      )}
      {/* Icon */}
      <div style={{
        width: size, height: size, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        filter: owned ? `drop-shadow(0 0 ${tier >= 3 ? 10 : 5}px ${rc}aa)` : "none",
      }}>
        {owned ? (
          getIconUrl(item.icon, iconSize) ?
            <img src={getIconUrl(item.icon, iconSize)} width={iconSize} height={iconSize} alt="" /> : null
        ) : (
          <div style={{ fontSize: iconSize, color: "#444", fontWeight: "bold" }}>?</div>
        )}
        <CollectibleSparkles color={rc} count={sparkles} />
      </div>
      {/* Name / placeholder */}
      <div style={{
        fontSize: 9, color: owned ? rc : "#444", marginTop: 4,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        fontWeight: "bold",
        textShadow: owned ? `0 0 6px ${rc}66` : "none",
      }}>
        {owned ? item.name : "???"}
      </div>
      {/* Count badge */}
      {owned && count > 1 && (
        <div style={{
          position: "absolute", top: 2, right: 2,
          background: "rgba(0,0,0,0.85)", color: "#ffd450",
          fontSize: 9, padding: "1px 4px", borderRadius: 4,
          border: `1px solid ${rc}66`, fontWeight: "bold",
        }}>×{count}</div>
      )}
      {/* "NEW" tag for first-find indicator (within last view) */}
      {owned && firstFound && (
        <div style={{
          position: "absolute", bottom: 2, left: 2,
          background: rc, color: "#000", fontSize: 7,
          padding: "1px 3px", borderRadius: 3, fontWeight: "bold",
          letterSpacing: 0.5,
        }}>NOWE</div>
      )}
    </div>
  );
}

function DetailPanel({ item, owned, count, firstFoundRoom, onClose }) {
  if (!item) return null;
  const rc = COLLECTIBLE_RARITY_C[item.rarity];
  const tier = COLLECTIBLE_RARITY_TIER[item.rarity] || 0;
  const biome = item.biome ? BIOME_NAME_MAP[item.biome] : null;
  const isMythicPlus = item.rarity === "mythic" || item.rarity === "antique";

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 250, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(180deg, rgba(20,14,10,0.99), rgba(10,8,8,0.99))",
        border: `2px solid ${owned ? rc : "#333"}`,
        borderRadius: 8, padding: "20px 26px",
        minWidth: 320, maxWidth: 420,
        textAlign: "center",
        boxShadow: owned ? `0 0 30px ${rc}55, inset 0 0 18px ${rc}15` : "inset 0 0 20px rgba(0,0,0,0.5)",
        position: "relative", overflow: "hidden",
        animation: owned && isMythicPlus ? "cabPulseMythic 2s ease-in-out infinite" : "none",
      }}>
        {/* Shimmer for owned epic+ */}
        {owned && tier >= 3 && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `linear-gradient(135deg, transparent 35%, ${rc}10 50%, transparent 65%)`,
            backgroundSize: "200% 200%", animation: "cabShimmer 3.5s ease-in-out infinite",
          }} />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            width: 90, height: 90, margin: "0 auto 8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            filter: owned ? `drop-shadow(0 0 14px ${rc})` : "none",
          }}>
            {owned ? (
              getIconUrl(item.icon, 72) ?
                <img src={getIconUrl(item.icon, 72)} width={72} height={72} alt="" /> : null
            ) : (
              <div style={{ fontSize: 64, color: "#333", fontWeight: "bold" }}>?</div>
            )}
          </div>
          <div style={{
            fontSize: 19, fontWeight: "bold", color: owned ? rc : "#555",
            marginBottom: 4, textShadow: owned ? `0 0 10px ${rc}77` : "none",
          }}>
            {owned ? item.name : "Nieznany Skarb"}
          </div>
          <div style={{
            fontSize: 11, color: rc, letterSpacing: 3, marginBottom: 8, fontWeight: "bold",
          }}>
            ◆ {COLLECTIBLE_RARITY_L[item.rarity]} ◆
          </div>
          {owned ? (
            <>
              <div style={{ fontSize: 13, color: "#c8b898", marginBottom: 6, fontStyle: "italic" }}>
                "{item.desc}"
              </div>
              <div style={{ fontSize: 11, color: "#8a8070", marginBottom: 10, lineHeight: 1.5 }}>
                {item.lore}
              </div>
              <div style={{
                fontSize: 11, color: "#888", borderTop: "1px solid #2a2018",
                paddingTop: 8, display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8,
              }}>
                {biome && <span>Biom: <span style={{ color: "#c8a060" }}>{biome.name}</span></span>}
                {firstFoundRoom != null && <span>Etap odkrycia: <span style={{ color: "#c8a060" }}>#{firstFoundRoom}</span></span>}
                {count > 1 && <span>Posiadasz: <span style={{ color: "#ffd450" }}>×{count}</span></span>}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10, fontStyle: "italic" }}>
              Odkryj ten przedmiot w grze, aby ujawnić jego sekrety.
              {biome && <div style={{ marginTop: 6 }}>Możliwe miejsce: <span style={{ color: "#8a7050" }}>{biome.name}</span></div>}
            </div>
          )}
          <button onClick={onClose} style={{
            marginTop: 8, background: "linear-gradient(180deg, rgba(40,25,10,0.9), rgba(20,12,6,0.9))",
            border: `1px solid ${rc}66`, color: rc, fontWeight: "bold", fontSize: 14,
            padding: "6px 22px", cursor: "pointer", borderRadius: 4,
          }}>Zamknij</button>
        </div>
      </div>
    </div>
  );
}

export default function CuriosityCabinet({ collectedItems, collectorShards, onClose, isMobile }) {
  const [selected, setSelected] = useState(null);
  const [biomeFilter, setBiomeFilter] = useState("all");

  const stats = useMemo(() => getCollectionStats(collectedItems), [collectedItems]);
  const completedSets = useMemo(() => getCompletedSets(collectedItems), [collectedItems]);

  // Group items by biome
  const biomes = useMemo(() => {
    const set = new Set();
    for (const c of COLLECTIBLES) if (c.biome) set.add(c.biome);
    const list = Array.from(set).map(id => ({ id, ...(BIOME_NAME_MAP[id] || { name: id, icon: "rock" }) }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, []);

  const visibleItems = useMemo(() => {
    let list = COLLECTIBLES;
    if (biomeFilter === "antique") list = list.filter(c => c.rarity === "antique");
    else if (biomeFilter !== "all") list = list.filter(c => c.biome === biomeFilter);
    return list.slice().sort((a, b) => {
      const ta = COLLECTIBLE_RARITY_TIER[a.rarity] || 0;
      const tb = COLLECTIBLE_RARITY_TIER[b.rarity] || 0;
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });
  }, [biomeFilter]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 240,
      background: "rgba(4,2,2,0.95)",
      display: "flex", flexDirection: "column",
      animation: "eventAppear 0.35s ease-out",
      padding: isMobile ? "8px 6px" : "24px 36px",
      overflowY: "auto",
    }}>
      {/* Animation styles */}
      <style>{`
        @keyframes cabOrbit {
          from { transform: rotate(calc(var(--cab-angle) + 0deg)) translateX(28px) rotate(0deg); }
          to   { transform: rotate(calc(var(--cab-angle) + 360deg)) translateX(28px) rotate(-360deg); }
        }
        @keyframes cabPulseMythic {
          0%, 100% { box-shadow: 0 0 12px #ff448866, inset 0 0 12px #ff448822; }
          50%      { box-shadow: 0 0 28px #ff4488bb, inset 0 0 18px #ff448844; }
        }
        @keyframes cabPulseLegendary {
          0%, 100% { box-shadow: 0 0 10px #ffd45066, inset 0 0 10px #ffd45022; }
          50%      { box-shadow: 0 0 24px #ffd450aa, inset 0 0 16px #ffd45044; }
        }
        @keyframes cabShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes cabHeader {
          0%, 100% { background-position: 200% center; }
          100%     { background-position: -200% center; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{
            fontSize: isMobile ? 20 : 28, fontWeight: "bold",
            background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030, #ffe080, #d4a030)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundSize: "200% 100%", animation: "shimmer 4s ease-in-out infinite",
            letterSpacing: 3, marginBottom: 2,
          }}>
            ✦ GABINET OSOBLIWOŚCI ✦
          </div>
          <div style={{ fontSize: 11, color: "#998877", letterSpacing: 1 }}>
            Kolekcja skarbów z całej podróży
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "2px solid #5a4030", color: "#c8a060",
          padding: "6px 18px", fontSize: 14, fontWeight: "bold",
          cursor: "pointer", borderRadius: 4,
        }}>✕ Zamknij</button>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap",
        background: "rgba(20,14,8,0.6)", border: "1px solid #3a2a18",
        padding: "10px 14px", borderRadius: 6,
      }}>
        <StatBox label="Odkryte" value={`${stats.found}/${stats.total}`} pct={stats.pct} color="#d4a030" />
        <StatBox label="Mityczne" value={`${stats.mythicFound}/${stats.mythicTotal}`} color="#ff4488" />
        <StatBox label="Antyczne" value={`${stats.antiqueFound}/${stats.antiqueTotal}`} color="#00ffcc" />
        <StatBox label="Sety ukończone" value={`${completedSets.length}/${COLLECTIBLE_SETS.length}`} color="#a050e0" />
        <StatBox label="Odłamki" value={`${collectorShards || 0}`} color="#88ddff" />
      </div>

      {/* Set completion grid */}
      {COLLECTIBLE_SETS.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "#c8a060", fontWeight: "bold", marginBottom: 6, letterSpacing: 1 }}>
            ZESTAWY KOLEKCJONERSKIE
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 5}, 1fr)`,
            gap: 6,
          }}>
            {COLLECTIBLE_SETS.map(set => {
              const setItems = COLLECTIBLES.filter(c => c.setId === set.id);
              const ownedCount = setItems.filter(it => collectedItems[it.id]).length;
              const done = ownedCount === setItems.length;
              return (
                <div key={set.id} style={{
                  padding: "6px 8px",
                  background: done ? "rgba(160,80,224,0.12)" : "rgba(0,0,0,0.3)",
                  border: `1.5px solid ${done ? "#a050e0" : "#2a2018"}`,
                  borderRadius: 4,
                  boxShadow: done ? "0 0 12px #a050e055" : "none",
                  animation: done ? "cabPulseLegendary 3s ease-in-out infinite" : "none",
                }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: done ? "#c080ff" : "#998877" }}>
                    {done && "★ "}{set.name}
                  </div>
                  <div style={{ fontSize: 9, color: "#666", marginTop: 1 }}>
                    {ownedCount}/{setItems.length}{done && " — UKOŃCZONY"}
                  </div>
                  <div style={{
                    height: 3, background: "#1a1010", marginTop: 3, borderRadius: 2, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${(ownedCount / setItems.length) * 100}%`,
                      background: done ? "#a050e0" : "#5a4028",
                      transition: "width 0.4s",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Biome filter tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap",
      }}>
        <FilterTab label="Wszystkie" active={biomeFilter === "all"} onClick={() => setBiomeFilter("all")} />
        {biomes.map(b => (
          <FilterTab key={b.id} label={b.name} icon={b.icon} active={biomeFilter === b.id} onClick={() => setBiomeFilter(b.id)} />
        ))}
        <FilterTab label="Antyczne" active={biomeFilter === "antique"} onClick={() => setBiomeFilter("antique")} color="#00ffcc" />
      </div>

      {/* Item grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${isMobile ? 4 : 8}, 1fr)`,
        gap: 8,
        background: "rgba(14,8,6,0.6)",
        border: "1px solid #2a2018",
        padding: 10, borderRadius: 6,
      }}>
        {visibleItems.map(item => {
          const ownedEntry = collectedItems[item.id];
          const owned = !!ownedEntry;
          return (
            <ItemTile
              key={item.id}
              item={item}
              owned={owned}
              count={ownedEntry?.count || 0}
              firstFound={false}
              onClick={() => setSelected(item)}
            />
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: "#5a4028", textAlign: "center", marginTop: 10, fontStyle: "italic" }}>
        Pokonuj wrogów i bossów aby odkrywać kolekcjonerki. Mityczne skarby pojawiają się tylko w określonych biomach, antyczne — wyłącznie od bossów.
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailPanel
          item={selected}
          owned={!!collectedItems[selected.id]}
          count={collectedItems[selected.id]?.count || 0}
          firstFoundRoom={collectedItems[selected.id]?.firstFoundRoom}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color, pct }) {
  return (
    <div style={{
      flex: "1 1 120px", padding: "4px 8px",
      background: "rgba(0,0,0,0.4)", border: `1px solid ${color}40`,
      borderRadius: 4, position: "relative", overflow: "hidden",
    }}>
      <div style={{ fontSize: 9, color: "#998877", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 16, color, fontWeight: "bold", textShadow: `0 0 8px ${color}66` }}>{value}</div>
      {pct != null && (
        <div style={{ height: 2, background: "#1a1010", marginTop: 2, borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.4s" }} />
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, icon, active, onClick, color }) {
  const c = color || (active ? "#d4a030" : "#5a4028");
  return (
    <button onClick={onClick} style={{
      background: active ? `${c}22` : "rgba(0,0,0,0.3)",
      border: `1.5px solid ${active ? c : "#2a2018"}`,
      color: active ? c : "#998877",
      padding: "4px 10px", fontSize: 11, fontWeight: "bold",
      cursor: "pointer", borderRadius: 4,
      display: "flex", alignItems: "center", gap: 4,
    }}>
      {icon && getIconUrl(icon, 12) ? <img src={getIconUrl(icon, 12)} width={12} height={12} alt="" /> : null}
      {label}
    </button>
  );
}

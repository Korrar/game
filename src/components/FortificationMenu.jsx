// FortificationMenu — pre-defense placement overlay
// Shows unlocked fortifications for manual placement or auto-deploy option

import { useState, useCallback } from "react";
import { getIconUrl } from "../rendering/icons";
import { FORTIFICATION_TREE, FORTIFICATION_PHASE } from "../data/advancedTraps";
import { DEFENSE_TRAPS, MAX_PLAYER_TRAPS } from "../data/skillshots";

function FIcon({ name, size = 16 }) {
  const url = getIconUrl(name, size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle" }} alt={name} />;
}

const TYPE_COLORS = {
  wall: "#8a6a30",
  ground_trap: "#c06030",
  totem: "#4080c0",
  turret: "#c04040",
  utility: "#60a060",
};

const TYPE_LABELS = {
  wall: "Ściana",
  ground_trap: "Pułapka",
  totem: "Totem",
  turret: "Wieża",
  utility: "Narzędzie",
};

export default function FortificationMenu({
  unlockedFortifications,
  onPlace,        // (fortId, x, y) => void  — manual placement
  onAutoPlace,    // () => void — auto deploy all
  onReady,        // () => void — done placing, start waves
  placedCount,    // number of fortifications placed so far
  maxCount,       // max allowed
  roomNumber,
  isBossRoom,
  bossName,
  defensePoi,     // the POI data that triggered this
}) {
  const [selectedFort, setSelectedFort] = useState(null);

  const available = FORTIFICATION_TREE.filter(f => {
    if (!unlockedFortifications.includes(f.id)) return false;
    if (f.requires && !unlockedFortifications.includes(f.requires)) return false;
    return true;
  });

  // Group by tier
  const tiers = [1, 2, 3];

  const maxFort = FORTIFICATION_PHASE.maxFortifications;
  const remaining = maxFort - placedCount;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "eventAppear 0.4s ease-out",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, rgba(20,12,8,0.98), rgba(10,6,4,0.98))",
        border: "2px solid #cc6020",
        borderRadius: 12, padding: "16px 32px",
        maxWidth: 600, width: "90%",
        boxShadow: "0 0 30px rgba(200,80,20,0.3), inset 0 0 20px rgba(0,0,0,0.5)",
      }}>
        {/* Title */}
        <div style={{
          textAlign: "center", marginBottom: 12,
        }}>
          <div style={{
            fontSize: 11, color: "#cc6020", letterSpacing: 3, fontWeight: "bold",
            textShadow: "0 0 8px rgba(200,80,20,0.4)",
            marginBottom: 4,
          }}>
            {isBossRoom ? "PRZYGOTOWANIE NA BOSSA" : "ETAP OBRONNY"}
          </div>
          <div style={{
            fontSize: 16, color: "#d4a030", fontWeight: "bold",
            textShadow: "0 0 10px rgba(212,160,48,0.3)",
          }}>
            <FIcon name={defensePoi?.icon || "shield"} size={18} />{" "}
            {defensePoi?.name || "Obrona Karawany"}
          </div>
          {defensePoi?.desc && (
            <div style={{ fontSize: 11, color: "#887766", marginTop: 4 }}>
              {defensePoi.desc}
            </div>
          )}
          {isBossRoom && bossName && (
            <div style={{
              fontSize: 13, color: "#ff4040", fontWeight: "bold", marginTop: 6,
              textShadow: "0 0 8px rgba(255,40,40,0.4)",
            }}>
              <FIcon name="swords" size={13} /> {bossName} nadchodzi!
            </div>
          )}
        </div>

        {/* Fortification slots counter */}
        <div style={{
          textAlign: "center", fontSize: 12, color: "#aaa", marginBottom: 10,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <FIcon name="shield" size={12} />
          Fortyfikacje: {placedCount}/{maxFort}
          {remaining > 0 && (
            <span style={{ color: "#60a060" }}>({remaining} wolnych)</span>
          )}
        </div>

        {/* Fortification grid by tier */}
        <div style={{
          maxHeight: 280, overflowY: "auto",
          paddingRight: 4,
        }}>
          {tiers.map(tier => {
            const tierForts = available.filter(f => f.tier === tier);
            if (tierForts.length === 0) return null;
            return (
              <div key={tier} style={{ marginBottom: 8 }}>
                <div style={{
                  fontSize: 10, color: "#666", letterSpacing: 2, fontWeight: "bold",
                  borderBottom: "1px solid #333", paddingBottom: 2, marginBottom: 4,
                }}>
                  POZIOM {tier}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tierForts.map(fort => {
                    const isSelected = selectedFort === fort.id;
                    const typeColor = TYPE_COLORS[fort.type] || "#666";
                    return (
                      <div
                        key={fort.id}
                        onClick={() => {
                          if (remaining <= 0) return;
                          setSelectedFort(isSelected ? null : fort.id);
                          if (!isSelected && onPlace) onPlace(fort.id);
                        }}
                        style={{
                          flex: "1 1 calc(50% - 6px)", minWidth: 170,
                          background: isSelected
                            ? "rgba(200,100,20,0.15)"
                            : "rgba(20,15,10,0.8)",
                          border: `1px solid ${isSelected ? "#cc6020" : "#444"}`,
                          borderRadius: 6, padding: "6px 8px",
                          cursor: remaining > 0 ? "pointer" : "not-allowed",
                          opacity: remaining > 0 ? 1 : 0.5,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                          if (remaining > 0) e.currentTarget.style.borderColor = typeColor;
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.borderColor = "#444";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <FIcon name={fort.icon} size={16} />
                          <span style={{ fontSize: 12, color: "#ddd", fontWeight: "bold" }}>
                            {fort.name}
                          </span>
                          <span style={{
                            fontSize: 8, color: typeColor,
                            border: `1px solid ${typeColor}66`,
                            padding: "0 4px", borderRadius: 3, marginLeft: "auto",
                          }}>
                            {TYPE_LABELS[fort.type] || fort.type}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#888" }}>
                          {fort.desc}
                        </div>
                        {fort.maxCount > 1 && (
                          <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                            Maks: {fort.maxCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {available.length === 0 && (
            <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>
              Brak odblokowanych fortyfikacji.<br />
              Odblokuj je w panelu fortyfikacji między walkami.
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{
          display: "flex", gap: 10, justifyContent: "center", marginTop: 14,
          flexWrap: "wrap",
        }}>
          {/* Auto-deploy button */}
          <div
            onClick={onAutoPlace}
            style={{
              padding: "8px 18px", cursor: "pointer",
              border: "2px solid #c08040",
              color: "#c08040", fontWeight: "bold", fontSize: 13,
              borderRadius: 6, background: "rgba(100,50,20,0.15)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,50,20,0.3)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(200,100,40,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(100,50,20,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <FIcon name="dice" size={13} /> Rozmieść losowo
          </div>

          {/* Start defense button */}
          <div
            onClick={onReady}
            style={{
              padding: "8px 24px", cursor: "pointer",
              border: "2px solid #40e060",
              color: "#40e060", fontWeight: "bold", fontSize: 14,
              borderRadius: 6, background: "rgba(30,100,40,0.15)",
              boxShadow: "0 0 12px rgba(60,200,80,0.2)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(30,100,40,0.3)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(60,200,80,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(30,100,40,0.15)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(60,200,80,0.2)"; }}
          >
            <FIcon name="swords" size={14} /> Rozpocznij obronę!
          </div>
        </div>

        {/* Tip */}
        <div style={{
          textAlign: "center", fontSize: 10, color: "#555", marginTop: 8,
        }}>
          Kliknij fortyfikację, a potem miejsce na mapie aby ją umieścić
        </div>
      </div>
    </div>
  );
}

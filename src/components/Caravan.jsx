import { getIconUrl } from "../rendering/icons";

function CIcon({ name, size = 11 }) {
  const url = getIconUrl(name, size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle", display: "inline-block" }} alt={name} />;
}

export default function Caravan({ initiative, maxInitiative, cost, canTravel, onClick, hp, maxHp, showHp, caravanName, caravanLevel, thornArmor, warDrums, isMobile }) {
  const pct = Math.min(100, (initiative / maxInitiative) * 100);
  const costPct = (cost / maxInitiative) * 100;

  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 100;
  const hpColor = hpPct > 50 ? "#40e060" : hpPct > 25 ? "#e0c040" : "#e04040";
  const lowHp = showHp && hpPct < 30;

  const m = isMobile;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: m ? 6 : 10,
      padding: m ? "3px 6px" : "4px 12px",
      background: "linear-gradient(180deg, rgba(20,12,6,0.97), rgba(12,6,4,0.97))",
      borderBottom: "1px solid #3a2810",
      borderTop: "2px solid #5a3818",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(212,160,48,0.08)",
      animation: lowHp ? "caravanDmgFlash 0.6s ease-in-out infinite" : "none",
      position: "relative",
      minHeight: m ? 28 : 34,
    }}>
      {/* Gold accent line */}
      <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,48,0.25), transparent)" }} />

      {/* Mini ship icon + name */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        flexShrink: 0,
      }}>
        <MiniShip size={m ? 24 : 30} />
        {!m && (
          <div style={{ fontSize: 10, color: "#a08040", fontWeight: "bold", lineHeight: 1.1, whiteSpace: "nowrap" }}>
            <div style={{ color: "#d4a030", fontSize: 11 }}>{caravanName || "Statek"}</div>
            <div style={{ fontSize: 9, color: "#6a5030" }}>Poz. {(caravanLevel || 0) + 1}</div>
          </div>
        )}
      </div>

      {/* HP bar */}
      {showHp && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <CIcon name="shield" size={m ? 10 : 12} />
          <div style={{ width: m ? 50 : 70, position: "relative" }}>
            <div style={{
              height: m ? 6 : 8, background: "rgba(0,0,0,0.7)",
              border: `1px solid ${hpColor}44`, borderRadius: 3,
              overflow: "hidden",
              boxShadow: `0 0 4px ${hpColor}15`,
            }}>
              <div style={{
                height: "100%", width: `${hpPct}%`,
                background: `linear-gradient(90deg, ${hpColor}, ${hpColor}cc)`,
                borderRadius: 2, transition: "width 0.3s",
                boxShadow: `0 0 6px ${hpColor}33`,
              }} />
            </div>
            <div style={{
              textAlign: "center", fontSize: m ? 8 : 9, color: hpColor,
              fontWeight: "bold", textShadow: "1px 1px 0 #000",
              marginTop: 0, lineHeight: 1,
            }}>
              {hp}/{maxHp}
            </div>
          </div>
        </div>
      )}

      {/* Initiative bar + Travel button */}
      <div onClick={onClick} style={{
        display: "flex", alignItems: "center", gap: 6,
        cursor: canTravel ? "pointer" : "not-allowed",
        padding: m ? "5px 10px" : "6px 16px",
        background: canTravel
          ? "linear-gradient(180deg, rgba(212,160,48,0.25), rgba(160,120,30,0.12))"
          : "rgba(0,0,0,0.2)",
        border: `2px solid ${canTravel ? "#b88030" : "#2a2018"}`,
        borderRadius: 6,
        transition: "all 0.2s",
        filter: canTravel ? "none" : "brightness(0.7)",
        flexShrink: 0,
        boxShadow: canTravel ? "0 0 12px rgba(212,160,48,0.3), inset 0 1px 0 rgba(255,220,100,0.15)" : "none",
      }}>
        <div style={{ width: m ? 50 : 70, position: "relative" }}>
          <div style={{
            height: m ? 7 : 8, background: "rgba(0,0,0,0.7)",
            border: "1px solid #3a2a18", borderRadius: 4,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: pct >= costPct
                ? "linear-gradient(90deg,#d4a030,#e0c060)"
                : "linear-gradient(90deg,#604820,#806030)",
              borderRadius: 3, transition: "width 0.3s",
              boxShadow: pct >= costPct ? "0 0 6px rgba(212,160,48,0.5)" : "none",
            }} />
            <div style={{
              position: "absolute", top: 0, bottom: 0, left: `${costPct}%`,
              width: 1, background: "rgba(255,255,255,0.4)",
            }} />
          </div>
        </div>
        <div style={{
          fontSize: m ? 13 : 15, fontWeight: "bold",
          color: canTravel ? "#ffd050" : "#555",
          whiteSpace: "nowrap",
          animation: canTravel ? "doorGlow 2s ease-in-out infinite" : "none",
          textShadow: canTravel ? "0 0 8px rgba(212,160,48,0.5)" : "none",
          letterSpacing: 1,
        }}>
          <CIcon name="anchor" size={m ? 14 : 16} /> RUSZAJ
          <span style={{ fontSize: m ? 9 : 10, color: "#888", marginLeft: 4, fontWeight: "normal" }}><CIcon name="hourglass" size={9} />{cost}</span>
        </div>
      </div>

      {/* Passive buffs indicators */}
      {(thornArmor || warDrums) && (
        <div style={{
          display: "flex", gap: m ? 3 : 5, alignItems: "center",
          flexShrink: 0,
        }}>
          {thornArmor && (
            <div title={`Kolczasta Zbroja: ${thornArmor.damage} obrażeń zwrotnych`} style={{
              display: "flex", alignItems: "center", gap: 2,
              padding: "1px 4px", borderRadius: 3,
              background: "rgba(200,80,40,0.1)", border: "1px solid #6a2a18",
              fontSize: m ? 8 : 9, color: "#e06030", fontWeight: "bold",
              whiteSpace: "nowrap",
            }}>
              <CIcon name="lightning" size={m ? 8 : 10} />
              {!m && "Kolce "}
              {thornArmor.damage}
            </div>
          )}
          {warDrums && (
            <div title={`Bębny Wojenne: +${warDrums.bonus}% obrażeń najemników`} style={{
              display: "flex", alignItems: "center", gap: 2,
              padding: "1px 4px", borderRadius: 3,
              background: "rgba(200,160,40,0.1)", border: "1px solid #5a4a18",
              fontSize: m ? 8 : 9, color: "#e0b040", fontWeight: "bold",
              whiteSpace: "nowrap",
            }}>
              <CIcon name="fame" size={m ? 8 : 10} />
              {!m && "Bębny "}
              +{warDrums.bonus}%
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes caravanDmgFlash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.4) sepia(0.5) hue-rotate(-30deg)}}`}</style>
    </div>
  );
}

/* Compact mini pirate ship icon for the bar */
function MiniShip({ size = 30 }) {
  const s = size;
  const hullW = s * 0.8;
  const hullH = s * 0.22;
  return (
    <div style={{ position: "relative", width: s, height: s * 0.75, flexShrink: 0 }}>
      {/* Waves */}
      <div style={{
        position: "absolute", bottom: 0, left: -s * 0.05, right: -s * 0.05,
        height: s * 0.1,
        background: "linear-gradient(180deg, #2060a0, #103060)",
        borderRadius: `0 0 ${s * 0.1}px ${s * 0.1}px`,
        opacity: 0.6,
      }} />
      {/* Hull */}
      <div style={{
        position: "absolute", left: (s - hullW) / 2, bottom: s * 0.08,
        width: hullW, height: hullH,
        background: "linear-gradient(180deg, #6a4a2a, #3a2210)",
        borderRadius: `0 0 ${s * 0.15}px ${s * 0.15}px`,
        border: "1px solid #8a6a40",
        borderTop: "2px solid #a08030",
      }} />
      {/* Mast */}
      <div style={{
        position: "absolute", left: s * 0.48, bottom: s * 0.28,
        width: 2, height: s * 0.48,
        background: "linear-gradient(180deg, #8a6a40, #5a3a18)",
      }} />
      {/* Sail */}
      <div style={{
        position: "absolute", left: s * 0.25, bottom: s * 0.38,
        width: s * 0.35, height: s * 0.32,
        background: "linear-gradient(180deg, #f0e0c0, #c0a878)",
        borderRadius: `0 ${s * 0.08}px ${s * 0.06}px 0`,
        border: "1px solid #a09070",
        boxShadow: "inset -2px 0 4px rgba(0,0,0,0.15)",
      }} />
      {/* Flag */}
      <div style={{
        position: "absolute", left: s * 0.50, top: s * 0.02,
        width: s * 0.2, height: s * 0.12,
        background: "#1a1a1a",
        borderRadius: 1,
      }}>
        {/* Skull on flag */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          width: s * 0.06, height: s * 0.06,
          background: "#ddd", borderRadius: "50%",
          transform: "translate(-50%, -50%)",
        }} />
      </div>
      {/* Bowsprit */}
      <div style={{
        position: "absolute", left: s * 0.05, bottom: s * 0.28,
        width: s * 0.15, height: 1,
        background: "#8a6a40",
        transform: "rotate(-15deg)",
        transformOrigin: "right center",
      }} />
    </div>
  );
}

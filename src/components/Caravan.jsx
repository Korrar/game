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

      {/* Mini caravan icon + name */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        flexShrink: 0,
      }}>
        <MiniCaravan size={m ? 24 : 30} />
        {!m && (
          <div style={{ fontSize: 10, color: "#a08040", fontWeight: "bold", lineHeight: 1.1, whiteSpace: "nowrap" }}>
            <div style={{ color: "#d4a030", fontSize: 11 }}>{caravanName || "Konwój"}</div>
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
        display: "flex", alignItems: "center", gap: 4,
        cursor: canTravel ? "pointer" : "not-allowed",
        padding: m ? "2px 6px" : "3px 10px",
        background: canTravel
          ? "linear-gradient(180deg, rgba(212,160,48,0.15), rgba(160,120,30,0.08))"
          : "rgba(0,0,0,0.2)",
        border: `1px solid ${canTravel ? "#8a6020" : "#2a2018"}`,
        borderRadius: 4,
        transition: "all 0.2s",
        filter: canTravel ? "none" : "brightness(0.7)",
        flexShrink: 0,
      }}>
        <div style={{ width: m ? 40 : 60, position: "relative" }}>
          <div style={{
            height: m ? 5 : 6, background: "rgba(0,0,0,0.7)",
            border: "1px solid #3a2a18", borderRadius: 3,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: pct >= costPct
                ? "linear-gradient(90deg,#d4a030,#e0c060)"
                : "linear-gradient(90deg,#604820,#806030)",
              borderRadius: 2, transition: "width 0.3s",
              boxShadow: pct >= costPct ? "0 0 4px rgba(212,160,48,0.4)" : "none",
            }} />
            <div style={{
              position: "absolute", top: 0, bottom: 0, left: `${costPct}%`,
              width: 1, background: "rgba(255,255,255,0.35)",
            }} />
          </div>
        </div>
        <div style={{
          fontSize: m ? 9 : 10, fontWeight: "bold",
          color: canTravel ? "#d4a030" : "#555",
          whiteSpace: "nowrap",
          animation: canTravel ? "doorGlow 2s ease-in-out infinite" : "none",
        }}>
          <CIcon name="convoy" size={m ? 9 : 10} /> Ruszaj
          <span style={{ fontSize: 8, color: "#666", marginLeft: 2 }}><CIcon name="hourglass" size={8} />{cost}</span>
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

/* Compact mini caravan icon for the bar */
function MiniCaravan({ size = 30 }) {
  const s = size;
  const horseW = s * 0.3;
  const wagonW = s * 0.55;
  return (
    <div style={{ position: "relative", width: s, height: s * 0.7, flexShrink: 0 }}>
      {/* Horse */}
      <div style={{
        position: "absolute", left: 0, bottom: s * 0.15,
        width: horseW, height: horseW * 0.7,
        background: "linear-gradient(180deg,#6a4a2a,#503a1a)",
        borderRadius: `${s * 0.08}px ${s * 0.1}px 1px 1px`,
      }}>
        {/* Head */}
        <div style={{
          position: "absolute", top: -s * 0.12, left: -s * 0.03,
          width: s * 0.12, height: s * 0.12,
          background: "#5a3a1a",
          borderRadius: `${s * 0.06}px ${s * 0.08}px 2px 3px`,
          transform: "rotate(-10deg)",
        }} />
        {/* Legs */}
        <div style={{ position: "absolute", bottom: -s * 0.1, left: s * 0.02, width: 2, height: s * 0.12, background: "#503a1a" }} />
        <div style={{ position: "absolute", bottom: -s * 0.1, right: s * 0.02, width: 2, height: s * 0.12, background: "#503a1a" }} />
      </div>
      {/* Harness */}
      <div style={{
        position: "absolute", left: horseW - 1, bottom: s * 0.28,
        width: s * 0.1, height: 1, background: "#a08030",
      }} />
      {/* Wagon */}
      <div style={{
        position: "absolute", right: 0, bottom: s * 0.12,
        width: wagonW, height: s * 0.35,
        background: "linear-gradient(180deg,#5a3a18,#3a2210)",
        border: "1px solid #7a5a30", borderRadius: "2px 2px 0 0",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, #a08030, #d4a030, #a08030)" }} />
      </div>
      {/* Canvas */}
      <div style={{
        position: "absolute", right: 1, bottom: s * 0.45,
        width: wagonW - 2, height: s * 0.2,
        background: "linear-gradient(180deg,#a09070,#806848)",
        borderRadius: `${s * 0.08}px ${s * 0.08}px 0 0`,
        border: "1px solid #7a6040", borderBottom: "none",
      }} />
      {/* Wheels */}
      {[s * 0.18, s * 0.5].map((x, i) => (
        <div key={i} style={{
          position: "absolute", right: x, bottom: 0,
          width: s * 0.15, height: s * 0.15,
          border: "1px solid #a08030", borderRadius: "50%",
          background: "radial-gradient(circle at 40% 40%,#6a5030,#3a2010)",
        }} />
      ))}
    </div>
  );
}

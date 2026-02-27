export default function Caravan({ initiative, maxInitiative, cost, canTravel, onClick, hp, maxHp, showHp }) {
  const pct = Math.min(100, (initiative / maxInitiative) * 100);
  const costPct = (cost / maxInitiative) * 100;

  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 100;
  const hpColor = hpPct > 50 ? "#40e060" : hpPct > 25 ? "#e0c040" : "#e04040";
  const lowHp = showHp && hpPct < 30;

  return (
    <div onClick={onClick} style={{
      position: "absolute", bottom: 8, left: "50%", zIndex: 10,
      cursor: canTravel ? "pointer" : "not-allowed",
      filter: canTravel ? "drop-shadow(0 0 10px rgba(212,160,48,0.5))" : "brightness(0.7)",
      transition: "filter 0.3s, transform 0.2s",
      transform: canTravel ? "translateX(-50%) scale(1)" : "translateX(-50%) scale(0.97)",
      userSelect: "none",
      animation: lowHp ? "caravanDmgFlash 0.6s ease-in-out infinite" : "none",
    }}>
      {/* HP bar – visible in defense mode */}
      {showHp && (
        <div style={{ marginBottom: 3 }}>
          <div style={{
            width: 90, height: 7, background: "rgba(0,0,0,0.8)",
            border: `1px solid ${hpColor}44`, borderRadius: 3,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${hpPct}%`,
              background: `linear-gradient(90deg, ${hpColor}, ${hpColor}cc)`,
              borderRadius: 2, transition: "width 0.3s, background 0.3s",
            }} />
          </div>
          <div style={{
            textAlign: "center", fontSize: 9, color: hpColor,
            textShadow: "1px 1px 0 #000", marginTop: 1,
          }}>
            {hp}/{maxHp}
          </div>
        </div>
      )}

      {/* Initiative bar */}
      <div style={{
        width: 90, height: 6, background: "rgba(0,0,0,0.7)",
        border: "1px solid #5a4a30", borderRadius: 3,
        marginBottom: 4, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct >= costPct
            ? "linear-gradient(90deg,#d4a030,#e0c060)"
            : "linear-gradient(90deg,#806030,#a08040)",
          borderRadius: 2, transition: "width 0.3s",
        }} />
        {/* Cost threshold marker */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: `${costPct}%`,
          width: 1, background: "rgba(255,255,255,0.4)",
        }} />
      </div>

      {/* Caravan visual */}
      <div style={{ position: "relative", width: 90, height: 58 }}>
        {/* Horse */}
        <div style={{
          position: "absolute", left: 0, bottom: 6,
          width: 26, height: 22,
          background: "linear-gradient(180deg,#6a4a2a,#503a1a)",
          borderRadius: "8px 12px 2px 2px",
        }}>
          {/* Horse head */}
          <div style={{
            position: "absolute", top: -10, left: -4,
            width: 14, height: 14,
            background: "linear-gradient(135deg,#6a4a2a,#503a1a)",
            borderRadius: "8px 10px 4px 6px",
            transform: "rotate(-15deg)",
          }}>
            {/* Eye */}
            <div style={{
              position: "absolute", top: 4, left: 3,
              width: 2, height: 2, background: "#111", borderRadius: "50%",
            }} />
          </div>
          {/* Front legs */}
          <div style={{ position: "absolute", bottom: -8, left: 4, width: 3, height: 10, background: "#503a1a", borderRadius: 1 }} />
          <div style={{ position: "absolute", bottom: -8, left: 10, width: 3, height: 10, background: "#503a1a", borderRadius: 1 }} />
          {/* Back legs */}
          <div style={{ position: "absolute", bottom: -8, right: 4, width: 3, height: 10, background: "#503a1a", borderRadius: 1 }} />
          <div style={{ position: "absolute", bottom: -8, right: 10, width: 3, height: 10, background: "#503a1a", borderRadius: 1 }} />
          {/* Tail */}
          <div style={{
            position: "absolute", top: 2, right: -6,
            width: 8, height: 3, background: "#3a2a10",
            borderRadius: "0 4px 4px 0", transform: "rotate(15deg)",
          }} />
        </div>

        {/* Harness rope */}
        <div style={{
          position: "absolute", left: 22, bottom: 18,
          width: 12, height: 1, background: "#5a4020",
        }} />

        {/* Wagon body */}
        <div style={{
          position: "absolute", right: 0, bottom: 8,
          width: 48, height: 24,
          background: "linear-gradient(180deg,#5a3a18,#3a2210)",
          border: "2px solid #6a4a28",
          borderRadius: "3px 3px 0 0",
          boxShadow: "inset 0 0 8px rgba(0,0,0,0.4)",
        }}>
          {/* Planks */}
          {[25, 50, 75].map(p => (
            <div key={p} style={{
              position: "absolute", top: 0, bottom: 0, left: `${p}%`,
              borderRight: "1px solid rgba(0,0,0,0.2)",
            }} />
          ))}
          {/* Crates/cargo */}
          <div style={{
            position: "absolute", top: 2, left: 3,
            width: 10, height: 10,
            background: "linear-gradient(135deg,#7a5a30,#5a4020)",
            border: "1px solid #4a3018", borderRadius: 1,
          }} />
          <div style={{
            position: "absolute", top: 4, left: 16,
            width: 8, height: 8,
            background: "linear-gradient(135deg,#6a5030,#4a3018)",
            border: "1px solid #3a2010", borderRadius: 1,
          }} />
        </div>

        {/* Canvas cover (arched) */}
        <div style={{
          position: "absolute", right: 2, bottom: 30,
          width: 44, height: 18,
          background: "linear-gradient(180deg,#a09070,#806848)",
          borderRadius: "12px 12px 0 0",
          border: "1px solid #6a5030",
          borderBottom: "none",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.3)",
        }}>
          {/* Cover ribs */}
          {[20, 50, 80].map(p => (
            <div key={p} style={{
              position: "absolute", top: 0, bottom: 0, left: `${p}%`,
              borderRight: "1px solid rgba(0,0,0,0.15)",
            }} />
          ))}
        </div>

        {/* Wheels */}
        <div style={{
          position: "absolute", right: 6, bottom: 0,
          width: 14, height: 14,
          border: "2px solid #5a4020",
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 40%,#6a5030,#3a2010)",
        }}>
          {/* Spokes */}
          <div style={{ position: "absolute", top: "50%", left: 1, right: 1, height: 1, background: "#5a4020", transform: "translateY(-50%)" }} />
          <div style={{ position: "absolute", left: "50%", top: 1, bottom: 1, width: 1, background: "#5a4020", transform: "translateX(-50%)" }} />
        </div>
        <div style={{
          position: "absolute", right: 36, bottom: 0,
          width: 14, height: 14,
          border: "2px solid #5a4020",
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 40%,#6a5030,#3a2010)",
        }}>
          <div style={{ position: "absolute", top: "50%", left: 1, right: 1, height: 1, background: "#5a4020", transform: "translateY(-50%)" }} />
          <div style={{ position: "absolute", left: "50%", top: 1, bottom: 1, width: 1, background: "#5a4020", transform: "translateX(-50%)" }} />
        </div>
      </div>

      {/* Label */}
      <div style={{
        textAlign: "center", marginTop: 2, fontWeight: "bold",
        fontSize: 11, color: canTravel ? "#d4a030" : "#666",
        textShadow: "1px 1px 0 #000",
        animation: canTravel ? "doorGlow 2s ease-in-out infinite" : "none",
      }}>
        🐴 Karawana
        <span style={{ fontSize: 9, color: "#888", marginLeft: 4 }}>⏳{cost}</span>
      </div>

      <style>{`@keyframes caravanDmgFlash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.4) sepia(0.5) hue-rotate(-30deg)}}`}</style>
    </div>
  );
}

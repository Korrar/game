export default function BossHpBar({ boss, currentHp, maxHp, phase, manaShieldHp, manaShieldMaxHp }) {
  if (!boss) return null;
  const hpPct = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  const shieldPct = manaShieldMaxHp > 0 ? Math.max(0, (manaShieldHp / manaShieldMaxHp) * 100) : 0;

  return (
    <div style={{
      position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
      zIndex: 200, width: "60%", minWidth: 300, maxWidth: 600,
      textAlign: "center", pointerEvents: "none",
    }}>
      {/* Boss name + phase */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }}>{boss.emoji}</span>
        <span style={{
          fontSize: 16, fontWeight: "bold", color: "#e8d0a0",
          textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 0 0 8px rgba(200,80,20,0.5)",
          fontFamily: "'Segoe UI', monospace",
        }}>
          {boss.name}
        </span>
        {phase > 1 && (
          <span style={{
            fontSize: 12, color: phase >= 3 ? "#e040e0" : "#ff6020",
            fontWeight: "bold", border: `1px solid ${phase >= 3 ? "#e040e0" : "#ff6020"}`,
            padding: "1px 6px", borderRadius: 4,
            background: phase >= 3 ? "rgba(200,40,200,0.15)" : "rgba(200,80,20,0.15)",
          }}>
            Faza {phase}
          </span>
        )}
      </div>

      {/* Mana shield bar */}
      {manaShieldHp > 0 && manaShieldMaxHp > 0 && (
        <div style={{
          width: "100%", height: 6, background: "rgba(0,0,40,0.7)",
          border: "1px solid #4060cc44", borderRadius: 3,
          overflow: "hidden", marginBottom: 2,
        }}>
          <div style={{
            height: "100%", width: `${shieldPct}%`,
            background: "linear-gradient(90deg, #3050cc, #60a0ff)",
            borderRadius: 2, transition: "width 0.3s",
            boxShadow: "0 0 6px rgba(60,100,255,0.5)",
          }} />
        </div>
      )}

      {/* HP bar */}
      <div style={{
        width: "100%", height: 14, background: "rgba(0,0,0,0.8)",
        border: "1px solid #88444488", borderRadius: 4,
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          height: "100%", width: `${hpPct}%`,
          background: hpPct > 50
            ? "linear-gradient(90deg, #c04040, #e06030)"
            : hpPct > 25
            ? "linear-gradient(90deg, #c08020, #e0a030)"
            : "linear-gradient(90deg, #cc2020, #e03030)",
          borderRadius: 3, transition: "width 0.3s, background 0.3s",
          boxShadow: "0 0 8px rgba(200,60,20,0.4)",
        }} />
        {/* HP text overlay */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: "bold", color: "#fff",
          textShadow: "1px 1px 0 #000", fontFamily: "'Segoe UI', monospace",
        }}>
          {currentHp}/{maxHp}
        </div>
      </div>
    </div>
  );
}

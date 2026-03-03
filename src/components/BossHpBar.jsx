import { getIconUrl } from "../rendering/icons";

function BIcon({ name, size = 10 }) {
  const url = getIconUrl(name, size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle", display: "inline-block" }} alt={name} />;
}

const ABILITY_NAMES = {
  charge: { name: "Szarża", icon: "bull", desc: "Szarżuje na karawanę" },
  fireBreath: { name: "Ognisty Oddech", icon: "fire", desc: "Zadaje obrażenia ognia" },
  iceShot: { name: "Lodowy Strzał", icon: "ice", desc: "Zamraża i zadaje obrażenia lodu" },
  shadowBolt: { name: "Mroczna Kula", icon: "moon", desc: "Atak ciemnością" },
  drain: { name: "Wyssanie", icon: "poison", desc: "Leczy się zadanymi obrażeniami" },
  poisonSpit: { name: "Trujący Plwocina", icon: "poison", desc: "Zadaje obrażenia trucizną" },
};

const RESIST_NAMES = {
  fire: { name: "Ogień", icon: "fire" },
  ice: { name: "Lód", icon: "ice" },
  shadow: { name: "Cień", icon: "moon" },
};

export default function BossHpBar({ boss, currentHp, maxHp, phase, manaShieldHp, manaShieldMaxHp }) {
  if (!boss) return null;
  const hpPct = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  const shieldPct = manaShieldMaxHp > 0 ? Math.max(0, (manaShieldHp / manaShieldMaxHp) * 100) : 0;

  const ability = ABILITY_NAMES[boss.ability] || null;
  const resist = boss.resist ? RESIST_NAMES[boss.resist] : null;

  return (
    <div style={{
      position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
      zIndex: 200, width: "60%", minWidth: 300, maxWidth: 600,
      textAlign: "center", pointerEvents: "none",
    }}>
      {/* Boss name + phase */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ filter: "drop-shadow(0 0 8px rgba(200,40,20,0.5))" }}><BIcon name={boss.icon} size={24} /></span>
        <span style={{
          fontSize: 17, fontWeight: "bold",
          background: "linear-gradient(90deg, #e8d0a0, #ffe0b0, #e8d0a0)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontFamily: "'Segoe UI', monospace",
          filter: "drop-shadow(1px 1px 0 #000)",
        }}>
          {boss.name}
        </span>
        {phase > 1 && (
          <span style={{
            fontSize: 12, color: phase >= 3 ? "#e040e0" : "#ff6020",
            fontWeight: "bold", border: `1px solid ${phase >= 3 ? "#e040e0" : "#ff6020"}`,
            padding: "1px 8px", borderRadius: 4,
            background: phase >= 3 ? "rgba(200,40,200,0.15)" : "rgba(200,80,20,0.15)",
            boxShadow: `0 0 8px ${phase >= 3 ? "rgba(200,40,200,0.3)" : "rgba(200,80,20,0.3)"}`,
          }}>
            Faza {phase}
          </span>
        )}
      </div>

      {/* Boss info: ability + resist */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 4, fontSize: 10 }}>
        {ability && (
          <span style={{
            color: "#e0a040", background: "rgba(200,120,20,0.15)", padding: "2px 8px",
            border: "1px solid #5a4020", borderRadius: 4,
            boxShadow: "0 0 4px rgba(200,120,20,0.15)",
          }}>
            <BIcon name={ability.icon} size={10} /> {ability.name}
          </span>
        )}
        {resist && (
          <span style={{
            color: "#6688aa", background: "rgba(60,100,160,0.15)", padding: "2px 8px",
            border: "1px solid #2a4060", borderRadius: 4,
            boxShadow: "0 0 4px rgba(60,100,160,0.15)",
          }}>
            <BIcon name="shield" size={10} /> Odporność: <BIcon name={resist.icon} size={10} /> {resist.name}
          </span>
        )}
        {boss.phase2 && (
          <span style={{
            color: "#cc8040", background: "rgba(200,80,40,0.1)", padding: "2px 8px",
            border: "1px solid #4a2818", borderRadius: 4,
            boxShadow: "0 0 4px rgba(200,80,40,0.1)",
          }}>
            <BIcon name="skull" size={10} /> Faza 2 przy {Math.round((boss.phase2.hpThreshold || 0.5) * 100)}% HP
          </span>
        )}
      </div>

      {/* Mana shield bar */}
      {manaShieldHp > 0 && manaShieldMaxHp > 0 && (
        <div style={{
          width: "100%", height: 7, background: "rgba(0,0,40,0.8)",
          border: "1px solid #4060cc55", borderRadius: 4,
          overflow: "hidden", marginBottom: 3,
          boxShadow: "0 0 6px rgba(60,100,255,0.2)",
        }}>
          <div style={{
            height: "100%", width: `${shieldPct}%`,
            background: "linear-gradient(90deg, #3050cc, #60a0ff)",
            borderRadius: 3, transition: "width 0.3s",
            boxShadow: "0 0 8px rgba(60,100,255,0.5)",
          }} />
        </div>
      )}

      {/* HP bar */}
      <div style={{
        width: "100%", height: 22, background: "rgba(0,0,0,0.9)",
        border: "1px solid #aa444466", borderRadius: 5,
        overflow: "hidden", position: "relative",
        boxShadow: "0 0 8px rgba(200,40,20,0.25), inset 0 0 6px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          height: "100%", width: `${hpPct}%`,
          background: hpPct > 50
            ? "linear-gradient(180deg, #e05040 0%, #c03030 100%)"
            : hpPct > 25
            ? "linear-gradient(180deg, #e0a030 0%, #c08020 100%)"
            : "linear-gradient(180deg, #e03030 0%, #a01515 100%)",
          borderRadius: 4, transition: "width 0.3s, background 0.3s",
          boxShadow: hpPct <= 25
            ? "0 0 12px rgba(200,30,30,0.6), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "0 0 8px rgba(200,60,20,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
        }} />
        {/* HP text overlay */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: "bold", color: "#fff",
          textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 0 6px rgba(0,0,0,0.9)",
          fontFamily: "'Segoe UI', monospace", letterSpacing: 0.5,
        }}>
          {Math.round(currentHp)} / {maxHp}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { getIconUrl } from "../rendering/icons";

function WIcon({ name, size = 13 }) {
  const url = getIconUrl(name, size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle", display: "inline-block" }} alt={name} />;
}

export default function WaveOverlay({ defense, onDismiss, caravanHp, caravanMaxHp, relicChoices, boss, killStreak, powerSpikeWarning }) {
  const [dismissed, setDismissed] = useState(false);
  if (!defense) return null;

  const { phase, currentWave, totalWaves, enemiesRemaining, timer, isBossRoom } = defense;
  const isEnd = phase === "complete" || phase === "failed";
  const borderColor = phase === "complete" ? "#40e060" : phase === "failed" ? "#cc3030"
    : isBossRoom ? "#cc2020" : "#cc6020";
  const glowColor = phase === "complete" ? "rgba(60,200,80,0.3)" : phase === "failed" ? "rgba(200,40,40,0.3)"
    : isBossRoom ? "rgba(200,20,20,0.4)" : "rgba(200,80,20,0.3)";

  const showCaravanHp = caravanMaxHp > 0 && (phase === "wave_active" || phase === "inter_wave" || phase === "setup");
  const chPct = caravanMaxHp > 0 ? (caravanHp / caravanMaxHp) * 100 : 100;
  const chColor = chPct > 50 ? "#40e060" : chPct > 25 ? "#e0c040" : "#e04040";

  // Active phases (setup, wave_active, inter_wave) can be dismissed by click
  const isActive = phase === "setup" || phase === "wave_active" || phase === "inter_wave";
  if (isActive && dismissed) {
    // Show only a tiny badge instead of the full overlay
    return (
      <div
        onClick={() => setDismissed(false)}
        style={{
          position: "absolute", top: isBossRoom && phase === "wave_active" ? 56 : 70,
          right: 8, zIndex: 100, cursor: "pointer",
          background: "rgba(14,8,10,0.85)", border: `1px solid ${borderColor}`,
          padding: "3px 10px", borderRadius: 6, fontSize: 11,
          color: borderColor, fontWeight: "bold",
          boxShadow: `0 0 8px ${glowColor}`,
        }}
      >
        {phase === "wave_active" && <><WIcon name="swords" size={11} /> {isBossRoom && boss ? boss.name : `${currentWave}/${totalWaves}`} — {enemiesRemaining}</>}
        {phase === "setup" && <><WIcon name="hourglass" size={11} /> {timer}s</>}
        {phase === "inter_wave" && <><WIcon name="hourglass" size={11} /> {timer}s</>}
        {showCaravanHp && <span style={{ marginLeft: 6, color: chColor }}>{caravanHp}/{caravanMaxHp}</span>}
      </div>
    );
  }

  // Reset dismissed state when phase changes to end (deferred to avoid setState during render)
  if (isEnd && dismissed) setTimeout(() => setDismissed(false), 0);

  return (
    <div
      onClick={isActive ? () => setDismissed(true) : undefined}
      style={{
        position: "absolute", top: isBossRoom && phase === "wave_active" ? 56 : 80,
        left: "50%", transform: "translateX(-50%)",
        zIndex: 100, textAlign: "center",
        pointerEvents: "auto", cursor: isActive ? "pointer" : "default",
      }}
    >
      <div style={{
        background: "linear-gradient(180deg, rgba(14,8,10,0.95), rgba(8,4,6,0.95))",
        border: `2px solid ${borderColor}`,
        padding: isActive ? "8px 20px" : "12px 30px",
        minWidth: isActive ? 200 : 300, borderRadius: 10,
        boxShadow: `inset 0 0 20px rgba(0,0,0,0.5), 0 0 24px ${glowColor}, 0 0 50px ${glowColor}44`,
        animation: "eventAppear 0.4s ease-out",
        position: "relative", overflow: "hidden",
      }}>
        {/* Top accent line */}
        <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${borderColor}60, transparent)` }} />

        {phase === "setup" && (
          <>
            <div style={{
              fontSize: 12, color: isBossRoom ? "#ff3030" : "#ff8040", fontWeight: "bold", letterSpacing: 2, marginBottom: 3,
              textShadow: isBossRoom ? "0 0 8px rgba(255,30,30,0.4)" : "0 0 8px rgba(255,120,40,0.3)",
            }}>
              {isBossRoom ? "WALKA Z BOSSEM" : "ETAP OBRONNY"}
            </div>
            <div style={{ fontSize: 18, color: "#d4a030", fontWeight: "bold", textShadow: "0 0 10px rgba(212,160,48,0.3)" }}>
              {isBossRoom && boss ? (
                <><WIcon name={boss.icon} size={18} /> {boss.name}</>
              ) : (
                <>Przygotuj się! <WIcon name="hourglass" size={18} /> {timer}s</>
              )}
            </div>
            {!isBossRoom && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                Fala {currentWave}/{totalWaves} — kliknij aby schować
              </div>
            )}
            {isBossRoom && (
              <div style={{ fontSize: 11, color: "#cc8888", marginTop: 2 }}>
                <WIcon name="hourglass" /> {timer}s — kliknij aby schować
              </div>
            )}
          </>
        )}

        {phase === "wave_active" && (
          <>
            {isBossRoom && boss ? (
              <div style={{ fontSize: 12, color: "#cc3030", fontWeight: "bold", letterSpacing: 2, textShadow: "0 0 8px rgba(200,40,40,0.4)" }}>
                <WIcon name="swords" /> {boss.name}
                {boss.phase > 1 && <span style={{ color: "#ff6020" }}> — Faza {boss.phase}</span>}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#cc3030", fontWeight: "bold", letterSpacing: 2, textShadow: "0 0 8px rgba(200,40,40,0.4)" }}>
                  <WIcon name="swords" /> FALA {currentWave}/{totalWaves}
                </div>
                <div style={{ fontSize: 16, color: "#e05040", fontWeight: "bold", textShadow: "0 0 8px rgba(200,60,40,0.3)" }}>
                  Wrogowie: {enemiesRemaining}
                </div>
              </>
            )}
            <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>kliknij aby schować</div>
          </>
        )}

        {phase === "inter_wave" && (
          <>
            <div style={{ fontSize: 13, color: "#40e060", fontWeight: "bold", marginBottom: 3, textShadow: "0 0 8px rgba(60,200,80,0.3)" }}>
              Fala {currentWave - 1} pokonana!
            </div>
            <div style={{ fontSize: 16, color: "#d4a030", fontWeight: "bold", textShadow: "0 0 10px rgba(212,160,48,0.3)" }}>
              Następna za <WIcon name="hourglass" size={16} /> {timer}s
            </div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>kliknij aby schować</div>
          </>
        )}

        {/* Caravan HP bar — compact */}
        {showCaravanHp && (
          <div style={{ marginTop: 5 }}>
            <div style={{ fontSize: 11, color: chColor, fontWeight: "bold", marginBottom: 2, textShadow: `0 0 6px ${chColor}33` }}>
              <WIcon name="convoy" size={11} /> {caravanHp}/{caravanMaxHp}
            </div>
            <div style={{
              width: "100%", height: 6, background: "rgba(0,0,0,0.7)",
              border: `1px solid ${chColor}44`, borderRadius: 3,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${chPct}%`,
                background: `linear-gradient(90deg, ${chColor}, ${chColor}cc)`,
                borderRadius: 2, transition: "width 0.3s, background 0.3s",
              }} />
            </div>
          </div>
        )}

        {phase === "complete" && (
          <>
            <div style={{
              fontSize: 18, fontWeight: "bold", marginBottom: 6,
              background: "linear-gradient(90deg, #40e060, #80ff80, #40e060)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 8px rgba(60,200,80,0.3))",
            }}>
              {isBossRoom && boss ? (
                <><WIcon name={boss.icon} size={18} /> {boss.name} pokonany!</>
              ) : (
                <>OBRONA WYGRANA!</>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#a0d8a0", marginBottom: 8 }}>
              {isBossRoom ? "Podwójne łupy zdobyte!" : "Wszystkie fale pokonane!"}
            </div>
            {relicChoices ? (
              <div style={{ fontSize: 11, color: "#a050e0", fontStyle: "italic", textShadow: "0 0 6px rgba(160,80,220,0.3)" }}>
                Wybierz relikt, aby kontynuować...
              </div>
            ) : (
              <div onClick={onDismiss} style={{
                display: "inline-block", padding: "6px 20px", cursor: "pointer",
                border: "2px solid #40e060", color: "#40e060", fontWeight: "bold",
                borderRadius: 6, background: "rgba(40,120,40,0.15)",
                fontFamily: "'Segoe UI', monospace", fontSize: 14,
                boxShadow: "0 0 12px rgba(60,200,80,0.2)",
                transition: "box-shadow 0.2s, background 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(60,200,80,0.4)"; e.currentTarget.style.background = "rgba(40,120,40,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 12px rgba(60,200,80,0.2)"; e.currentTarget.style.background = "rgba(40,120,40,0.15)"; }}
              >Dalej</div>
            )}
          </>
        )}

        {phase === "failed" && (
          <>
            <div style={{
              fontSize: 18, color: "#cc3030", fontWeight: "bold", marginBottom: 6,
              textShadow: "0 0 10px rgba(200,40,40,0.4)",
            }}>
              {isBossRoom && boss ? (
                <>Konwój zniszczony przez {boss.name}!</>
              ) : (
                <>OBRONA PRZEGRANA</>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#a08080", marginBottom: 8 }}>
              Częściowa nagroda ocalona.
            </div>
            <div onClick={onDismiss} style={{
              display: "inline-block", padding: "6px 20px", cursor: "pointer",
              border: "2px solid #cc8040", color: "#cc8040", fontWeight: "bold",
              borderRadius: 6, background: "rgba(120,40,20,0.15)",
              fontFamily: "'Segoe UI', monospace", fontSize: 14,
              boxShadow: "0 0 12px rgba(200,100,40,0.2)",
              transition: "box-shadow 0.2s, background 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(200,100,40,0.4)"; e.currentTarget.style.background = "rgba(120,40,20,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 12px rgba(200,100,40,0.2)"; e.currentTarget.style.background = "rgba(120,40,20,0.15)"; }}
            >Dalej</div>
          </>
        )}
      </div>

      {/* Wave progress dots — hide for boss rooms */}
      {!isBossRoom && !dismissed && (
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 6 }}>
          {Array.from({ length: totalWaves }, (_, i) => {
            const done = i + 1 < currentWave || (i + 1 === currentWave && phase === "inter_wave");
            const active = i + 1 === currentWave && phase === "wave_active";
            const allDone = phase === "complete";
            return (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: allDone || done ? "#40e060" : active ? "#ff6020" : "#333",
                border: "1px solid #555",
                boxShadow: active ? "0 0 8px rgba(255,80,20,0.6)" : allDone || done ? "0 0 4px rgba(60,200,80,0.4)" : "none",
                transition: "background 0.3s, box-shadow 0.3s",
              }} />
            );
          })}
        </div>
      )}

      {/* Kill streak badge */}
      {killStreak >= 3 && (phase === "wave_active" || phase === "inter_wave") && !dismissed && (
        <div style={{ marginTop: 4, textAlign: "center", animation: "streakPulse 1.5s ease-in-out infinite" }}>
          <span style={{
            display: "inline-block", padding: "2px 10px", borderRadius: 8,
            background: "linear-gradient(90deg, rgba(255,120,20,0.15), rgba(255,180,40,0.2), rgba(255,120,20,0.15))",
            border: "1px solid #cc6020",
            color: "#ffa040", fontWeight: "bold", fontSize: 11,
            textShadow: "0 0 8px rgba(255,120,20,0.4)",
          }}>
            <WIcon name="fire" size={11} /> Seria x{killStreak}!
          </span>
        </div>
      )}
    </div>
  );
}

// Power spike warning — rendered separately (outside defense overlay)
export function PowerSpikeWarning({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: "absolute", top: 60, left: "50%",
      transform: "translateX(-50%)",
      zIndex: 99, textAlign: "center", pointerEvents: "none",
      animation: "bossWarningPulse 2s ease-in-out infinite",
    }}>
      <span style={{
        display: "inline-block", padding: "4px 16px", borderRadius: 6,
        background: "linear-gradient(180deg, rgba(200,30,30,0.2), rgba(100,15,15,0.15))",
        border: "1px solid #cc3030",
        color: "#ff4040", fontWeight: "bold", fontSize: 14, letterSpacing: 2,
        textShadow: "0 0 10px rgba(255,40,40,0.5)",
        boxShadow: "0 0 12px rgba(200,30,30,0.3)",
      }}>
        <WIcon name="swords" size={14} /> BOSS WKRÓTCE!
      </span>
    </div>
  );
}

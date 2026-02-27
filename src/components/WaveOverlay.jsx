export default function WaveOverlay({ defense, onDismiss, caravanHp, caravanMaxHp, relicChoices, boss }) {
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

  return (
    <div style={{
      position: "absolute", top: isBossRoom && phase === "wave_active" ? 56 : 80,
      left: "50%", transform: "translateX(-50%)",
      zIndex: 100, textAlign: "center", pointerEvents: isEnd ? "auto" : "none",
    }}>
      <div style={{
        background: "rgba(14,8,10,0.92)", border: `3px solid ${borderColor}`,
        padding: "10px 28px", minWidth: 280, borderRadius: 8,
        boxShadow: `inset 0 0 15px rgba(0,0,0,0.5), 0 0 20px ${glowColor}`,
        animation: "eventAppear 0.4s ease-out",
      }}>
        {phase === "setup" && (
          <>
            <div style={{ fontSize: 13, color: isBossRoom ? "#ff3030" : "#ff8040", fontWeight: "bold", letterSpacing: 2, marginBottom: 4 }}>
              {isBossRoom ? "WALKA Z BOSSEM" : "KOMNATA OBRONNA"}
            </div>
            <div style={{ fontSize: 24, color: "#d4a030", fontWeight: "bold" }}>
              {isBossRoom && boss ? (
                <>⚔️ {boss.emoji} {boss.name} nadchodzi!</>
              ) : (
                <>Przygotuj się! ⏱️ {timer}s</>
              )}
            </div>
            {isBossRoom ? (
              <div style={{ fontSize: 13, color: "#cc8888", marginTop: 4 }}>
                ⏱️ {timer}s
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                Fala {currentWave}/{totalWaves} nadchodzi...
              </div>
            )}
          </>
        )}

        {phase === "wave_active" && (
          <>
            {isBossRoom && boss ? (
              <div style={{ fontSize: 13, color: "#cc3030", fontWeight: "bold", letterSpacing: 2, marginBottom: 4 }}>
                ⚔️ {boss.emoji} {boss.name}
                {boss.phase > 1 && <span style={{ color: "#ff6020" }}> — Faza {boss.phase}</span>}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#cc3030", fontWeight: "bold", letterSpacing: 2, marginBottom: 4 }}>
                  ⚔️ FALA {currentWave}/{totalWaves}
                </div>
                <div style={{ fontSize: 20, color: "#e05040", fontWeight: "bold" }}>
                  Wrogowie: {enemiesRemaining}
                </div>
              </>
            )}
          </>
        )}

        {phase === "inter_wave" && (
          <>
            <div style={{ fontSize: 15, color: "#40e060", fontWeight: "bold", marginBottom: 4 }}>
              Fala {currentWave - 1} pokonana!
            </div>
            <div style={{ fontSize: 20, color: "#d4a030", fontWeight: "bold" }}>
              Następna fala za ⏱️ {timer}s
            </div>
            <div style={{ fontSize: 12, color: "#6a9a6a", marginTop: 4 }}>
              💚 Najemnicy uleczeni
            </div>
          </>
        )}

        {/* Caravan HP bar */}
        {showCaravanHp && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: chColor, fontWeight: "bold", marginBottom: 3 }}>
              🐴 {caravanHp}/{caravanMaxHp}
            </div>
            <div style={{
              width: "100%", height: 8, background: "rgba(0,0,0,0.6)",
              border: `1px solid ${chColor}44`, borderRadius: 4,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${chPct}%`,
                background: `linear-gradient(90deg, ${chColor}, ${chColor}cc)`,
                borderRadius: 3, transition: "width 0.3s, background 0.3s",
              }} />
            </div>
          </div>
        )}

        {phase === "complete" && (
          <>
            <div style={{ fontSize: 20, color: "#40e060", fontWeight: "bold", marginBottom: 6 }}>
              {isBossRoom && boss ? (
                <>{boss.emoji} {boss.name} pokonany!</>
              ) : (
                <>OBRONA WYGRANA!</>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#a0d8a0", marginBottom: 10 }}>
              {isBossRoom ? "Podwójne łupy zdobyte!" : "Wszystkie fale pokonane!"}
            </div>
            {relicChoices ? (
              <div style={{ fontSize: 12, color: "#a050e0", fontStyle: "italic" }}>
                Wybierz relikt, aby kontynuować...
              </div>
            ) : (
              <div onClick={onDismiss} style={{
                display: "inline-block", padding: "8px 24px", cursor: "pointer",
                border: "2px solid #40e060", color: "#40e060", fontWeight: "bold",
                borderRadius: 6, background: "rgba(40,120,40,0.15)",
                fontFamily: "'Segoe UI', monospace", fontSize: 15,
              }}>Dalej</div>
            )}
          </>
        )}

        {phase === "failed" && (
          <>
            <div style={{ fontSize: 20, color: "#cc3030", fontWeight: "bold", marginBottom: 6 }}>
              {isBossRoom && boss ? (
                <>Karawana zniszczona przez {boss.name}!</>
              ) : (
                <>OBRONA PRZEGRANA</>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#a08080", marginBottom: 10 }}>
              Częściowa nagroda ocalona.
            </div>
            <div onClick={onDismiss} style={{
              display: "inline-block", padding: "8px 24px", cursor: "pointer",
              border: "2px solid #cc8040", color: "#cc8040", fontWeight: "bold",
              borderRadius: 6, background: "rgba(120,40,20,0.15)",
              fontFamily: "'Segoe UI', monospace", fontSize: 15,
            }}>Dalej</div>
          </>
        )}
      </div>

      {/* Wave progress dots — hide for boss rooms (single wave) */}
      {!isBossRoom && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
          {Array.from({ length: totalWaves }, (_, i) => {
            const done = i + 1 < currentWave || (i + 1 === currentWave && phase === "inter_wave");
            const active = i + 1 === currentWave && phase === "wave_active";
            const allDone = phase === "complete";
            return (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: allDone || done ? "#40e060" : active ? "#ff6020" : "#333",
                border: "1px solid #555",
                boxShadow: active ? "0 0 8px rgba(255,80,20,0.6)" : allDone ? "0 0 6px rgba(60,200,80,0.4)" : "none",
                transition: "background 0.3s",
              }} />
            );
          })}
        </div>
      )}
    </div>
  );
}

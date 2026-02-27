import { useState, useEffect, useRef } from "react";
import { MERCENARY_TYPES } from "../data/mercenaries";
import { totalCopper } from "../utils/helpers";

const frameStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 600,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.3)",
};

function cardStyle(ev) {
  return {
    background: "linear-gradient(180deg,#1a1210,#140a08)",
    border: `3px solid ${ev.themeBorder}`,
    boxShadow: `inset 0 0 20px rgba(0,0,0,0.5), 0 0 40px ${ev.themeGlow}`,
    padding: "28px 36px", minWidth: 340, maxWidth: 500, textAlign: "center",
    animation: "eventAppear 0.4s ease-out", borderRadius: 8,
  };
}

const btnBase = {
  padding: "10px 24px", border: "2px solid", borderRadius: 6, cursor: "pointer",
  fontFamily: "'Segoe UI', monospace", fontSize: 15, fontWeight: "bold",
  transition: "background 0.15s, transform 0.1s",
};

function Btn({ label, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...btnBase, borderColor: color, color: disabled ? "#555" : color,
        background: disabled ? "rgba(30,20,15,0.5)" : "rgba(30,20,15,0.8)",
        opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={e => { if (!disabled) e.target.style.background = color + "30"; }}
      onMouseLeave={e => { e.target.style.background = disabled ? "rgba(30,20,15,0.5)" : "rgba(30,20,15,0.8)"; }}
    >{label}</button>
  );
}

// ─── MERCHANT ───
function MerchantView({ event, money, onResolve }) {
  const tc = totalCopper(money);
  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", letterSpacing: 2, marginBottom: 6 }}>WYDARZENIE</div>
      <div style={{ fontSize: 42, marginBottom: 4 }}>{event.emoji}</div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: event.themeColor, marginBottom: 8 }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 18, fontStyle: "italic" }}>
        Wyłarty płaszcz, ciężka torba... kupiec oferuje rzadkie towary.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
        {event.items.map((item, i) => {
          const cost = totalCopper(item.cost);
          const canBuy = tc >= cost;
          return (
            <div key={i} style={{
              background: "rgba(40,30,20,0.8)", border: `2px solid ${canBuy ? event.themeColor : "#333"}`,
              borderRadius: 6, padding: "12px 14px", width: 130, cursor: canBuy ? "pointer" : "not-allowed",
              opacity: canBuy ? 1 : 0.5, transition: "border-color 0.15s",
            }} onClick={() => canBuy && onResolve({ type: "merchantBuy", item })}>
              <div style={{ fontSize: 28 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: event.themeColor, marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "#a89878", marginBottom: 6 }}>{item.desc}</div>
              <div style={{ fontSize: 12, color: canBuy ? "#e0c060" : "#664" }}>
                🪙 {item.cost.silver ? item.cost.silver + "s " : ""}{item.cost.copper || 0} Cu
              </div>
            </div>
          );
        })}
      </div>
      <Btn label="Odejdź" color="#888" onClick={() => onResolve({ type: "merchantSkip" })} />
    </div>
  );
}

// ─── AMBUSH ───
function AmbushView({ event, onResolve }) {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5000);
  const [result, setResult] = useState(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (result) return;
    const iv = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 5000 - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setResult("lose");
        clearInterval(iv);
        setTimeout(() => onResolve({ type: "ambushLose", loss: event.moneyLoss }), 1500);
      }
    }, 50);
    return () => clearInterval(iv);
  }, [result, event, onResolve]);

  useEffect(() => {
    if (clicks >= event.requiredClicks && !result) {
      setResult("win");
      setTimeout(() => onResolve({ type: "ambushWin", reward: { copper: 10 } }), 1500);
    }
  }, [clicks, event.requiredClicks, result, onResolve]);

  const progress = Math.min(1, clicks / event.requiredClicks);

  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", letterSpacing: 2, marginBottom: 6 }}>WYDARZENIE</div>
      <div style={{ fontSize: 42, marginBottom: 4 }}>{event.emoji}</div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: event.themeColor, marginBottom: 8 }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 14, fontStyle: "italic" }}>
        Z cienia wyskakują bandyci! Walcz lub stracisz monety!
      </div>

      {!result && (
        <>
          {/* Fight bar */}
          <div style={{
            width: "100%", height: 28, background: "#1a0a08", border: "2px solid #6a1a1a",
            borderRadius: 4, overflow: "hidden", marginBottom: 10, position: "relative",
          }}>
            <div style={{
              width: `${progress * 100}%`, height: "100%",
              background: `linear-gradient(90deg, #cc3030, #ff6040)`,
              transition: "width 0.1s", borderRadius: 2,
            }} />
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: "bold", color: "#fff", textShadow: "0 0 4px #000",
            }}>{clicks}/{event.requiredClicks}</div>
          </div>

          <div style={{ fontSize: 12, color: "#cc6040", marginBottom: 10 }}>
            ⏱️ {(timeLeft / 1000).toFixed(1)}s
          </div>

          <button
            onClick={() => setClicks(c => c + 1)}
            style={{
              ...btnBase, borderColor: "#cc3030", color: "#fff",
              background: "linear-gradient(180deg, #8a2020, #4a1010)",
              fontSize: 18, padding: "14px 40px",
            }}
            onMouseDown={e => { e.target.style.transform = "scale(0.95)"; }}
            onMouseUp={e => { e.target.style.transform = "scale(1)"; }}
          >⚔️ WALCZ!</button>
        </>
      )}

      {result === "win" && (
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#40e060", animation: "eventAppear 0.3s ease-out" }}>
          Zwycięstwo! +10 🪙
        </div>
      )}
      {result === "lose" && (
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#cc3030", animation: "eventAppear 0.3s ease-out" }}>
          Porażka! -{event.moneyLoss.copper} 🪙
        </div>
      )}
    </div>
  );
}

// ─── RIDDLE ───
function RiddleView({ event, onResolve }) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === event.correctIndex;
    setResult(correct ? "correct" : "wrong");
    setTimeout(() => {
      onResolve(correct
        ? { type: "riddleCorrect", reward: event.reward }
        : { type: "riddleWrong", penalty: event.penalty }
      );
    }, 1800);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", letterSpacing: 2, marginBottom: 6 }}>WYDARZENIE</div>
      <div style={{ fontSize: 42, marginBottom: 4 }}>{event.emoji}</div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: event.themeColor, marginBottom: 8 }}>{event.name}</div>
      <div style={{
        fontSize: 15, color: "#c0d0f0", marginBottom: 18, fontStyle: "italic",
        padding: "10px 16px", background: "rgba(40,60,100,0.2)", borderRadius: 6,
        borderLeft: `3px solid ${event.themeColor}`,
      }}>
        "{event.question}"
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {event.answers.map((ans, i) => {
          let bg = "rgba(30,40,60,0.6)";
          let borderC = "#3a5a8a";
          if (selected !== null) {
            if (i === event.correctIndex) { bg = "rgba(40,120,40,0.4)"; borderC = "#40e060"; }
            else if (i === selected) { bg = "rgba(120,30,30,0.4)"; borderC = "#cc3030"; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
              style={{
                padding: "10px 12px", border: `2px solid ${borderC}`, borderRadius: 6,
                background: bg, color: "#d8c8a8", fontSize: 14, cursor: selected !== null ? "default" : "pointer",
                fontFamily: "'Segoe UI', monospace", transition: "all 0.2s",
              }}
            >{ans}</button>
          );
        })}
      </div>

      {result === "correct" && (
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#40e060", animation: "eventAppear 0.3s ease-out" }}>
          Poprawna odpowiedź! +{event.reward.copper} 🪙
        </div>
      )}
      {result === "wrong" && (
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#cc3030", animation: "eventAppear 0.3s ease-out" }}>
          Błędna odpowiedź! -{event.penalty.copper} 🪙
        </div>
      )}
    </div>
  );
}

// ─── ALTAR ───
function AltarView({ event, onResolve }) {
  const [revealed, setRevealed] = useState(false);

  const handlePray = () => {
    setRevealed(true);
    setTimeout(() => onResolve({ type: "altar", effect: event.altarEffect }), 2000);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", letterSpacing: 2, marginBottom: 6 }}>WYDARZENIE</div>
      <div style={{ fontSize: 42, marginBottom: 4 }}>{event.emoji}</div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: event.themeColor, marginBottom: 8 }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 18, fontStyle: "italic" }}>
        Starożytny ołtarz emanuje mocą. Złożyć ofiarę?
      </div>

      {/* Altar visual */}
      <div style={{ margin: "0 auto 18px", width: 80, height: 60, position: "relative" }}>
        <div style={{
          position: "absolute", bottom: 0, left: 10, right: 10, height: 30,
          background: "linear-gradient(180deg,#4a3a5a,#2a1a3a)", borderRadius: "2px 2px 4px 4px",
          border: "1px solid #6a4a8a",
        }} />
        <div style={{
          position: "absolute", top: 5, left: "50%", transform: "translateX(-50%)",
          width: 20, height: 20, borderRadius: "50%",
          background: revealed
            ? (event.altarEffect.type === "buff" ? "radial-gradient(#ffe080,#a050e0)" : "radial-gradient(#ff4040,#600020)")
            : "radial-gradient(#c080ff,#4020a0)",
          boxShadow: `0 0 ${revealed ? 20 : 10}px ${revealed ? (event.altarEffect.type === "buff" ? "#ffe080" : "#ff4040") : "#8040c0"}`,
          transition: "all 0.5s",
        }} />
      </div>

      {!revealed ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn label="🙏 Módl się" color={event.themeColor} onClick={handlePray} />
          <Btn label="Odejdź" color="#888" onClick={() => onResolve({ type: "altarSkip" })} />
        </div>
      ) : (
        <div style={{ animation: "eventAppear 0.4s ease-out" }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>{event.altarEffect.emoji}</div>
          <div style={{
            fontSize: 18, fontWeight: "bold", marginBottom: 4,
            color: event.altarEffect.type === "buff" ? "#40e060" : "#cc3030",
          }}>{event.altarEffect.text}</div>
          <div style={{ fontSize: 14, color: "#a89878" }}>{event.altarEffect.desc}</div>
        </div>
      )}
    </div>
  );
}

// ─── WOUNDED MERCENARY ───
function WoundedView({ event, onResolve }) {
  const merc = MERCENARY_TYPES[event.mercIndex] || MERCENARY_TYPES[0];
  const [helped, setHelped] = useState(false);

  const handleHelp = () => {
    setHelped(true);
    setTimeout(() => onResolve({ type: "woundedRecruit", mercIndex: event.mercIndex }), 1500);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", letterSpacing: 2, marginBottom: 6 }}>WYDARZENIE</div>
      <div style={{ fontSize: 42, marginBottom: 4 }}>{event.emoji}</div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: event.themeColor, marginBottom: 8 }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 18, fontStyle: "italic" }}>
        Przy drodze leży ranny wojownik. Prosi o pomoc...
      </div>

      {/* Mercenary card */}
      <div style={{
        display: "inline-block", background: "rgba(40,30,20,0.8)",
        border: `2px solid ${event.themeColor}`, borderRadius: 6, padding: "14px 20px",
        marginBottom: 18,
      }}>
        <div style={{ fontSize: 32 }}>{merc.emoji}</div>
        <div style={{ fontSize: 15, fontWeight: "bold", color: merc.color }}>{merc.name}</div>
        <div style={{ fontSize: 12, color: "#a89878" }}>{merc.desc}</div>
        <div style={{ fontSize: 12, color: "#cc8040", marginTop: 4 }}>
          HP: {Math.round(merc.hp / 2)}/{merc.hp} | DMG: {merc.damage}
        </div>
        <div style={{ fontSize: 11, color: "#40e060" }}>DARMOWY (50% HP)</div>
      </div>

      {!helped ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn label="🤝 Pomóż mu" color={event.themeColor} onClick={handleHelp} />
          <Btn label="Zostaw" color="#888" onClick={() => onResolve({ type: "woundedSkip" })} />
        </div>
      ) : (
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#40e060", animation: "eventAppear 0.3s ease-out" }}>
          {merc.emoji} {merc.name} dołączył do drużyny!
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ───
export default function EventModal({ event, money, onResolve }) {
  if (!event) return null;

  return (
    <div style={frameStyle}>
      <div style={cardStyle(event)}>
        {event.id === "merchant" && <MerchantView event={event} money={money} onResolve={onResolve} />}
        {event.id === "ambush" && <AmbushView event={event} onResolve={onResolve} />}
        {event.id === "riddle" && <RiddleView event={event} onResolve={onResolve} />}
        {event.id === "altar" && <AltarView event={event} onResolve={onResolve} />}
        {event.id === "wounded" && <WoundedView event={event} onResolve={onResolve} />}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { MERCENARY_TYPES } from "../data/mercenaries";
import { totalCopper } from "../utils/helpers";
import { getIconUrl } from "../rendering/icons";

function EIcon({ name, size = 16, style: st }) {
  const url = getIconUrl(name, size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle", display: "inline-block", ...st }} alt={name} />;
}

const frameStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 600,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.4)",
};

function cardStyle(ev) {
  return {
    background: "linear-gradient(180deg, #1a0e08, #120806)",
    border: `2px solid ${ev.themeBorder}`,
    boxShadow: `inset 0 0 25px rgba(0,0,0,0.6), 0 0 50px ${ev.themeGlow}, 0 0 80px ${ev.themeGlow}44`,
    padding: "28px 36px", minWidth: 360, maxWidth: 520, textAlign: "center",
    animation: "eventAppear 0.4s ease-out", borderRadius: 10,
    position: "relative", overflow: "hidden",
  };
}

const btnBase = {
  padding: "10px 24px", border: "2px solid", borderRadius: 6, cursor: "pointer",
  fontFamily: "'Segoe UI', monospace", fontSize: 15, fontWeight: "bold",
  transition: "background 0.15s, transform 0.1s, box-shadow 0.15s",
};

function Btn({ label, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...btnBase, borderColor: color, color: disabled ? "#555" : color,
        background: disabled ? "rgba(30,20,15,0.5)" : "rgba(30,20,15,0.8)",
        opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 0 8px ${color}22`,
      }}
      onMouseEnter={e => { if (!disabled) { e.target.style.background = color + "30"; e.target.style.boxShadow = `0 0 16px ${color}44`; } }}
      onMouseLeave={e => { e.target.style.background = disabled ? "rgba(30,20,15,0.5)" : "rgba(30,20,15,0.8)"; e.target.style.boxShadow = disabled ? "none" : `0 0 8px ${color}22`; }}
    >{label}</button>
  );
}

function SectionHeader({ event }) {
  return (
    <>
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, transparent, ${event.themeBorder}60, transparent)` }} />
      {/* Corner gems */}
      <div style={{ position: "absolute", top: 4, left: 8, fontSize: 8, color: event.themeBorder, opacity: 0.5 }}>◆</div>
      <div style={{ position: "absolute", top: 4, right: 8, fontSize: 8, color: event.themeBorder, opacity: 0.5 }}>◆</div>
      <div style={{ fontSize: 12, color: "#777", letterSpacing: 3, marginBottom: 6, fontWeight: "bold" }}>WYDARZENIE</div>
    </>
  );
}

// ─── MERCHANT ───
function MerchantView({ event, money, onResolve }) {
  const tc = totalCopper(money);
  return (
    <div>
      <SectionHeader event={event} />
      <div style={{ fontSize: 46, marginBottom: 4, filter: "drop-shadow(0 0 10px rgba(200,150,50,0.4))" }}><EIcon name={event.icon} size={46} /></div>
      <div style={{ fontSize: 21, fontWeight: "bold", color: event.themeColor, marginBottom: 8, textShadow: `0 0 8px ${event.themeColor}33` }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 18, fontStyle: "italic" }}>
        Wyłarty płaszcz, ciężka torba... kupiec oferuje rzadkie towary.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
        {event.items.map((item, i) => {
          const cost = totalCopper(item.cost);
          const canBuy = tc >= cost;
          return (
            <div key={i} style={{
              background: "linear-gradient(180deg, rgba(40,30,20,0.9), rgba(20,14,8,0.9))",
              border: `2px solid ${canBuy ? event.themeColor + "80" : "#333"}`,
              borderRadius: 8, padding: "14px 16px", width: 135, cursor: canBuy ? "pointer" : "not-allowed",
              opacity: canBuy ? 1 : 0.45, transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: canBuy ? `0 0 8px ${event.themeColor}22` : "none",
            }}
            onMouseEnter={e => { if (canBuy) { e.currentTarget.style.borderColor = event.themeColor; e.currentTarget.style.boxShadow = `0 0 16px ${event.themeColor}44`; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = canBuy ? event.themeColor + "80" : "#333"; e.currentTarget.style.boxShadow = canBuy ? `0 0 8px ${event.themeColor}22` : "none"; }}
            onClick={() => canBuy && onResolve({ type: "merchantBuy", item })}>
              <div style={{ filter: `drop-shadow(0 0 6px ${event.themeColor}44)` }}><EIcon name={item.icon} size={30} /></div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: event.themeColor, marginBottom: 4, textShadow: `0 0 6px ${event.themeColor}22` }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "#a89878", marginBottom: 6 }}>{item.desc}</div>
              <div style={{ fontSize: 12, color: canBuy ? "#e0c060" : "#664", fontWeight: "bold" }}>
                <EIcon name="coin" size={12} /> {item.cost.silver ? item.cost.silver + "s " : ""}{item.cost.copper || 0} Cu
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
      <SectionHeader event={event} />
      <div style={{ fontSize: 46, marginBottom: 4, filter: "drop-shadow(0 0 10px rgba(200,40,40,0.5))" }}><EIcon name={event.icon} size={46} /></div>
      <div style={{ fontSize: 21, fontWeight: "bold", color: event.themeColor, marginBottom: 8, textShadow: `0 0 8px ${event.themeColor}33` }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 14, fontStyle: "italic" }}>
        Z cienia wyskakują bandyci! Walcz lub stracisz monety!
      </div>

      {!result && (
        <>
          {/* Fight bar */}
          <div style={{
            width: "100%", height: 30, background: "rgba(10,4,4,0.8)", border: "2px solid #6a1a1a",
            borderRadius: 6, overflow: "hidden", marginBottom: 10, position: "relative",
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.5), 0 0 8px rgba(200,40,40,0.2)",
          }}>
            <div style={{
              width: `${progress * 100}%`, height: "100%",
              background: `linear-gradient(90deg, #cc3030, #ff6040)`,
              transition: "width 0.1s", borderRadius: 4,
              boxShadow: "0 0 8px rgba(255,60,40,0.4)",
            }} />
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: "bold", color: "#fff", textShadow: "0 0 6px #000",
            }}>{clicks}/{event.requiredClicks}</div>
          </div>

          <div style={{ fontSize: 13, color: "#cc6040", marginBottom: 10, fontWeight: "bold" }}>
            <EIcon name="hourglass" size={13} /> {(timeLeft / 1000).toFixed(1)}s
          </div>

          <button
            onClick={() => setClicks(c => c + 1)}
            style={{
              ...btnBase, borderColor: "#cc3030", color: "#fff",
              background: "linear-gradient(180deg, #8a2020, #4a1010)",
              fontSize: 18, padding: "14px 40px",
              boxShadow: "0 0 12px rgba(200,40,40,0.3)",
            }}
            onMouseDown={e => { e.target.style.transform = "scale(0.95)"; }}
            onMouseUp={e => { e.target.style.transform = "scale(1)"; }}
          ><EIcon name="swords" size={18} /> WALCZ!</button>
        </>
      )}

      {result === "win" && (
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#40e060", animation: "eventAppear 0.3s ease-out", textShadow: "0 0 12px rgba(60,200,80,0.4)" }}>
          Zwycięstwo! +10 <EIcon name="coin" size={22} />
        </div>
      )}
      {result === "lose" && (
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#cc3030", animation: "eventAppear 0.3s ease-out", textShadow: "0 0 12px rgba(200,40,40,0.4)" }}>
          Porażka! -{event.moneyLoss.copper} <EIcon name="coin" size={22} />
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
      <SectionHeader event={event} />
      <div style={{ fontSize: 46, marginBottom: 4, filter: "drop-shadow(0 0 10px rgba(60,100,200,0.4))" }}><EIcon name={event.icon} size={46} /></div>
      <div style={{ fontSize: 21, fontWeight: "bold", color: event.themeColor, marginBottom: 8, textShadow: `0 0 8px ${event.themeColor}33` }}>{event.name}</div>
      <div style={{
        fontSize: 15, color: "#c0d0f0", marginBottom: 18, fontStyle: "italic",
        padding: "12px 18px", background: "rgba(40,60,100,0.2)", borderRadius: 8,
        borderLeft: `3px solid ${event.themeColor}`,
        boxShadow: `inset 0 0 10px rgba(0,0,0,0.3), 0 0 8px ${event.themeColor}11`,
      }}>
        "{event.question}"
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {event.answers.map((ans, i) => {
          let bg = "rgba(30,40,60,0.6)";
          let borderC = "#3a5a8a";
          let shadow = "inset 0 0 6px rgba(0,0,0,0.3)";
          if (selected !== null) {
            if (i === event.correctIndex) { bg = "rgba(40,120,40,0.4)"; borderC = "#40e060"; shadow = "0 0 12px rgba(60,200,80,0.3)"; }
            else if (i === selected) { bg = "rgba(120,30,30,0.4)"; borderC = "#cc3030"; shadow = "0 0 12px rgba(200,40,40,0.3)"; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
              style={{
                padding: "10px 12px", border: `2px solid ${borderC}`, borderRadius: 8,
                background: bg, color: "#d8c8a8", fontSize: 14, cursor: selected !== null ? "default" : "pointer",
                fontFamily: "'Segoe UI', monospace", transition: "all 0.2s",
                boxShadow: shadow,
              }}
            >{ans}</button>
          );
        })}
      </div>

      {result === "correct" && (
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#40e060", animation: "eventAppear 0.3s ease-out", textShadow: "0 0 10px rgba(60,200,80,0.4)" }}>
          Poprawna odpowiedź! +{event.reward.copper} <EIcon name="coin" size={18} />
        </div>
      )}
      {result === "wrong" && (
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#cc3030", animation: "eventAppear 0.3s ease-out", textShadow: "0 0 10px rgba(200,40,40,0.4)" }}>
          Błędna odpowiedź! -{event.penalty.copper} <EIcon name="coin" size={18} />
        </div>
      )}
    </div>
  );
}

// ─── ALTAR ───
function AltarView({ event, onResolve }) {
  const [revealed, setRevealed] = useState(false);
  const eff = event.altarEffect;
  const isRisky = eff.type === "risky";

  const handlePray = () => {
    if (isRisky) return; // risky effects use separate buttons
    setRevealed(true);
    setTimeout(() => onResolve({ type: "altar", effect: eff }), 2000);
  };

  const handleRiskyAccept = () => {
    setRevealed(true);
    setTimeout(() => onResolve({ type: "altarRisky", effect: eff, accepted: true }), 1500);
  };

  const handleRiskyDecline = () => {
    onResolve({ type: "altarSkip" });
  };

  const effectColor = eff.type === "buff" ? "#40e060" : eff.type === "risky" ? "#e0a040" : "#cc3030";

  return (
    <div>
      <SectionHeader event={event} />
      <div style={{ fontSize: 46, marginBottom: 4, filter: "drop-shadow(0 0 12px rgba(128,64,200,0.5))" }}><EIcon name={event.icon} size={46} /></div>
      <div style={{ fontSize: 21, fontWeight: "bold", color: event.themeColor, marginBottom: 8, textShadow: `0 0 8px ${event.themeColor}33` }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 18, fontStyle: "italic" }}>
        {isRisky ? "Ołtarz oferuje mroczny pakt. Ryzyko i nagroda w jednym..." : "Starożytny ołtarz emanuje mocą. Złożyć ofiarę?"}
      </div>

      {/* Altar visual */}
      <div style={{ margin: "0 auto 18px", width: 80, height: 60, position: "relative" }}>
        <div style={{
          position: "absolute", bottom: 0, left: 10, right: 10, height: 30,
          background: "linear-gradient(180deg,#4a3a5a,#2a1a3a)", borderRadius: "2px 2px 4px 4px",
          border: "1px solid #6a4a8a",
          boxShadow: "0 0 8px rgba(100,60,160,0.2)",
        }} />
        <div style={{
          position: "absolute", top: 5, left: "50%", transform: "translateX(-50%)",
          width: 22, height: 22, borderRadius: "50%",
          background: revealed
            ? `radial-gradient(${effectColor}, #2a0a2a)`
            : isRisky ? "radial-gradient(#e0a040,#604020)" : "radial-gradient(#c080ff,#4020a0)",
          boxShadow: `0 0 ${revealed ? 24 : 12}px ${revealed ? effectColor : isRisky ? "#e0a040" : "#8040c0"}`,
          transition: "all 0.5s",
        }} />
      </div>

      {!revealed ? (
        isRisky ? (
          <div>
            <div style={{ fontSize: 15, color: "#e0a040", fontWeight: "bold", marginBottom: 12 }}>
              <EIcon name={eff.icon} size={18} /> {eff.text}
            </div>
            <div style={{ fontSize: 13, color: "#c09060", marginBottom: 14 }}>{eff.desc}</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn label="Akceptuj" color="#e0a040" onClick={handleRiskyAccept} />
              <Btn label="Odrzuć" color="#888" onClick={handleRiskyDecline} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn label="Módl się" color={event.themeColor} onClick={handlePray} />
            <Btn label="Odejdź" color="#888" onClick={() => onResolve({ type: "altarSkip" })} />
          </div>
        )
      ) : (
        <div style={{ animation: "eventAppear 0.4s ease-out" }}>
          <div style={{ marginBottom: 6, filter: `drop-shadow(0 0 10px ${effectColor}88)` }}><EIcon name={eff.icon} size={40} /></div>
          <div style={{
            fontSize: 19, fontWeight: "bold", marginBottom: 4, color: effectColor,
            textShadow: `0 0 10px ${effectColor}66`,
          }}>{eff.text}</div>
          <div style={{ fontSize: 14, color: "#a89878" }}>{eff.desc}</div>
        </div>
      )}
    </div>
  );
}

// ─── CURSED CHEST ───
function CursedChestView({ event, onResolve }) {
  const [opened, setOpened] = useState(false);
  const outcome = event.chestOutcome;

  const handleOpen = () => {
    setOpened(true);
    setTimeout(() => onResolve({ type: "cursedChestAccept", outcome }), 2000);
  };

  return (
    <div>
      <SectionHeader event={event} />
      <div style={{ fontSize: 46, marginBottom: 4, filter: "drop-shadow(0 0 12px rgba(144,64,192,0.6))" }}><EIcon name={event.icon} size={46} /></div>
      <div style={{ fontSize: 21, fontWeight: "bold", color: event.themeColor, marginBottom: 8, textShadow: `0 0 8px ${event.themeColor}33` }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 18, fontStyle: "italic" }}>
        Mroczna skrzynia otoczona fioletową aurą. Kto wie, co kryje w środku...
      </div>

      {/* Chest visual */}
      <div style={{
        margin: "0 auto 18px", width: 60, height: 50, position: "relative",
        background: "linear-gradient(180deg, #4a2060, #2a1040)",
        border: "2px solid #9040c0", borderRadius: 6,
        boxShadow: "0 0 20px rgba(144,64,192,0.4), inset 0 0 10px rgba(0,0,0,0.5)",
        animation: opened ? "none" : "meteorPulse 2s ease-in-out infinite",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 10, color: "#c080ff" }}>?</div>
      </div>

      {!opened ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn label="Otwórz" color="#9040c0" onClick={handleOpen} />
          <Btn label="Omiń" color="#888" onClick={() => onResolve({ type: "cursedChestSkip" })} />
        </div>
      ) : (
        <div style={{ animation: "eventAppear 0.4s ease-out" }}>
          <div style={{
            fontSize: 19, fontWeight: "bold", marginBottom: 4,
            color: outcome.type === "good" ? "#40e060" : "#cc3030",
            textShadow: `0 0 10px ${outcome.type === "good" ? "rgba(60,200,80,0.4)" : "rgba(200,40,40,0.4)"}`,
          }}>{outcome.text}</div>
          <div style={{ fontSize: 14, color: "#a89878" }}>{outcome.desc}</div>
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
      <SectionHeader event={event} />
      <div style={{ fontSize: 46, marginBottom: 4, filter: "drop-shadow(0 0 10px rgba(200,100,40,0.4))" }}><EIcon name={event.icon} size={46} /></div>
      <div style={{ fontSize: 21, fontWeight: "bold", color: event.themeColor, marginBottom: 8, textShadow: `0 0 8px ${event.themeColor}33` }}>{event.name}</div>
      <div style={{ fontSize: 14, color: "#a89878", marginBottom: 18, fontStyle: "italic" }}>
        Przy drodze leży ranny wojownik. Prosi o pomoc...
      </div>

      {/* Mercenary card */}
      <div style={{
        display: "inline-block",
        background: "linear-gradient(180deg, rgba(40,30,20,0.9), rgba(20,14,8,0.9))",
        border: `2px solid ${event.themeColor}80`, borderRadius: 8, padding: "16px 22px",
        marginBottom: 18,
        boxShadow: `0 0 12px ${event.themeColor}22, inset 0 0 10px rgba(0,0,0,0.4)`,
      }}>
        <div style={{ filter: `drop-shadow(0 0 8px ${merc.color}66)` }}><EIcon name={merc.icon} size={36} /></div>
        <div style={{ fontSize: 16, fontWeight: "bold", color: merc.color, textShadow: `0 0 6px ${merc.color}33` }}>{merc.name}</div>
        <div style={{ fontSize: 12, color: "#a89878" }}>{merc.desc}</div>
        <div style={{ fontSize: 12, color: "#cc8040", marginTop: 4, fontWeight: "bold" }}>
          HP: {Math.round(merc.hp / 2)}/{merc.hp} | DMG: {merc.damage}
        </div>
        <div style={{ fontSize: 11, color: "#40e060", fontWeight: "bold", marginTop: 2 }}>DARMOWY (50% HP)</div>
      </div>

      {!helped ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn label="Pomóż mu" color={event.themeColor} onClick={handleHelp} />
          <Btn label="Zostaw" color="#888" onClick={() => onResolve({ type: "woundedSkip" })} />
        </div>
      ) : (
        <div style={{ fontSize: 19, fontWeight: "bold", color: "#40e060", animation: "eventAppear 0.3s ease-out", textShadow: "0 0 12px rgba(60,200,80,0.4)" }}>
          <EIcon name={merc.icon} size={19} /> {merc.name} dołączył do drużyny!
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
        {event.id === "cursed_chest" && <CursedChestView event={event} onResolve={onResolve} />}
      </div>
    </div>
  );
}

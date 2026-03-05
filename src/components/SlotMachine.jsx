import { useState, useRef, useEffect, useCallback } from "react";

// ─── Procedural Slot Machine Sounds ───
const slotAudioCtx = () => {
  if (!window._slotAudioCtx) {
    window._slotAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window._slotAudioCtx.state === "suspended") window._slotAudioCtx.resume();
  return window._slotAudioCtx;
};

function playSpinTick(pitch = 800) {
  try {
    const ctx = slotAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = pitch + Math.random() * 200;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (_) { /* audio not available */ }
}

function playReelStop(reelIdx) {
  try {
    const ctx = slotAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 300 + reelIdx * 80;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}

function playWinSound(big) {
  try {
    const ctx = slotAudioCtx();
    const notes = big
      ? [523, 659, 784, 1047, 1319]  // C5-E5-G5-C6-E6 big fanfare
      : [523, 659, 784];              // C5-E5-G5 small win
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = big ? "sawtooth" : "triangle";
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(big ? 0.1 : 0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (big ? 0.4 : 0.25));
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (big ? 0.4 : 0.25));
    });
    // Add shimmer noise for big wins
    if (big) {
      const bufSize = ctx.sampleRate * 0.5;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.03;
      const noise = ctx.createBufferSource();
      const nGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 3000;
      filter.Q.value = 2;
      noise.buffer = buf;
      nGain.gain.setValueAtTime(0.06, ctx.currentTime);
      nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      noise.connect(filter).connect(nGain).connect(ctx.destination);
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.5);
    }
  } catch (_) {}
}

function playLoseSound() {
  try {
    const ctx = slotAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (_) {}
}

// ─── Pirate Slot Machine with 96% RTP ───
// Symbols ordered by value (low → high)
const SYMBOLS = [
  { id: "anchor",   icon: "⚓", color: "#6a8aaa", name: "Kotwica",    mult: 2 },
  { id: "rum",      icon: "🍺", color: "#c87830", name: "Rum",        mult: 3 },
  { id: "compass",  icon: "🧭", color: "#80b060", name: "Kompas",     mult: 4 },
  { id: "sword",    icon: "⚔️", color: "#b0b0c0", name: "Szabla",     mult: 5 },
  { id: "map",      icon: "🗺️", color: "#d4a030", name: "Mapa",       mult: 8 },
  { id: "parrot",   icon: "🦜", color: "#40c040", name: "Papuga",     mult: 12 },
  { id: "skull",    icon: "💀", color: "#e0e0e0", name: "Czaszka",    mult: 20 },
  { id: "chest",    icon: "💎", color: "#60d0ff", name: "Diament",    mult: 30 },
  { id: "gold",     icon: "👑", color: "#ffd700", name: "Korona",     mult: 50 },
];

// Weighted reel strips for ~96% RTP
// Lower symbols appear more, higher symbols appear less
const REEL_STRIP = [
  0,0,0,0,0,0,0,0,  // anchor ×8
  1,1,1,1,1,1,1,     // rum ×7
  2,2,2,2,2,2,       // compass ×6
  3,3,3,3,3,         // sword ×5
  4,4,4,4,           // map ×4
  5,5,5,             // parrot ×3
  6,6,               // skull ×2
  7,                  // diamond ×1
  8,                  // crown ×1
];

const REEL_LEN = REEL_STRIP.length;
const CELL_H = 64;
const VISIBLE = 3;
const REEL_VIEWPORT = CELL_H * VISIBLE;

// Bet tiers in copper
const BET_OPTIONS = [
  { label: "10 Cu",  copper: 10 },
  { label: "25 Cu",  copper: 25 },
  { label: "50 Cu",  copper: 50 },
  { label: "1 Ag",   copper: 100 },
  { label: "5 Ag",   copper: 500 },
  { label: "1 Au",   copper: 10000 },
];

// Pay lines - indices of winning patterns (row 0=top, 1=middle, 2=bottom)
const PAY_LINES = [
  { name: "Środkowa", rows: [1, 1, 1], color: "#ffd700" },
  { name: "Górna",    rows: [0, 0, 0], color: "#ff6040" },
  { name: "Dolna",    rows: [2, 2, 2], color: "#40c0ff" },
  { name: "V-kształt",rows: [0, 1, 2], color: "#40ff80" },
  { name: "Λ-kształt",rows: [2, 1, 0], color: "#c040ff" },
];

function getSymbolAt(reelIdx, pos) {
  // Each reel has a different offset to make them feel independent
  const offset = [0, 13, 7][reelIdx] || 0;
  const idx = ((pos + offset) % REEL_LEN + REEL_LEN) % REEL_LEN;
  return REEL_STRIP[idx];
}

// Calculate wins with proper RTP
function calculateResult(betCopper) {
  // Generate random stops for 3 reels
  const stops = [
    Math.floor(Math.random() * REEL_LEN),
    Math.floor(Math.random() * REEL_LEN),
    Math.floor(Math.random() * REEL_LEN),
  ];

  // Get visible symbols (3 rows × 3 reels)
  const grid = [];
  for (let row = 0; row < 3; row++) {
    grid[row] = [];
    for (let reel = 0; reel < 3; reel++) {
      grid[row][reel] = getSymbolAt(reel, stops[reel] + row);
    }
  }

  // Check each pay line
  let totalWin = 0;
  const winLines = [];
  for (let i = 0; i < PAY_LINES.length; i++) {
    const line = PAY_LINES[i];
    const sym0 = grid[line.rows[0]][0];
    const sym1 = grid[line.rows[1]][1];
    const sym2 = grid[line.rows[2]][2];

    if (sym0 === sym1 && sym1 === sym2) {
      // 3 of a kind
      const mult = SYMBOLS[sym0].mult;
      const win = betCopper * mult;
      totalWin += win;
      winLines.push({ lineIdx: i, symbolId: sym0, mult, win });
    } else if (sym0 === sym1 || sym1 === sym2) {
      // 2 of a kind (partial win - 0.5x of symbol mult)
      const matchSym = sym0 === sym1 ? sym0 : sym1;
      const mult = SYMBOLS[matchSym].mult * 0.2;
      const win = Math.round(betCopper * mult);
      if (win > 0) {
        totalWin += win;
        winLines.push({ lineIdx: i, symbolId: matchSym, mult, win, partial: true });
      }
    }
  }

  return { stops, grid, totalWin, winLines };
}

// ─── Animated Reel Component ───
function Reel({ targetStop, spinning, reelIdx, onDone }) {
  const [offset, setOffset] = useState(0);
  const animRef = useRef(null);
  const startTimeRef = useRef(0);
  const startOffRef = useRef(0);
  const lastTickRef = useRef(0);

  const spinDuration = 1200 + reelIdx * 400; // Staggered stop

  useEffect(() => {
    if (!spinning) return;
    startTimeRef.current = performance.now();
    startOffRef.current = offset;
    lastTickRef.current = Math.floor(offset);
    // Account for accumulated offset so final position matches calculated grid
    const currentBase = Math.floor(startOffRef.current % REEL_LEN);
    const delta = ((targetStop - currentBase) % REEL_LEN + REEL_LEN) % REEL_LEN;
    const totalSpin = REEL_LEN * (3 + reelIdx) + delta;

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / spinDuration, 1);
      // Ease out cubic for satisfying deceleration
      const ease = 1 - Math.pow(1 - t, 3);
      const currentOff = startOffRef.current + totalSpin * ease;
      setOffset(currentOff);

      // Play tick sound on each symbol passing
      const curSymbol = Math.floor(currentOff);
      if (curSymbol !== lastTickRef.current && t < 0.9) {
        if (curSymbol % 3 === 0) playSpinTick(600 + reelIdx * 100);
        lastTickRef.current = curSymbol;
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setOffset(startOffRef.current + totalSpin);
        playReelStop(reelIdx);
        if (onDone) onDone();
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [spinning, targetStop]);

  // Render reel symbols
  const symbols = [];
  const baseIdx = Math.floor(offset);
  const frac = offset - baseIdx;
  for (let i = -1; i <= VISIBLE; i++) {
    const symIdx = getSymbolAt(reelIdx, baseIdx + i);
    const sym = SYMBOLS[symIdx];
    symbols.push(
      <div key={i} style={{
        position: "absolute",
        top: (i - frac) * CELL_H,
        left: 0, right: 0,
        height: CELL_H,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36,
        textShadow: `0 0 8px ${sym.color}40`,
        transition: spinning ? "none" : "text-shadow 0.3s",
        willChange: "transform",
      }}>
        {sym.icon}
      </div>
    );
  }

  return (
    <div style={{
      width: 80, height: REEL_VIEWPORT,
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(20,12,6,0.4) 20%, rgba(20,12,6,0.2) 50%, rgba(20,12,6,0.4) 80%, rgba(0,0,0,0.8) 100%)",
      borderLeft: "1px solid #3a2a18",
      borderRight: "1px solid #3a2a18",
    }}>
      {symbols}
    </div>
  );
}

// ─── Chase Light Border ───
function ChaseLights({ active, win }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame(f => f + 1), 120);
    return () => clearInterval(id);
  }, [active]);

  const bulbCount = 28;
  const bulbs = [];
  for (let i = 0; i < bulbCount; i++) {
    const angle = (i / bulbCount) * Math.PI * 2;
    const rx = 148, ry = 118;
    const x = 50 + Math.cos(angle) * rx / 3.2;
    const y = 50 + Math.sin(angle) * ry / 2.6;
    const isOn = active ? (i + frame) % 3 === 0 : false;
    const bulbColor = win
      ? (i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#ff4040" : "#40ff40")
      : (i % 2 === 0 ? "#ffd700" : "#ff6020");
    bulbs.push(
      <div key={i} style={{
        position: "absolute",
        left: `${x}%`, top: `${y}%`,
        width: 8, height: 8,
        borderRadius: "50%",
        background: isOn ? bulbColor : "#2a1a0a",
        boxShadow: isOn ? `0 0 6px ${bulbColor}, 0 0 12px ${bulbColor}60` : "none",
        transition: "background 0.1s, box-shadow 0.1s",
        transform: "translate(-50%, -50%)",
      }} />
    );
  }
  return <>{bulbs}</>;
}

// ─── Main Slot Machine Component ───
export default function SlotMachine({ money, totalCopper: getTotalCopper, onWin, onLose, copperToMoney: convertMoney }) {
  const [betIdx, setBetIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reelStops, setReelStops] = useState([0, 0, 0]);
  const [lastResult, setLastResult] = useState(null);
  const [reelsDone, setReelsDone] = useState(0);
  const [showWin, setShowWin] = useState(false);
  const [totalWon, setTotalWon] = useState(0);
  const [totalLost, setTotalLost] = useState(0);
  const [spinsCount, setSpinsCount] = useState(0);
  const [jackpotFlash, setJackpotFlash] = useState(false);
  const [lightsActive, setLightsActive] = useState(true);

  const bet = BET_OPTIONS[betIdx];
  const tc = getTotalCopper(money);
  const canBet = tc >= bet.copper && !spinning;

  const handleSpin = useCallback(() => {
    if (!canBet) return;

    // Deduct bet
    onLose(bet.copper);
    setTotalLost(prev => prev + bet.copper);
    setSpinsCount(prev => prev + 1);
    setShowWin(false);
    setLastResult(null);
    setReelsDone(0);
    setJackpotFlash(false);

    // Calculate result
    const result = calculateResult(bet.copper);
    setReelStops(result.stops);
    setSpinning(true);

    // Store result for when reels finish
    setTimeout(() => {
      setLastResult(result);
    }, 1200 + 2 * 400 + 200); // After last reel stops
  }, [canBet, bet, onLose]);

  const handleReelDone = useCallback(() => {
    setReelsDone(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setSpinning(false);
      }
      return next;
    });
  }, []);

  // Show win after all reels stopped
  useEffect(() => {
    if (!lastResult || spinning) return;
    if (lastResult.totalWin > 0) {
      setShowWin(true);
      setTotalWon(prev => prev + lastResult.totalWin);
      onWin(lastResult.totalWin);
      playWinSound(lastResult.totalWin >= bet.copper * 5);
      if (lastResult.totalWin >= bet.copper * 20) {
        setJackpotFlash(true);
        setTimeout(() => setJackpotFlash(false), 3000);
      }
    } else {
      playLoseSound();
    }
  }, [lastResult, spinning]);

  const netProfit = totalWon - totalLost;

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(180deg, #1a0e06, #0e0604, #1a0e06)",
      border: "3px solid #d4a030",
      borderRadius: 12,
      padding: "16px 12px",
      marginTop: 14,
      boxShadow: jackpotFlash
        ? "0 0 40px rgba(255,215,0,0.6), 0 0 80px rgba(255,215,0,0.3), inset 0 0 30px rgba(255,215,0,0.1)"
        : "0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)",
      overflow: "hidden",
      transition: "box-shadow 0.3s",
    }}>
      {/* Chase lights border */}
      <ChaseLights active={lightsActive} win={showWin} />

      {/* Decorative top banner */}
      <div style={{
        textAlign: "center",
        marginBottom: 12,
        padding: "6px 0",
        background: "linear-gradient(90deg, transparent, rgba(212,160,48,0.15), transparent)",
        position: "relative",
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: "bold",
          color: "#ffd700",
          textShadow: "0 0 10px rgba(255,215,0,0.5), 0 0 20px rgba(255,215,0,0.2), 2px 2px 0 #000",
          letterSpacing: 2,
          background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s ease-in-out infinite",
        }}>
          🏴‍☠️ PIRACKI BANDIT 🏴‍☠️
        </div>
        <div style={{ fontSize: 10, color: "#8a6a30", marginTop: 2 }}>
          Jednoręki Bandyta Portowy
        </div>
      </div>

      {/* Reel window */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 4,
        padding: "8px 12px",
        background: "linear-gradient(180deg, #0a0604, #140e08, #0a0604)",
        border: "2px solid #5a3a18",
        borderRadius: 8,
        position: "relative",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.8), 0 0 10px rgba(212,160,48,0.1)",
      }}>
        {/* Win line indicator - middle */}
        <div style={{
          position: "absolute",
          left: 8, right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          height: 2,
          background: showWin
            ? "linear-gradient(90deg, transparent, #ffd700, transparent)"
            : "linear-gradient(90deg, transparent, rgba(212,160,48,0.2), transparent)",
          zIndex: 5,
          boxShadow: showWin ? "0 0 8px rgba(255,215,0,0.5)" : "none",
          transition: "all 0.3s",
        }} />

        <Reel targetStop={reelStops[0]} spinning={spinning} reelIdx={0} onDone={handleReelDone} />
        <Reel targetStop={reelStops[1]} spinning={spinning} reelIdx={1} onDone={handleReelDone} />
        <Reel targetStop={reelStops[2]} spinning={spinning} reelIdx={2} onDone={handleReelDone} />

        {/* Reel separators with glow */}
        <div style={{ position: "absolute", left: "33.3%", top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, transparent, #d4a03040, transparent)", zIndex: 4 }} />
        <div style={{ position: "absolute", left: "66.6%", top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, transparent, #d4a03040, transparent)", zIndex: 4 }} />
      </div>

      {/* Win display */}
      <div style={{
        minHeight: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "8px 0",
        padding: "4px 8px",
        background: showWin ? "rgba(255,215,0,0.08)" : "transparent",
        borderRadius: 6,
        transition: "background 0.3s",
      }}>
        {showWin && lastResult ? (
          <div style={{
            textAlign: "center",
            animation: "slotWinPulse 0.6s ease-in-out infinite alternate",
          }}>
            <div style={{
              fontSize: lastResult.totalWin >= bet.copper * 10 ? 20 : 16,
              fontWeight: "bold",
              color: lastResult.totalWin >= bet.copper * 20 ? "#ffd700" : lastResult.totalWin >= bet.copper * 5 ? "#ff8040" : "#c0a060",
              textShadow: `0 0 10px ${lastResult.totalWin >= bet.copper * 10 ? "rgba(255,215,0,0.8)" : "rgba(200,160,60,0.4)"}`,
            }}>
              {lastResult.totalWin >= bet.copper * 20 ? "🎉 WIELKA WYGRANA! 🎉" :
               lastResult.totalWin >= bet.copper * 5 ? "🔥 DUŻA WYGRANA!" : "Wygrana!"}
            </div>
            <div style={{ fontSize: 14, color: "#e0c060", marginTop: 2 }}>
              +{lastResult.totalWin >= 10000
                ? `${Math.floor(lastResult.totalWin / 10000)} Au ${Math.floor((lastResult.totalWin % 10000) / 100)} Ag`
                : lastResult.totalWin >= 100
                  ? `${Math.floor(lastResult.totalWin / 100)} Ag ${lastResult.totalWin % 100} Cu`
                  : `${lastResult.totalWin} Cu`}
            </div>
            {lastResult.winLines.map((wl, i) => (
              <div key={i} style={{ fontSize: 10, color: PAY_LINES[wl.lineIdx].color, marginTop: 1 }}>
                {PAY_LINES[wl.lineIdx].name}: {SYMBOLS[wl.symbolId].icon} ×{wl.partial ? "2" : "3"} ({wl.mult}x)
              </div>
            ))}
          </div>
        ) : !spinning && lastResult && lastResult.totalWin === 0 ? (
          <div style={{ fontSize: 13, color: "#5a4a30" }}>Brak wygranej... Spróbuj ponownie!</div>
        ) : spinning ? (
          <div style={{ fontSize: 14, color: "#d4a030", animation: "slotSpinText 0.5s ease-in-out infinite alternate" }}>
            Kręci się...
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#4a3a20" }}>Postaw zakład i zakręć!</div>
        )}
      </div>

      {/* Bet controls */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 12, color: "#8a6a30", fontWeight: "bold" }}>Stawka:</span>
        {BET_OPTIONS.map((b, i) => {
          const affordable = tc >= b.copper;
          return (
            <button key={i} onClick={() => !spinning && setBetIdx(i)}
              disabled={spinning}
              style={{
                background: betIdx === i
                  ? "linear-gradient(180deg, #3a2a10, #2a1a08)"
                  : "none",
                border: `1px solid ${betIdx === i ? "#d4a030" : affordable ? "#4a3a20" : "#2a1a10"}`,
                color: betIdx === i ? "#ffd700" : affordable ? "#8a7a50" : "#3a2a18",
                fontSize: 11,
                padding: "3px 6px",
                cursor: spinning ? "not-allowed" : affordable ? "pointer" : "not-allowed",
                borderRadius: 4,
                fontWeight: betIdx === i ? "bold" : "normal",
                boxShadow: betIdx === i ? "0 0 6px rgba(212,160,48,0.3)" : "none",
                transition: "all 0.2s",
                opacity: affordable ? 1 : 0.4,
              }}>
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Spin button */}
      <button onClick={handleSpin} disabled={!canBet}
        style={{
          display: "block",
          width: "100%",
          padding: "10px 0",
          background: canBet
            ? "linear-gradient(180deg, #5a3a10, #3a2208, #5a3a10)"
            : "linear-gradient(180deg, #1a1208, #0e0804)",
          border: `2px solid ${canBet ? "#d4a030" : "#2a1a10"}`,
          borderRadius: 8,
          color: canBet ? "#ffd700" : "#4a3a20",
          fontSize: 18,
          fontWeight: "bold",
          cursor: canBet ? "pointer" : "not-allowed",
          textShadow: canBet ? "0 0 8px rgba(255,215,0,0.4)" : "none",
          boxShadow: canBet
            ? "0 0 15px rgba(212,160,48,0.2), inset 0 1px 0 rgba(255,215,0,0.1)"
            : "none",
          letterSpacing: 2,
          transition: "all 0.2s",
          textTransform: "uppercase",
        }}>
        {spinning ? "⏳ Kręci się..." : `🎰 Zakręć (${bet.label})`}
      </button>

      {/* Stats bar */}
      {spinsCount > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          padding: "4px 8px",
          background: "rgba(0,0,0,0.3)",
          borderRadius: 4,
          fontSize: 10,
          color: "#6a5a30",
        }}>
          <span>Spiny: {spinsCount}</span>
          <span>Wygrane: {totalWon >= 100 ? `${Math.floor(totalWon/100)} Ag` : `${totalWon} Cu`}</span>
          <span style={{ color: netProfit >= 0 ? "#40a040" : "#c04040" }}>
            Bilans: {netProfit >= 0 ? "+" : ""}{Math.abs(netProfit) >= 100 ? `${Math.floor(netProfit/100)} Ag` : `${netProfit} Cu`}
          </span>
        </div>
      )}

      {/* Pay table toggle */}
      <PayTable symbols={SYMBOLS} />

      {/* CSS Animations */}
      <style>{`
        @keyframes slotWinPulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
        @keyframes slotSpinText {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes slotJackpot {
          0% { box-shadow: 0 0 20px rgba(255,215,0,0.3); }
          50% { box-shadow: 0 0 60px rgba(255,215,0,0.8), 0 0 100px rgba(255,100,0,0.4); }
          100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); }
        }
      `}</style>
    </div>
  );
}

// ─── Pay Table ───
function PayTable({ symbols }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "none", border: "none", color: "#6a5a30",
        fontSize: 11, cursor: "pointer", width: "100%", textAlign: "center",
        padding: 4,
      }}>
        {open ? "▲ Ukryj tabelę wypłat" : "▼ Pokaż tabelę wypłat"}
      </button>
      {open && (
        <div style={{
          background: "rgba(0,0,0,0.4)",
          border: "1px solid #3a2a18",
          borderRadius: 6,
          padding: 8,
          marginTop: 4,
        }}>
          <div style={{ fontSize: 11, color: "#8a7a50", marginBottom: 6, textAlign: "center" }}>
            5 linii wypłat • RTP ~96%
          </div>
          {symbols.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "2px 4px",
              borderBottom: i < symbols.length - 1 ? "1px solid #1a1208" : "none",
            }}>
              <span style={{ fontSize: 20, width: 30, textAlign: "center" }}>{s.icon}</span>
              <span style={{ flex: 1, fontSize: 11, color: s.color }}>{s.name}</span>
              <span style={{ fontSize: 11, color: "#6a5a30" }}>×3 = <span style={{ color: s.color, fontWeight: "bold" }}>{s.mult}x</span></span>
              <span style={{ fontSize: 10, color: "#4a3a20" }}>×2 = {(s.mult * 0.2).toFixed(1)}x</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: "#5a4a28", marginTop: 6, textAlign: "center", lineHeight: 1.4 }}>
            Linie: Środkowa • Górna • Dolna • V-kształt • Λ-kształt<br/>
            Korona ×3 na środkowej = 50x stawki!
          </div>
        </div>
      )}
    </div>
  );
}

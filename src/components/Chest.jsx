import { useState, useCallback } from "react";

const CLICKS_TO_OPEN = 8;

// Visual stages: closed → cracked → half-open → open
function getStage(clicks) {
  if (clicks <= 0) return 0;
  if (clicks < 3) return 1;
  if (clicks < 6) return 2;
  return 3;
}

function GoldPile() {
  return (
    <g>
      {/* Subtle gold mound */}
      <ellipse cx="40" cy="64" rx="32" ry="8" fill="#8a7040" />
      <ellipse cx="40" cy="63" rx="29" ry="6" fill="#a08850" />
      <ellipse cx="40" cy="62" rx="25" ry="5" fill="#b09860" />
      {/* Small coins */}
      {[
        { x: 20, y: 60, r: 2.2 }, { x: 30, y: 58, r: 2 }, { x: 42, y: 57, r: 2.2 },
        { x: 54, y: 59, r: 2 }, { x: 64, y: 60, r: 2.2 },
        { x: 26, y: 62, r: 1.8 }, { x: 48, y: 61, r: 1.8 },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.x} cy={c.y} rx={c.r} ry={c.r * 0.55} fill="#c0a050" stroke="#8a7040" strokeWidth="0.4" />
          <ellipse cx={c.x - 0.3} cy={c.y - 0.3} rx={c.r * 0.4} ry={c.r * 0.2} fill="#d0b870" opacity="0.5" />
        </g>
      ))}
      {/* Subtle glitters */}
      {[
        { x: 28, y: 59 }, { x: 50, y: 58 }, { x: 38, y: 61 },
      ].map((s, i) => (
        <circle key={`gl${i}`} cx={s.x} cy={s.y} r="0.7" fill="#e0d0a0" opacity="0.6">
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur={`${1.8 + i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function ChestBody({ stage }) {
  const lidLiftY = [0, -4, -14, -30][stage] || 0;
  const lidTilt = [0, -2, -6, -12][stage] || 0;
  const innerGlow = stage >= 1 ? Math.min(1, stage * 0.3) : 0;

  return (
    <g transform="translate(40, 14)">
      {/* Inner glow when opening */}
      {innerGlow > 0 && (
        <ellipse cx="0" cy="10" rx={18 + stage * 4} ry={6 + stage * 3}
          fill="#c0a050" opacity={innerGlow * 0.35}
          filter="url(#chestGlow)" />
      )}

      {/* Chest body */}
      <rect x="-24" y="7" width="48" height="26" rx="2" fill="#4a3420" stroke="#33220e" strokeWidth="1" />
      <rect x="-22" y="9" width="44" height="22" rx="1.5" fill="#5a4028" />
      {/* Wood grain */}
      <line x1="-21" y1="16" x2="21" y2="16" stroke="#4a3418" strokeWidth="0.5" opacity="0.4" />
      <line x1="-21" y1="23" x2="21" y2="23" stroke="#4a3418" strokeWidth="0.5" opacity="0.4" />

      {/* Metal bands - aged bronze */}
      <rect x="-25" y="7" width="50" height="3" rx="0.5" fill="url(#bandGrad)" />
      <rect x="-25" y="19" width="50" height="2" rx="0.5" fill="url(#bandGrad)" />
      <rect x="-25" y="30" width="50" height="3" rx="0.5" fill="url(#bandGrad)" />
      {/* Vertical band */}
      <rect x="-2" y="7" width="4" height="26" fill="url(#bandGrad)" />

      {/* Corner rivets */}
      {[-20, -10, 8, 18].map(cx => (
        <circle key={cx} cx={cx} cy="9" r="1.8" fill="#9a8050" stroke="#706030" strokeWidth="0.5" />
      ))}

      {/* Lock plate */}
      <rect x="-5" y="3" width="10" height="10" rx="1.5" fill="#9a8050" stroke="#706030" strokeWidth="0.7" />
      <rect x="-2" y="7" width="4" height="3.5" rx="0.7" fill="#1a0e06" />
      {stage < 3 && <circle cx="0" cy="8.5" r="1" fill="#b8a060" opacity="0.5" />}

      {/* Treasure visible inside */}
      {stage >= 2 && (
        <g opacity={stage === 2 ? 0.4 : 0.9}>
          <rect x="-18" y="9" width="36" height="7" rx="1" fill="#b09860" opacity="0.25" />
          {[
            { x: -10, y: 12 }, { x: -3, y: 11 }, { x: 4, y: 12 },
            { x: 10, y: 11 },
          ].map((c, i) => (
            <ellipse key={`ic${i}`} cx={c.x} cy={c.y} rx="2" ry="1.2" fill="#c0a050" stroke="#8a7040" strokeWidth="0.3" />
          ))}
          {/* Small gems */}
          <polygon points="-1,11 0,9.5 1,11 0,12.5" fill="#c06060" stroke="#904040" strokeWidth="0.2" />
          <polygon points="7,10 8,9 9,10 8,11.5" fill="#6090b0" stroke="#405868" strokeWidth="0.2" />
        </g>
      )}

      {/* Lid */}
      <g style={{ transition: "transform 0.3s ease-out" }} transform={`translate(0, ${lidLiftY}) rotate(${lidTilt}, 0, 7)`}>
        <path d="M-25,7 L-21,-5 L21,-5 L25,7 Z" fill="#5a4028" stroke="#33220e" strokeWidth="1" />
        <path d="M-22,5.5 L-18,-2.5 L18,-2.5 L22,5.5 Z" fill="#65482e" />
        {/* Lid band */}
        <rect x="-25" y="4" width="50" height="3" rx="0.5" fill="url(#bandGrad)" />
        {/* Lid vertical band */}
        <rect x="-2" y="-5" width="4" height="12" fill="url(#bandGrad)" />
        {/* Lid rivets */}
        {[-19, -9, 7, 17].map(cx => (
          <circle key={`lr${cx}`} cx={cx} cy="5.5" r="1.5" fill="#9a8050" stroke="#706030" strokeWidth="0.4" />
        ))}
      </g>
    </g>
  );
}

export default function Chest({ pos, onClick, clicks = 0, maxClicks = CLICKS_TO_OPEN }) {
  if (!pos) return null;
  const [shaking, setShaking] = useState(false);

  const stage = getStage(clicks);
  const isOpen = clicks >= maxClicks;

  const handleClick = useCallback((e) => {
    if (isOpen) return;
    setShaking(true);
    setTimeout(() => setShaking(false), 200);
    onClick(e);
  }, [isOpen, onClick]);

  const progress = Math.min(1, clicks / maxClicks);

  return (
    <div
      onClick={handleClick}
      style={{
        position: "absolute",
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        zIndex: 15,
        cursor: isOpen ? "default" : "pointer",
        filter: `drop-shadow(0 0 ${6 + stage * 3}px rgba(160,128,60,${0.3 + stage * 0.12}))`,
        animation: isOpen ? "none" : "chestG 2.5s ease-in-out infinite",
        userSelect: "none",
        transform: `translate(-50%, -50%) ${shaking ? `translate(${Math.random() > 0.5 ? 2 : -2}px, ${Math.random() > 0.5 ? 1 : -1}px)` : ""}`,
        transition: shaking ? "none" : "filter 0.3s",
      }}
    >
      <svg width="80" height="72" viewBox="0 0 80 72">
        <defs>
          <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b0985a" />
            <stop offset="50%" stopColor="#9a8050" />
            <stop offset="100%" stopColor="#706030" />
          </linearGradient>
          <filter id="chestGlow">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <GoldPile />
        <ChestBody stage={stage} />
      </svg>

      {/* Click progress indicator */}
      {!isOpen && clicks > 0 && (
        <div style={{
          position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
          width: 44, height: 4, background: "rgba(0,0,0,0.45)", borderRadius: 2,
          border: "1px solid rgba(160,128,60,0.35)",
        }}>
          <div style={{
            width: `${progress * 100}%`, height: "100%",
            background: "linear-gradient(90deg, #9a8050, #c0a050)",
            borderRadius: 2, transition: "width 0.15s",
            boxShadow: "0 0 3px rgba(192,160,80,0.4)",
          }} />
        </div>
      )}

      {/* "Click!" hint */}
      {!isOpen && clicks === 0 && (
        <div style={{
          position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
          color: "#c0a060", fontSize: 10, fontWeight: "bold", whiteSpace: "nowrap",
          textShadow: "0 0 4px rgba(160,128,60,0.4), 0 1px 2px rgba(0,0,0,0.8)",
          animation: "chestHint 1.5s ease-in-out infinite",
        }}>
          Kliknij!
        </div>
      )}
    </div>
  );
}

export { CLICKS_TO_OPEN };

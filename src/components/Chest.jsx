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
      {/* Base gold pile - large mound */}
      <ellipse cx="60" cy="95" rx="55" ry="14" fill="#b8860b" />
      <ellipse cx="60" cy="93" rx="52" ry="12" fill="#d4a030" />
      <ellipse cx="60" cy="91" rx="48" ry="10" fill="#e0b840" />
      {/* Individual coins scattered on pile */}
      {[
        { x: 18, y: 88, r: 4 }, { x: 30, y: 85, r: 3.5 }, { x: 45, y: 83, r: 4 },
        { x: 70, y: 84, r: 3.5 }, { x: 85, y: 86, r: 4 }, { x: 100, y: 88, r: 3 },
        { x: 25, y: 92, r: 3 }, { x: 55, y: 87, r: 3.5 }, { x: 78, y: 90, r: 3 },
        { x: 40, y: 90, r: 2.5 }, { x: 65, y: 91, r: 2.5 }, { x: 92, y: 92, r: 3 },
        { x: 12, y: 94, r: 3.5 }, { x: 108, y: 93, r: 3 },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.x} cy={c.y} rx={c.r} ry={c.r * 0.6} fill="#ffd700" stroke="#b8860b" strokeWidth="0.5" />
          <ellipse cx={c.x - 0.5} cy={c.y - 0.5} rx={c.r * 0.5} ry={c.r * 0.3} fill="#ffe860" opacity="0.6" />
        </g>
      ))}
      {/* Glitter spots */}
      {[
        { x: 35, y: 86 }, { x: 75, y: 85 }, { x: 50, y: 89 },
        { x: 20, y: 91 }, { x: 95, y: 89 },
      ].map((s, i) => (
        <circle key={`gl${i}`} cx={s.x} cy={s.y} r="1" fill="#fff8dc" opacity="0.8">
          <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function ChestBody({ stage, shaking }) {
  // Lid angle based on stage: 0=closed, 1=cracked(5deg), 2=half(25deg), 3=open(55deg)
  const lidAngles = [0, -8, -28, -55];
  const lidAngle = lidAngles[stage] || 0;
  // Glow inside when opening
  const innerGlow = stage >= 2 ? Math.min(1, (stage - 1) * 0.4) : 0;

  return (
    <g transform={`translate(60, 20) ${shaking ? "" : ""}`}>
      {/* Inner glow when chest starts opening */}
      {innerGlow > 0 && (
        <ellipse cx="0" cy="20" rx={28 + stage * 4} ry={8 + stage * 3}
          fill="#ffd700" opacity={innerGlow * 0.35}
          filter="url(#chestInnerGlow)" />
      )}

      {/* Chest body (bottom part) */}
      <rect x="-38" y="10" width="76" height="38" rx="3" fill="#5a3a18" stroke="#3a2410" strokeWidth="1.5" />
      <rect x="-36" y="12" width="72" height="34" rx="2" fill="#6a4422" />
      {/* Wood grain */}
      <line x1="-34" y1="22" x2="34" y2="22" stroke="#5a3618" strokeWidth="0.8" opacity="0.5" />
      <line x1="-34" y1="32" x2="34" y2="32" stroke="#5a3618" strokeWidth="0.8" opacity="0.5" />

      {/* Metal bands on body */}
      <rect x="-40" y="10" width="80" height="4" rx="1" fill="url(#goldBandChest)" />
      <rect x="-40" y="28" width="80" height="3" rx="1" fill="url(#goldBandChest)" />
      <rect x="-40" y="44" width="80" height="4" rx="1" fill="url(#goldBandChest)" />
      {/* Vertical band */}
      <rect x="-3" y="10" width="6" height="38" fill="url(#goldBandChest)" />

      {/* Corner rivets */}
      {[-34, -18, 16, 32].map(cx => (
        <circle key={cx} cx={cx} cy="12" r="3" fill="#d4a030" stroke="#a07020" strokeWidth="0.7" />
      ))}

      {/* Lock plate */}
      <rect x="-8" y="5" width="16" height="14" rx="2" fill="#d4a030" stroke="#a07020" strokeWidth="1" />
      <rect x="-3" y="10" width="6" height="5" rx="1" fill="#1a0e06" />
      {stage < 3 && <circle cx="0" cy="12" r="1.5" fill="#ffd700" opacity="0.6" />}

      {/* Lid - rotates around top hinge */}
      <g transform={`rotate(${lidAngle}, 0, 10)`}>
        <path d="M-40,10 L-34,-8 L34,-8 L40,10 Z" fill="#6a4420" stroke="#3a2410" strokeWidth="1.5" />
        <path d="M-36,8 L-30,-4 L30,-4 L36,8 Z" fill="#7a5430" />
        {/* Lid band */}
        <rect x="-40" y="6" width="80" height="4" rx="1" fill="url(#goldBandChest)" />
        {/* Lid vertical band */}
        <rect x="-3" y="-8" width="6" height="18" fill="url(#goldBandChest)" />
        {/* Lid rivets */}
        {[-32, -16, 14, 30].map(cx => (
          <circle key={`lr${cx}`} cx={cx} cy="8" r="2.5" fill="#d4a030" stroke="#a07020" strokeWidth="0.6" />
        ))}
      </g>

      {/* Treasure visible inside when open */}
      {stage >= 2 && (
        <g opacity={stage === 2 ? 0.5 : 1}>
          {/* Gold glow inside */}
          <rect x="-30" y="12" width="60" height="10" rx="2" fill="#ffd700" opacity="0.3" />
          {/* Mini coins inside */}
          {[
            { x: -18, y: 16 }, { x: -8, y: 14 }, { x: 5, y: 15 },
            { x: 16, y: 16 }, { x: -12, y: 18 }, { x: 10, y: 18 },
          ].map((c, i) => (
            <ellipse key={`ic${i}`} cx={c.x} cy={c.y} rx="3" ry="2" fill="#ffd700" stroke="#b8860b" strokeWidth="0.4" />
          ))}
          {/* Gem inside */}
          <polygon points="-2,14 0,11 2,14 0,17" fill="#ff4444" stroke="#aa0000" strokeWidth="0.3" />
          <polygon points="12,13 14,11 16,13 14,16" fill="#44aaff" stroke="#0066aa" strokeWidth="0.3" />
        </g>
      )}
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
        filter: `drop-shadow(0 0 ${12 + stage * 4}px rgba(212,160,48,${0.4 + stage * 0.15}))`,
        animation: isOpen ? "none" : "chestG 2.5s ease-in-out infinite",
        userSelect: "none",
        transform: `translate(-50%, -50%) ${shaking ? `translate(${Math.random() > 0.5 ? 3 : -3}px, ${Math.random() > 0.5 ? 2 : -2}px)` : ""}`,
        transition: shaking ? "none" : "filter 0.3s",
      }}
    >
      <svg width="120" height="110" viewBox="0 0 120 110">
        <defs>
          <linearGradient id="goldBandChest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8d060" />
            <stop offset="50%" stopColor="#d4a030" />
            <stop offset="100%" stopColor="#a07020" />
          </linearGradient>
          <filter id="chestInnerGlow">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <GoldPile />
        <ChestBody stage={stage} shaking={shaking} />
      </svg>

      {/* Click progress indicator */}
      {!isOpen && clicks > 0 && (
        <div style={{
          position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
          width: 60, height: 5, background: "rgba(0,0,0,0.5)", borderRadius: 3,
          border: "1px solid rgba(212,160,48,0.4)",
        }}>
          <div style={{
            width: `${progress * 100}%`, height: "100%",
            background: "linear-gradient(90deg, #d4a030, #ffd700)",
            borderRadius: 3, transition: "width 0.15s",
            boxShadow: "0 0 4px rgba(255,215,0,0.6)",
          }} />
        </div>
      )}

      {/* "Click!" hint */}
      {!isOpen && clicks === 0 && (
        <div style={{
          position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)",
          color: "#ffd700", fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap",
          textShadow: "0 0 6px rgba(255,215,0,0.5), 0 1px 2px rgba(0,0,0,0.8)",
          animation: "chestHint 1.5s ease-in-out infinite",
        }}>
          Kliknij!
        </div>
      )}
    </div>
  );
}

export { CLICKS_TO_OPEN };

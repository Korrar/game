export default function Chest({ pos, onClick }) {
  if (!pos) return null;
  return (
    <div onClick={onClick} style={{
      position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 15,
      cursor: "pointer",
      filter: "drop-shadow(0 0 14px rgba(212,160,48,0.6))",
      animation: "chestG 2.5s ease-in-out infinite", userSelect: "none",
    }}>
      <svg width="60" height="44" viewBox="0 0 60 44">
        {/* Main body */}
        <rect x="6" y="18" width="48" height="24" fill="#5a3a18"/>
        <rect x="6" y="18" width="48" height="2" fill="#4a2a10"/>
        {/* Lid */}
        <polygon points="4,20 10,6 50,6 56,20" fill="#6a4420"/>
        <polygon points="8,18 12,8 48,8 52,18" fill="#7a5430"/>
        {/* Metal bands */}
        <rect x="4" y="18" width="52" height="3" fill="url(#goldBand)"/>
        <rect x="4" y="30" width="52" height="3" fill="url(#goldBand)"/>
        <rect x="4" y="38" width="52" height="3" fill="url(#goldBand)"/>
        <rect x="28" y="6" width="4" height="36" fill="url(#goldBand)"/>
        {/* Lock plate */}
        <rect x="25" y="15" width="10" height="10" rx="1" fill="#d4a030" stroke="#a07020" strokeWidth="0.5"/>
        <rect x="28" y="19" width="4" height="3" fill="#0a0604"/>
        {/* Corner studs */}
        {[10,20,40,50].map(cx => (
          <circle key={cx} cx={cx} cy="20" r="2.5" fill="#d4a030" stroke="#a07020" strokeWidth="0.5"/>
        ))}
        {/* Gold gradient definition */}
        <defs>
          <linearGradient id="goldBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0c060"/>
            <stop offset="50%" stopColor="#d4a030"/>
            <stop offset="100%" stopColor="#a07020"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Chest({ pos, onClick }) {
  if (!pos) return null;
  return (
    <div onClick={onClick} style={{
      position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 15,
      cursor: "pointer", filter: "drop-shadow(0 0 10px rgba(160,120,40,0.5))",
      animation: "chestG 2.5s ease-in-out infinite", userSelect: "none",
    }}>
      <svg width="60" height="44" viewBox="0 0 60 44">
        <rect x="6" y="18" width="48" height="24" fill="#5a3a18"/>
        <rect x="6" y="18" width="48" height="2" fill="#4a2a10"/>
        <polygon points="4,20 10,6 50,6 56,20" fill="#6a4420"/>
        <polygon points="8,18 12,8 48,8 52,18" fill="#7a5430"/>
        <rect x="4" y="18" width="52" height="3" fill="#a08030"/>
        <rect x="4" y="30" width="52" height="3" fill="#a08030"/>
        <rect x="4" y="38" width="52" height="3" fill="#a08030"/>
        <rect x="28" y="6" width="4" height="36" fill="#a08030"/>
        <rect x="26" y="16" width="8" height="8" fill="#d4a030"/>
        <rect x="28" y="19" width="4" height="3" fill="#0a0604"/>
        {[10,20,40,50].map(cx => <circle key={cx} cx={cx} cy="20" r="2" fill="#c0a040"/>)}
      </svg>
    </div>
  );
}

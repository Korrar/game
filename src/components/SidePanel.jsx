export default function SidePanel({ open, side, width, children, onClose, title, isMobile }) {
  const m = isMobile;

  if (m) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 300,
        background: "linear-gradient(180deg,#0e0808,#080406)",
        padding: "44px 10px 80px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <button onClick={onClose} style={{
          position: "fixed", top: 6, right: 10, background: "linear-gradient(180deg,#1a1008,#0e0804)", border: "1px solid #7a5020",
          color: "#e0b840", fontSize: 22, cursor: "pointer", zIndex: 310,
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 4, WebkitTapHighlightColor: "transparent",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>✕</button>
        <h2 style={{
          fontWeight: "bold", fontSize: 16, color: "#ffd700", marginBottom: 10,
          textShadow: "0 0 8px rgba(212,160,48,0.3), 2px 2px 0 #000",
          borderBottom: "1px solid rgba(212,160,48,0.2)", paddingBottom: 8,
        }}>{title}</h2>
        {children}
      </div>
    );
  }

  const s = {
    position: "fixed", top: 0, [side]: open ? 0 : -(width + 20), width, height: "100vh",
    zIndex: 300, padding: "56px 14px 80px", overflowY: "auto",
    background: "linear-gradient(180deg,#0e0808,#080406)",
    borderLeft: side === "right" ? "2px solid #5a3818" : "none",
    borderRight: side === "left" ? "2px solid #5a3818" : "none",
    boxShadow: "inset 0 0 20px rgba(0,0,0,0.6), 0 0 24px rgba(0,0,0,0.7), inset 0 0 60px rgba(212,160,48,0.03)",
    transition: `${side} 0.35s cubic-bezier(0.4,0,0.2,1)`,
  };
  return (
    <div style={s}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #d4a030, transparent)" }} />
      <div style={{ position: "absolute", top: 12, left: 12, width: 5, height: 5, background: "radial-gradient(circle at 35% 35%, #ffe080, #a07020)", borderRadius: 1, transform: "rotate(45deg)", boxShadow: "0 0 4px rgba(212,160,48,0.4)" }} />
      <div style={{ position: "absolute", top: 12, right: 50, width: 5, height: 5, background: "radial-gradient(circle at 35% 35%, #ffe080, #a07020)", borderRadius: 1, transform: "rotate(45deg)", boxShadow: "0 0 4px rgba(212,160,48,0.4)" }} />
      <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "#7a5020", fontSize: 26, cursor: "pointer", textShadow: "0 0 6px rgba(212,160,48,0.3)" }}>✕</button>
      <h2 style={{
        fontWeight: "bold", fontSize: 20, marginBottom: 14, color: "#ffd700",
        textShadow: "0 0 10px rgba(212,160,48,0.3), 2px 2px 0 #000",
        borderBottom: "1px solid rgba(212,160,48,0.2)", paddingBottom: 10,
        background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundSize: "200% 100%", animation: "shimmer 4s ease-in-out infinite",
      }}>{title}</h2>
      {children}
    </div>
  );
}

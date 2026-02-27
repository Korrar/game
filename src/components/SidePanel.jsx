export default function SidePanel({ open, side, width, children, onClose, title, isMobile }) {
  const m = isMobile;

  if (m) {
    // Mobile: slide up from bottom, full screen overlay
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 300,
        background: "linear-gradient(180deg,#1a1210,#140a08)",
        padding: "40px 10px 10px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <button onClick={onClose} style={{
          position: "fixed", top: 6, right: 10, background: "rgba(20,10,8,0.9)", border: "2px solid #5a4030",
          color: "#d4a030", fontSize: 22, cursor: "pointer", zIndex: 310,
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, WebkitTapHighlightColor: "transparent",
        }}>✕</button>
        <h2 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 10, textShadow: "2px 2px 0 #000" }}>{title}</h2>
        {children}
      </div>
    );
  }

  // Desktop: side panel slide from left/right
  const s = {
    position: "fixed", top: 0, [side]: open ? 0 : -(width + 20), width, height: "100vh",
    zIndex: 300, padding: "56px 14px 14px", overflowY: "auto",
    background: "linear-gradient(180deg,#1a1210,#140a08)", border: "3px solid #5a4030",
    boxShadow: "inset 0 0 15px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.6)",
    transition: `${side} 0.35s cubic-bezier(0.4,0,0.2,1)`,
  };
  return (
    <div style={s}>
      <button onClick={onClose} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#888", fontSize: 28, cursor: "pointer" }}>✕</button>
      <h2 style={{ fontWeight: "bold", fontSize: 20, color: "#d4a030", marginBottom: 12, textShadow: "2px 2px 0 #000" }}>{title}</h2>
      {children}
    </div>
  );
}

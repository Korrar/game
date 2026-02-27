export default function SidePanel({ open, side, width, children, onClose, title, isMobile }) {
  const m = isMobile;
  const actualWidth = m ? "100vw" : width;
  const s = {
    position: "fixed", top: 0, [side]: open ? 0 : -(m ? window.innerWidth + 20 : width + 20), width: actualWidth, height: "100vh",
    zIndex: 300, padding: m ? "48px 10px 10px" : "56px 14px 14px", overflowY: "auto",
    background: "linear-gradient(180deg,#1a1210,#140a08)", border: "3px solid #5a4030",
    boxShadow: "inset 0 0 15px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.6)",
    transition: `${side} 0.35s cubic-bezier(0.4,0,0.2,1)`,
    WebkitOverflowScrolling: "touch",
  };
  return (
    <div style={s}>
      <button onClick={onClose} style={{
        position: "absolute", top: 8, right: 10, background: "none", border: "none",
        color: "#888", fontSize: m ? 32 : 28, cursor: "pointer",
        minWidth: m ? 44 : "auto", minHeight: m ? 44 : "auto",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>✕</button>
      <h2 style={{ fontWeight: "bold", fontSize: m ? 18 : 20, color: "#d4a030", marginBottom: 12, textShadow: "2px 2px 0 #000" }}>{title}</h2>
      {children}
    </div>
  );
}

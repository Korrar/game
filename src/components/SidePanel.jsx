export default function SidePanel({ open, side, width, children, onClose, title }) {
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

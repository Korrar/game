export default function Door({ hasKey, onClick }) {
  return (
    <div onClick={onClick} style={{
      position: "absolute", top: 56, right: 10,
      zIndex: 10, cursor: hasKey ? "pointer" : "not-allowed",
      filter: hasKey
        ? "drop-shadow(0 0 16px rgba(212,160,48,0.8))"
        : "brightness(0.6) saturate(0.5)",
      transition: "filter 0.3s, transform 0.2s",
      transform: "scale(0.55)", transformOrigin: "top right",
    }}>
      {!hasKey && <div style={{ position: "absolute", top: -32, left: "50%", transform: "translateX(-50%)", fontSize: 28, animation: "lockP 1.5s infinite" }}>🔒</div>}
      <div style={{
        width: 120, height: 190, border: "5px solid #7a5a30", borderRadius: "50% 50% 0 0 / 30% 30% 0 0",
        background: "linear-gradient(180deg,#4a2a12,#3a1e0a)", boxShadow: "0 0 30px rgba(0,0,0,0.8),inset 0 0 20px rgba(0,0,0,0.5)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Planks */}
        {[18, 38, 58, 78].map(l => <div key={l} style={{ position: "absolute", top: 0, bottom: 0, left: `${l}%`, borderRight: "1px solid rgba(0,0,0,0.3)", borderLeft: "1px solid rgba(80,60,30,0.2)" }} />)}
        {/* Hinges - metallic */}
        {[20, 50, 78].map((t, i) => <div key={i} style={{ position: "absolute", left: -4, top: `${t}%`, width: 16, height: 8, background: "linear-gradient(180deg,#888,#555)", borderRadius: 2, border: "1px solid #444", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />)}
        {/* Ornamental ring - gold */}
        <div style={{ position: "absolute", right: 15, top: "45%", width: 22, height: 26, border: "4px solid #d4a030", borderRadius: "50%", transform: "translateY(-50%)", boxShadow: "0 0 8px rgba(212,160,48,0.4)" }} />
        {/* Gold studs */}
        <div style={{ position: "absolute", top: 12, left: 10, right: 10, display: "flex", justifyContent: "space-between" }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: 9, height: 9, background: "radial-gradient(circle at 35% 35%,#e0c060,#a07020)", borderRadius: "50%", border: "1px solid #806020", boxShadow: "0 0 4px rgba(212,160,48,0.3)" }} />)}
        </div>
        {/* Bottom studs */}
        <div style={{ position: "absolute", bottom: 12, left: 10, right: 10, display: "flex", justifyContent: "space-between" }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: 9, height: 9, background: "radial-gradient(circle at 35% 35%,#e0c060,#a07020)", borderRadius: "50%", border: "1px solid #806020", boxShadow: "0 0 4px rgba(212,160,48,0.3)" }} />)}
        </div>
      </div>
      {/* Stone frame with runes */}
      <div style={{ position: "absolute", top: -10, left: -14, right: -14, bottom: -4, border: "7px solid #5a4020", borderRadius: "50% 50% 0 0 / 25% 25% 0 0", zIndex: -1, background: "linear-gradient(180deg,#6a5030,#4a3018)", boxShadow: hasKey ? "0 0 20px rgba(212,160,48,0.3)" : "none" }} />
      {/* Label */}
      <div style={{
        textAlign: "center", marginTop: 4, fontWeight: "bold",
        fontSize: 16, color: hasKey ? "#d4a030" : "#555",
        textShadow: hasKey ? "0 0 8px rgba(212,160,48,0.4)" : "1px 1px 0 #000",
        animation: hasKey ? "doorGlow 2s ease-in-out infinite" : "none",
      }}>🚪 Wrota</div>
    </div>
  );
}

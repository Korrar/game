import { SPELLS } from "../data/npcs";

const overlayStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.65)",
};

const panelStyle = {
  padding: "24px 32px", textAlign: "center",
  background: "linear-gradient(180deg, #1a0e08, #120806)",
  border: "2px solid #5a3818",
  borderRadius: 10,
  boxShadow: "inset 0 0 25px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.7), 0 0 60px rgba(212,160,48,0.08)",
  minWidth: 340, maxWidth: 440,
  position: "relative", overflow: "hidden",
};

const spellBtnStyle = (color, hover) => ({
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 16px", marginBottom: 6, width: "100%",
  background: hover ? `${color}18` : "rgba(10,6,4,0.6)",
  border: `2px solid ${color}40`,
  color: "#d8c8a8", fontSize: 14, cursor: "pointer",
  transition: "all 0.2s",
  textAlign: "left",
  borderRadius: 6,
  boxShadow: hover ? `0 0 12px ${color}33, inset 0 0 8px ${color}11` : "inset 0 0 6px rgba(0,0,0,0.3)",
});

export default function SpellMenu({ target, onCast, onClose }) {
  if (!target) return null;
  const isNpc = target.type === "npc";
  const label = isNpc ? target.data.name : target.data.shelter.name;
  const emoji = isNpc ? target.data.emoji : target.data.shelter.emoji;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={panelStyle}>
        {/* Top gold accent line */}
        <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,48,0.4), transparent)" }} />
        {/* Corner gems */}
        <div style={{ position: "absolute", top: 4, left: 8, fontSize: 8, color: "#d4a030", opacity: 0.5 }}>◆</div>
        <div style={{ position: "absolute", top: 4, right: 8, fontSize: 8, color: "#d4a030", opacity: 0.5 }}>◆</div>

        <div style={{ fontSize: 52, marginBottom: 4, filter: "drop-shadow(0 0 12px rgba(200,150,50,0.3))" }}>{emoji}</div>
        <div style={{
          fontWeight: "bold", fontSize: 19, color: "#e8d0a0", marginBottom: 2,
          textShadow: "0 0 8px rgba(200,150,50,0.3)",
        }}>{label}</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          {isNpc ? "Wybierz czar, aby zaatakować" : "Wybierz czar, aby zniszczyć"}
        </div>

        {SPELLS.map(spell => (
          <button
            key={spell.id}
            style={spellBtnStyle(spell.color, false)}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${spell.color}20`;
              e.currentTarget.style.borderColor = spell.color;
              e.currentTarget.style.boxShadow = `0 0 16px ${spell.color}44, inset 0 0 10px ${spell.color}18`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(10,6,4,0.6)";
              e.currentTarget.style.borderColor = `${spell.color}40`;
              e.currentTarget.style.boxShadow = "inset 0 0 6px rgba(0,0,0,0.3)";
            }}
            onClick={() => onCast(spell, target)}
          >
            <span style={{ fontSize: 28, filter: `drop-shadow(0 0 6px ${spell.color}66)` }}>{spell.icon}</span>
            <div>
              <div style={{ fontWeight: "bold", color: spell.color, textShadow: `0 0 6px ${spell.color}33` }}>{spell.name}</div>
              <div style={{ fontSize: 12, color: "#777" }}>{spell.desc}</div>
            </div>
          </button>
        ))}

        <button onClick={onClose} style={{
          marginTop: 10, background: "rgba(10,6,4,0.6)", border: "2px solid #3a2818",
          color: "#888", fontWeight: "bold", fontSize: 13, padding: "6px 20px", cursor: "pointer",
          borderRadius: 6, transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#5a3818"; e.currentTarget.style.color = "#aaa"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#3a2818"; e.currentTarget.style.color = "#888"; }}
        >Anuluj</button>
      </div>
    </div>
  );
}

import { SPELLS } from "../data/npcs";

const overlayStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.55)",
};

const panelStyle = {
  padding: "20px 28px", textAlign: "center",
  background: "#1a0e12", border: "3px solid #5a4030",
  boxShadow: "inset 0 0 20px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.6)",
  minWidth: 320, maxWidth: 420,
};

const spellBtnStyle = (color, hover) => ({
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 14px", marginBottom: 6, width: "100%",
  background: hover ? `${color}18` : "rgba(255,255,255,0.02)",
  border: `2px solid ${color}60`,
  color: "#d8c8a8", fontSize: 14, cursor: "pointer",
  transition: "all 0.15s",
  textAlign: "left",
});

export default function SpellMenu({ target, onCast, onClose }) {
  if (!target) return null;
  const isNpc = target.type === "npc";
  const label = isNpc ? target.data.name : target.data.shelter.name;
  const emoji = isNpc ? target.data.emoji : target.data.shelter.emoji;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={panelStyle}>
        <div style={{ fontSize: 48, marginBottom: 4 }}>{emoji}</div>
        <div style={{ fontWeight: "bold", fontSize: 18, color: "#d8c8a8", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>
          {isNpc ? "Wybierz czar, aby zaatakować" : "Wybierz czar, aby zniszczyć"}
        </div>

        {SPELLS.map(spell => (
          <button
            key={spell.id}
            style={spellBtnStyle(spell.color, false)}
            onMouseEnter={e => { e.currentTarget.style.background = `${spell.color}20`; e.currentTarget.style.borderColor = spell.color; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = `${spell.color}60`; }}
            onClick={() => onCast(spell, target)}
          >
            <span style={{ fontSize: 26 }}>{spell.icon}</span>
            <div>
              <div style={{ fontWeight: "bold", color: spell.color }}>{spell.name}</div>
              <div style={{ fontSize: 12, color: "#777" }}>{spell.desc}</div>
            </div>
          </button>
        ))}

        <button onClick={onClose} style={{
          marginTop: 8, background: "none", border: "2px solid #3a2818",
          color: "#888", fontWeight: "bold", fontSize: 13, padding: "5px 18px", cursor: "pointer",
        }}>Anuluj</button>
      </div>
    </div>
  );
}

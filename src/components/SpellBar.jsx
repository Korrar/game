import { useState, useEffect } from "react";
import { SPELLS } from "../data/npcs";

const SPELLS_PER_PAGE = 5;

const barStyle = {
  position: "fixed",
  bottom: 0, left: "50%", transform: "translateX(-50%)",
  zIndex: 100,
  display: "flex", alignItems: "stretch", gap: 0,
  padding: "8px 6px",
  background: "linear-gradient(180deg, #1a0e12ee, #0e0608f0)",
  border: "3px solid #5a4030",
  borderBottom: "none",
  borderRadius: "12px 12px 0 0",
  boxShadow: "0 -4px 20px rgba(0,0,0,0.6)",
};

const manaBoxStyle = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center",
  padding: "4px 10px", marginRight: 4,
  borderRight: "2px solid #2a1e14",
};

const slotStyle = (spell, selected, canCast) => ({
  position: "relative",
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center",
  padding: "5px 7px",
  border: `2px solid ${selected ? spell.color : spell.color + "40"}`,
  background: selected ? `${spell.color}18` : "rgba(255,255,255,0.02)",
  cursor: canCast ? "grab" : "not-allowed",
  transition: "border-color 0.15s, background 0.15s",
  minWidth: 60,
  userSelect: "none",
  overflow: "hidden",
});

const arrowBtnStyle = (enabled) => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 22, minWidth: 22,
  cursor: enabled ? "pointer" : "default",
  opacity: enabled ? 0.8 : 0.2,
  color: "#d4a030",
  fontSize: 18,
  fontWeight: "bold",
  userSelect: "none",
  transition: "opacity 0.15s",
  background: "none",
  border: "none",
  padding: 0,
});

const pageDotsStyle = {
  display: "flex", gap: 3, justifyContent: "center",
  position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
};

export default function SpellBar({ mana, selectedSpell, cooldowns, learnedSpells, onSelect, onDragStart }) {
  const [, tick] = useState(0);
  const [page, setPage] = useState(0);

  // Re-render periodically while any cooldown is active
  useEffect(() => {
    const hasCD = Object.values(cooldowns).some(t => t > Date.now());
    if (!hasCD) return;
    const id = setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(id);
  }, [cooldowns]);

  const now = Date.now();
  const known = learnedSpells || SPELLS.filter(s => s.learned).map(s => s.id);
  const knownSpells = SPELLS.filter(s => known.includes(s.id));
  const totalPages = Math.max(1, Math.ceil(knownSpells.length / SPELLS_PER_PAGE));

  // Clamp page if spells changed
  const safePage = Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);

  const pageSpells = knownSpells.slice(safePage * SPELLS_PER_PAGE, (safePage + 1) * SPELLS_PER_PAGE);
  const hasPrev = safePage > 0;
  const hasNext = safePage < totalPages - 1;

  return (
    <div style={barStyle}>
      {/* Mana display */}
      <div style={manaBoxStyle}>
        <div style={{ fontSize: 24 }}>🔮</div>
        <div style={{ fontWeight: "bold", fontSize: 14, color: "#60a0ff", textShadow: "0 0 8px rgba(60,120,255,0.4)" }}>{mana}/100</div>
        <div style={{ fontSize: 9, color: "#4466aa", letterSpacing: 1 }}>MANA</div>
      </div>

      {/* Left arrow */}
      <div
        style={arrowBtnStyle(hasPrev)}
        onClick={() => hasPrev && setPage(p => p - 1)}
        onMouseEnter={e => { if (hasPrev) e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = hasPrev ? "0.8" : "0.2"; }}
      >◀</div>

      {/* Spell slots – current page */}
      <div style={{ display: "flex", gap: 6, position: "relative" }}>
        {pageSpells.map(spell => {
          const cdEnd = cooldowns[spell.id] || 0;
          const onCooldown = cdEnd > now;
          const cdPct = onCooldown ? (cdEnd - now) / spell.cooldown : 0;
          const isSelected = selectedSpell === spell.id;
          const isSummon = spell.id === "summon";
          const isAoe = !!spell.aoe;
          const canCast = isSummon
            ? !onCooldown
            : mana >= spell.manaCost && !onCooldown;

          return (
            <div
              key={spell.id}
              style={slotStyle(spell, isSelected, canCast)}
              draggable={canCast && !isAoe}
              onDragStart={e => {
                if (!canCast || isAoe) { e.preventDefault(); return; }
                e.dataTransfer.setData("text/plain", spell.id);
                e.dataTransfer.effectAllowed = "move";
                if (onDragStart) onDragStart(spell);
              }}
              onClick={() => onSelect(spell.id)}
              onMouseEnter={e => {
                if (canCast) {
                  e.currentTarget.style.borderColor = spell.color;
                  e.currentTarget.style.background = `${spell.color}20`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = isSelected ? spell.color : `${spell.color}40`;
                e.currentTarget.style.background = isSelected ? `${spell.color}18` : "rgba(255,255,255,0.02)";
              }}
            >
              {/* Cooldown overlay from top */}
              {onCooldown && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: `${cdPct * 100}%`,
                  background: "rgba(0,0,0,0.6)",
                  pointerEvents: "none", zIndex: 2,
                  transition: "height 0.1s linear",
                }} />
              )}

              <span style={{ fontSize: 26, position: "relative", zIndex: 3, opacity: canCast ? 1 : 0.35 }}>
                {spell.icon}
              </span>
              <div style={{
                fontSize: 10, fontWeight: "bold",
                color: isSelected ? spell.color : spell.color + "aa",
                position: "relative", zIndex: 3, whiteSpace: "nowrap",
              }}>{spell.name}</div>
              <div style={{
                fontSize: 9,
                color: canCast ? "#6090cc" : "#804040",
                position: "relative", zIndex: 3,
              }}>
                {isSummon ? <>💰 Wybierz</> : `🔮${spell.manaCost}`}
                {isAoe && <span style={{ color: "#e0a040", marginLeft: 3 }}>⚡</span>}
              </div>

              {/* Cooldown remaining seconds */}
              {onCooldown && (
                <div style={{
                  fontSize: 11, fontWeight: "bold",
                  color: "#ff9040", position: "relative", zIndex: 3,
                }}>
                  {Math.ceil((cdEnd - now) / 1000)}s
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right arrow */}
      <div
        style={arrowBtnStyle(hasNext)}
        onClick={() => hasNext && setPage(p => p + 1)}
        onMouseEnter={e => { if (hasNext) e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = hasNext ? "0.8" : "0.2"; }}
      >▶</div>

      {/* Page dots */}
      {totalPages > 1 && (
        <div style={pageDotsStyle}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} onClick={() => setPage(i)} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i === safePage ? "#d4a030" : "#3a2a18",
              border: "1px solid #5a4030",
              cursor: "pointer",
              transition: "background 0.15s",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

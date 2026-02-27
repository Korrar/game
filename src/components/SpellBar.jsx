import { useState, useEffect } from "react";
import { SPELLS } from "../data/npcs";

const SPELLS_PER_PAGE = 6;

const barStyle = (mobile) => ({
  position: "fixed",
  bottom: 0, left: "50%", transform: "translateX(-50%)",
  zIndex: 100,
  display: "flex", alignItems: "stretch", gap: 0,
  padding: mobile ? "6px 4px" : "8px 6px",
  background: "linear-gradient(180deg, #1a0e12ee, #0e0608f0)",
  border: "3px solid #5a4030",
  borderBottom: "none",
  borderRadius: "12px 12px 0 0",
  boxShadow: "0 -4px 20px rgba(0,0,0,0.6)",
  maxWidth: mobile ? "100vw" : "none",
});

const manaBoxStyle = (mobile) => ({
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center",
  padding: mobile ? "2px 6px" : "4px 10px", marginRight: mobile ? 2 : 4,
  borderRight: "2px solid #2a1e14",
});

const slotStyle = (spell, selected, canCast, mobile) => ({
  position: "relative",
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center",
  padding: mobile ? "4px 5px" : "5px 7px",
  border: `2px solid ${selected ? spell.color : spell.color + "40"}`,
  background: selected ? `${spell.color}18` : "rgba(255,255,255,0.02)",
  cursor: canCast ? "grab" : "not-allowed",
  transition: "border-color 0.15s, background 0.15s",
  minWidth: mobile ? 48 : 56,
  minHeight: mobile ? 52 : "auto",
  userSelect: "none",
  overflow: "hidden",
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
});

const arrowBtnStyle = (enabled, mobile) => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: mobile ? 28 : 22, minWidth: mobile ? 28 : 22,
  minHeight: mobile ? 44 : "auto",
  cursor: enabled ? "pointer" : "default",
  opacity: enabled ? 0.8 : 0.2,
  color: "#d4a030",
  fontSize: mobile ? 22 : 18,
  fontWeight: "bold",
  userSelect: "none",
  transition: "opacity 0.15s",
  background: "none",
  border: "none",
  padding: 0,
  WebkitTapHighlightColor: "transparent",
});

const pageDotsStyle = {
  display: "flex", gap: 3, justifyContent: "center",
  position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
};

export default function SpellBar({ mana, selectedSpell, cooldowns, learnedSpells, onSelect, onDragStart, isMobile }) {
  const [, tick] = useState(0);
  const [page, setPage] = useState(0);
  const [hoveredSpell, setHoveredSpell] = useState(null);
  const m = isMobile;

  // Re-render periodically while any cooldown is active
  useEffect(() => {
    const hasCD = Object.values(cooldowns).some(t => t > Date.now());
    if (!hasCD) return;
    const id = setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(id);
  }, [cooldowns]);

  // Keyboard shortcuts: 1-6 for spell slots on current page
  useEffect(() => {
    if (m) return; // Skip keyboard on mobile
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= SPELLS_PER_PAGE) {
        const known = learnedSpells || SPELLS.filter(s => s.learned).map(s => s.id);
        const knownSpells = SPELLS.filter(s => known.includes(s.id));
        const idx = (page * SPELLS_PER_PAGE) + num - 1;
        if (idx < knownSpells.length) {
          onSelect(knownSpells[idx].id);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [page, learnedSpells, onSelect, m]);

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
    <div style={barStyle(m)}>
      {/* Mana display */}
      <div style={manaBoxStyle(m)}>
        <div style={{ fontSize: m ? 20 : 24 }}>🔮</div>
        <div style={{ fontWeight: "bold", fontSize: m ? 12 : 14, color: "#60a0ff", textShadow: "0 0 8px rgba(60,120,255,0.4)" }}>{Math.floor(mana)}/100</div>
        <div style={{ fontSize: m ? 7 : 9, color: "#4466aa", letterSpacing: 1 }}>MANA</div>
      </div>

      {/* Left arrow */}
      <div
        style={arrowBtnStyle(hasPrev, m)}
        onClick={() => hasPrev && setPage(p => p - 1)}
        onMouseEnter={!m ? (e => { if (hasPrev) e.currentTarget.style.opacity = "1"; }) : undefined}
        onMouseLeave={!m ? (e => { e.currentTarget.style.opacity = hasPrev ? "0.8" : "0.2"; }) : undefined}
      >◀</div>

      {/* Spell slots – current page */}
      <div style={{ display: "flex", gap: m ? 4 : 6, position: "relative" }}>
        {pageSpells.map((spell, idx) => {
          const cdEnd = cooldowns[spell.id] || 0;
          const onCooldown = cdEnd > now;
          const cdPct = onCooldown ? (cdEnd - now) / spell.cooldown : 0;
          const isSelected = selectedSpell === spell.id;
          const isSummon = spell.id === "summon";
          const isAoe = !!spell.aoe;
          const canCast = isSummon
            ? !onCooldown
            : mana >= spell.manaCost && !onCooldown;
          const keyNum = idx + 1;

          return (
            <div
              key={spell.id}
              style={slotStyle(spell, isSelected, canCast, m)}
              draggable={!m && canCast && !isAoe}
              onDragStart={!m ? (e => {
                if (!canCast || isAoe) { e.preventDefault(); return; }
                e.dataTransfer.setData("text/plain", spell.id);
                e.dataTransfer.effectAllowed = "move";
                if (onDragStart) onDragStart(spell);
              }) : undefined}
              onClick={() => onSelect(spell.id)}
              onMouseEnter={!m ? (e => {
                setHoveredSpell(spell);
                if (canCast) {
                  e.currentTarget.style.borderColor = spell.color;
                  e.currentTarget.style.background = `${spell.color}20`;
                }
              }) : undefined}
              onMouseLeave={!m ? (e => {
                setHoveredSpell(null);
                e.currentTarget.style.borderColor = isSelected ? spell.color : `${spell.color}40`;
                e.currentTarget.style.background = isSelected ? `${spell.color}18` : "rgba(255,255,255,0.02)";
              }) : undefined}
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

              {/* Keyboard shortcut number (desktop only) */}
              {!m && (
                <div style={{
                  position: "absolute", top: 1, left: 3, fontSize: 8, color: "#666",
                  fontWeight: "bold", zIndex: 3,
                }}>{keyNum}</div>
              )}

              <span style={{ fontSize: m ? 22 : 26, position: "relative", zIndex: 3, opacity: canCast ? 1 : 0.35 }}>
                {spell.icon}
              </span>
              <div style={{
                fontSize: m ? 9 : 10, fontWeight: "bold",
                color: isSelected ? spell.color : spell.color + "aa",
                position: "relative", zIndex: 3, whiteSpace: "nowrap",
              }}>{spell.name}</div>
              <div style={{
                fontSize: m ? 8 : 9,
                color: canCast ? "#6090cc" : "#804040",
                position: "relative", zIndex: 3,
              }}>
                {isSummon ? <>💰 Wybierz</> : `🔮${spell.manaCost}`}
                {isAoe && <span style={{ color: "#e0a040", marginLeft: 3 }} title="Czar obszarowy">⚡AoE</span>}
              </div>

              {/* Cooldown remaining seconds */}
              {onCooldown && (
                <div style={{
                  fontSize: m ? 10 : 11, fontWeight: "bold",
                  color: "#ff9040", position: "relative", zIndex: 3,
                }}>
                  {Math.ceil((cdEnd - now) / 1000)}s
                </div>
              )}
            </div>
          );
        })}

        {/* Spell tooltip on hover (desktop only) */}
        {!m && hoveredSpell && (
          <div style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            background: "rgba(14,8,10,0.95)", border: "2px solid #5a4030",
            padding: "8px 12px", borderRadius: 6, marginBottom: 8,
            minWidth: 200, zIndex: 110, pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>{hoveredSpell.icon}</span>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 13, color: hoveredSpell.color }}>{hoveredSpell.name}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{hoveredSpell.element || "Neutralny"} {hoveredSpell.aoe ? "• Obszarowy" : "• Cel"}</div>
              </div>
            </div>
            {hoveredSpell.id !== "summon" && (
              <div style={{ fontSize: 11, color: "#aaa" }}>
                <span style={{ color: "#e05040" }}>Obrażenia: {hoveredSpell.damage}</span> | <span style={{ color: "#60a0ff" }}>Mana: {hoveredSpell.manaCost}</span> | <span style={{ color: "#cc9040" }}>CD: {(hoveredSpell.cooldown / 1000).toFixed(1)}s</span>
              </div>
            )}
            {hoveredSpell.element && (
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                Łącz żywioły dla bonusu COMBO!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right arrow */}
      <div
        style={arrowBtnStyle(hasNext, m)}
        onClick={() => hasNext && setPage(p => p + 1)}
        onMouseEnter={!m ? (e => { if (hasNext) e.currentTarget.style.opacity = "1"; }) : undefined}
        onMouseLeave={!m ? (e => { e.currentTarget.style.opacity = hasNext ? "0.8" : "0.2"; }) : undefined}
      >▶</div>

      {/* Page dots */}
      {totalPages > 1 && (
        <div style={pageDotsStyle}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} onClick={() => setPage(i)} style={{
              width: m ? 8 : 6, height: m ? 8 : 6, borderRadius: "50%",
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

import { useState, useEffect } from "react";
import { SPELLS } from "../data/npcs";

const SPELLS_PER_PAGE = 6;

export default function SpellBar({ mana, selectedSpell, cooldowns, learnedSpells, onSelect, onDragStart, isMobile, gameW, gameH }) {
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

  // Keyboard shortcuts (desktop only)
  useEffect(() => {
    if (m) return;
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= SPELLS_PER_PAGE) {
        const known = learnedSpells || SPELLS.filter(s => s.learned).map(s => s.id);
        const knownSpells = SPELLS.filter(s => known.includes(s.id));
        const idx = (page * SPELLS_PER_PAGE) + num - 1;
        if (idx < knownSpells.length) onSelect(knownSpells[idx].id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [page, learnedSpells, onSelect, m]);

  const now = Date.now();
  const known = learnedSpells || SPELLS.filter(s => s.learned).map(s => s.id);
  const knownSpells = SPELLS.filter(s => known.includes(s.id));
  const totalPages = Math.max(1, Math.ceil(knownSpells.length / SPELLS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);
  const pageSpells = knownSpells.slice(safePage * SPELLS_PER_PAGE, (safePage + 1) * SPELLS_PER_PAGE);
  const hasPrev = safePage > 0;
  const hasNext = safePage < totalPages - 1;

  // Mobile layout — fixed to viewport bottom, outside any transform
  if (m) {
    return (
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9000,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 0,
        padding: "4px 2px",
        paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(0deg, rgba(14,6,8,0.97), rgba(26,14,18,0.92))",
        borderTop: "2px solid #5a4030",
      }}>
        {/* Mana */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "0 5px", borderRight: "1px solid #2a1e14",
        }}>
          <div style={{ fontSize: 15 }}>🔮</div>
          <div style={{ fontWeight: "bold", fontSize: 11, color: "#60a0ff" }}>{Math.floor(mana)}</div>
        </div>

        {/* Prev arrow */}
        <div onClick={() => hasPrev && setPage(p => p - 1)}
          style={{ padding: "0 4px", fontSize: 16, color: "#d4a030", opacity: hasPrev ? 0.8 : 0.2, WebkitTapHighlightColor: "transparent" }}>◀</div>

        {/* Spell slots */}
        {pageSpells.map((spell) => {
          const cdEnd = cooldowns[spell.id] || 0;
          const onCooldown = cdEnd > now;
          const cdPct = onCooldown ? (cdEnd - now) / spell.cooldown : 0;
          const isSelected = selectedSpell === spell.id;
          const isSummon = spell.id === "summon";
          const canCast = isSummon ? !onCooldown : mana >= spell.manaCost && !onCooldown;

          return (
            <div key={spell.id}
              onClick={() => onSelect(spell.id)}
              style={{
                position: "relative",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "3px 5px",
                border: `2px solid ${isSelected ? spell.color : spell.color + "30"}`,
                background: isSelected ? `${spell.color}20` : "transparent",
                minWidth: 48, minHeight: 48,
                overflow: "hidden",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              {/* Cooldown overlay */}
              {onCooldown && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: `${cdPct * 100}%`,
                  background: "rgba(0,0,0,0.65)", pointerEvents: "none", zIndex: 2,
                }} />
              )}
              <span style={{ fontSize: 20, zIndex: 3, opacity: canCast ? 1 : 0.3 }}>{spell.icon}</span>
              <div style={{
                fontSize: 8, fontWeight: "bold", zIndex: 3,
                color: isSelected ? spell.color : spell.color + "99",
                whiteSpace: "nowrap",
              }}>{spell.name}</div>
              {onCooldown && (
                <div style={{ fontSize: 9, fontWeight: "bold", color: "#ff9040", zIndex: 3 }}>
                  {Math.ceil((cdEnd - now) / 1000)}s
                </div>
              )}
            </div>
          );
        })}

        {/* Next arrow */}
        <div onClick={() => hasNext && setPage(p => p + 1)}
          style={{ padding: "0 4px", fontSize: 16, color: "#d4a030", opacity: hasNext ? 0.8 : 0.2, WebkitTapHighlightColor: "transparent" }}>▶</div>
      </div>
    );
  }

  // Desktop layout — fixed to viewport bottom, outside any transform
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      zIndex: 9000, display: "flex", alignItems: "stretch", gap: 0,
      padding: "8px 6px",
      background: "linear-gradient(180deg, #1a0e12ee, #0e0608f0)",
      border: "3px solid #5a4030", borderBottom: "none",
      borderRadius: "12px 12px 0 0",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.6)",
    }}>
      {/* Mana display */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "4px 10px", marginRight: 4, borderRight: "2px solid #2a1e14",
      }}>
        <div style={{ fontSize: 24 }}>🔮</div>
        <div style={{ fontWeight: "bold", fontSize: 14, color: "#60a0ff", textShadow: "0 0 8px rgba(60,120,255,0.4)" }}>
          {Math.floor(mana)}/100
        </div>
        <div style={{ fontSize: 9, color: "#4466aa", letterSpacing: 1 }}>MANA</div>
      </div>

      {/* Left arrow */}
      <div onClick={() => hasPrev && setPage(p => p - 1)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, cursor: hasPrev ? "pointer" : "default", opacity: hasPrev ? 0.8 : 0.2, color: "#d4a030", fontSize: 18, fontWeight: "bold" }}
      >◀</div>

      {/* Spell slots */}
      <div style={{ display: "flex", gap: 6, position: "relative" }}>
        {pageSpells.map((spell, idx) => {
          const cdEnd = cooldowns[spell.id] || 0;
          const onCooldown = cdEnd > now;
          const cdPct = onCooldown ? (cdEnd - now) / spell.cooldown : 0;
          const isSelected = selectedSpell === spell.id;
          const isSummon = spell.id === "summon";
          const isAoe = !!spell.aoe;
          const canCast = isSummon ? !onCooldown : mana >= spell.manaCost && !onCooldown;

          return (
            <div key={spell.id}
              style={{
                position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "5px 7px",
                border: `2px solid ${isSelected ? spell.color : spell.color + "40"}`,
                background: isSelected ? `${spell.color}18` : "rgba(255,255,255,0.02)",
                cursor: canCast ? "grab" : "not-allowed",
                transition: "border-color 0.15s, background 0.15s",
                minWidth: 56, userSelect: "none", overflow: "hidden",
              }}
              draggable={canCast && !isAoe}
              onDragStart={e => {
                if (!canCast || isAoe) { e.preventDefault(); return; }
                e.dataTransfer.setData("text/plain", spell.id);
                if (onDragStart) onDragStart(spell);
              }}
              onClick={() => onSelect(spell.id)}
              onMouseEnter={e => {
                setHoveredSpell(spell);
                if (canCast) { e.currentTarget.style.borderColor = spell.color; e.currentTarget.style.background = `${spell.color}20`; }
              }}
              onMouseLeave={e => {
                setHoveredSpell(null);
                e.currentTarget.style.borderColor = isSelected ? spell.color : `${spell.color}40`;
                e.currentTarget.style.background = isSelected ? `${spell.color}18` : "rgba(255,255,255,0.02)";
              }}
            >
              {onCooldown && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${cdPct * 100}%`, background: "rgba(0,0,0,0.6)", pointerEvents: "none", zIndex: 2, transition: "height 0.1s linear" }} />
              )}
              <div style={{ position: "absolute", top: 1, left: 3, fontSize: 8, color: "#666", fontWeight: "bold", zIndex: 3 }}>{idx + 1}</div>
              <span style={{ fontSize: 26, position: "relative", zIndex: 3, opacity: canCast ? 1 : 0.35 }}>{spell.icon}</span>
              <div style={{ fontSize: 10, fontWeight: "bold", color: isSelected ? spell.color : spell.color + "aa", zIndex: 3, whiteSpace: "nowrap" }}>{spell.name}</div>
              <div style={{ fontSize: 9, color: canCast ? "#6090cc" : "#804040", zIndex: 3 }}>
                {isSummon ? <>💰 Wybierz</> : `🔮${spell.manaCost}`}
                {isAoe && <span style={{ color: "#e0a040", marginLeft: 3 }}>⚡AoE</span>}
              </div>
              {onCooldown && (
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#ff9040", zIndex: 3 }}>{Math.ceil((cdEnd - now) / 1000)}s</div>
              )}
            </div>
          );
        })}

        {/* Tooltip */}
        {hoveredSpell && (
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
          </div>
        )}
      </div>

      {/* Right arrow */}
      <div onClick={() => hasNext && setPage(p => p + 1)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, cursor: hasNext ? "pointer" : "default", opacity: hasNext ? 0.8 : 0.2, color: "#d4a030", fontSize: 18, fontWeight: "bold" }}
      >▶</div>

      {/* Page dots */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 3, justifyContent: "center", position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)" }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} onClick={() => setPage(i)} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i === safePage ? "#d4a030" : "#3a2a18",
              border: "1px solid #5a4030", cursor: "pointer",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

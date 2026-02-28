import { useState, useEffect } from "react";
import { SPELLS } from "../data/npcs";
import GameIcon from "./GameIcon";
import { SPELL_ICON_MAP } from "../rendering/icons";

const SPELLS_PER_PAGE = 6;

export default function SpellBar({ mana, selectedSpell, cooldowns, learnedSpells, onSelect, onDragStart, isMobile, gameW, gameH }) {
  const [, tick] = useState(0);
  const [page, setPage] = useState(0);
  const [hoveredSpell, setHoveredSpell] = useState(null);
  const m = isMobile;

  useEffect(() => {
    const hasCD = Object.values(cooldowns).some(t => t > Date.now());
    if (!hasCD) return;
    const id = setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(id);
  }, [cooldowns]);

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

  if (m) {
    return (
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9000,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
        padding: "4px 2px",
        paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(0deg, rgba(8,4,6,0.97), rgba(14,8,10,0.95))",
        borderTop: "2px solid #5a3818",
        boxShadow: "0 -3px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,160,48,0.1)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 5px", borderRight: "1px solid #2a1808" }}>
          <GameIcon name="gunpowder" size={18} />
          <div style={{ fontWeight: "bold", fontSize: 11, color: "#c0a060", textShadow: "0 0 6px rgba(192,160,96,0.3)" }}>{Math.floor(mana)}</div>
        </div>
        <div onClick={() => hasPrev && setPage(p => p - 1)} style={{ padding: "0 4px", fontSize: 16, color: "#e0b840", opacity: hasPrev ? 0.8 : 0.2, WebkitTapHighlightColor: "transparent" }}>◀</div>
        {pageSpells.map((spell) => {
          const cdEnd = cooldowns[spell.id] || 0;
          const onCooldown = cdEnd > now;
          const cdPct = onCooldown ? (cdEnd - now) / spell.cooldown : 0;
          const isSelected = selectedSpell === spell.id;
          const isSummon = spell.id === "summon";
          const canCast = isSummon ? !onCooldown : mana >= spell.manaCost && !onCooldown;
          return (
            <div key={spell.id} onClick={() => onSelect(spell.id)} style={{
              position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "3px 5px",
              border: `1px solid ${isSelected ? spell.color : spell.color + "30"}`,
              background: isSelected ? `${spell.color}15` : "rgba(10,6,4,0.6)",
              minWidth: 48, minHeight: 48, overflow: "hidden", borderRadius: 3,
              boxShadow: isSelected ? `0 0 8px ${spell.color}44, inset 0 0 6px ${spell.color}22` : "none",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
            }}>
              {onCooldown && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${cdPct * 100}%`, background: "rgba(0,0,0,0.65)", pointerEvents: "none", zIndex: 2 }} />}
              {/* Hotkey number */}
              {page === 0 && SPELLS.indexOf(spell) < 9 && (
                <div style={{ position: "absolute", top: 1, left: 3, fontSize: 8, fontWeight: "bold", color: "#d4a030", opacity: 0.7, zIndex: 4 }}>
                  {SPELLS.indexOf(spell) + 1}
                </div>
              )}
              <span style={{ fontSize: 20, zIndex: 3, opacity: canCast ? 1 : 0.3, filter: canCast ? `drop-shadow(0 0 4px ${spell.color}66)` : "none" }}>
                {SPELL_ICON_MAP[spell.id] ? <GameIcon name={SPELL_ICON_MAP[spell.id]} size={20} /> : spell.icon}
              </span>
              <div style={{ fontSize: 8, fontWeight: "bold", zIndex: 3, color: isSelected ? spell.color : spell.color + "99", whiteSpace: "nowrap" }}>{spell.name}</div>
              {onCooldown && <div style={{ fontSize: 9, fontWeight: "bold", color: "#ff9040", zIndex: 3 }}>{Math.ceil((cdEnd - now) / 1000)}s</div>}
            </div>
          );
        })}
        <div onClick={() => hasNext && setPage(p => p + 1)} style={{ padding: "0 4px", fontSize: 16, color: "#e0b840", opacity: hasNext ? 0.8 : 0.2, WebkitTapHighlightColor: "transparent" }}>▶</div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      zIndex: 9000, display: "flex", alignItems: "stretch", gap: 0,
      padding: "8px 8px",
      background: "linear-gradient(180deg, rgba(14,8,6,0.97), rgba(8,4,4,0.98))",
      border: "2px solid #5a3818", borderBottom: "none",
      borderRadius: "10px 10px 0 0",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,160,48,0.15)",
    }}>
      {/* Top gold line */}
      <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,48,0.4), transparent)" }} />

      {/* Mana display */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "4px 12px", marginRight: 4, borderRight: "1px solid #2a1808",
      }}>
        <GameIcon name="gunpowder" size={28} style={{ filter: "drop-shadow(0 0 6px rgba(192,160,96,0.4))" }} />
        <div style={{ fontWeight: "bold", fontSize: 14, color: "#c0a060", textShadow: "0 0 10px rgba(192,160,96,0.4)" }}>
          {Math.floor(mana)}/100
        </div>
        <div style={{ fontSize: 9, color: "#8a7040", letterSpacing: 1 }}>PROCH</div>
      </div>

      <div onClick={() => hasPrev && setPage(p => p - 1)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, cursor: hasPrev ? "pointer" : "default", opacity: hasPrev ? 0.8 : 0.2, color: "#e0b840", fontSize: 18, fontWeight: "bold" }}>◀</div>

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
                border: `1px solid ${isSelected ? spell.color : spell.color + "35"}`,
                background: isSelected ? `${spell.color}12` : "rgba(10,6,4,0.6)",
                cursor: canCast ? "grab" : "not-allowed",
                transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                minWidth: 56, userSelect: "none", overflow: "hidden", borderRadius: 4,
                boxShadow: isSelected ? `0 0 12px ${spell.color}44, inset 0 0 8px ${spell.color}18` : "inset 0 0 6px rgba(0,0,0,0.3)",
              }}
              draggable={canCast && !isAoe}
              onDragStart={e => { if (!canCast || isAoe) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", spell.id); if (onDragStart) onDragStart(spell); }}
              onClick={() => onSelect(spell.id)}
              onMouseEnter={e => {
                setHoveredSpell(spell);
                if (canCast) { e.currentTarget.style.borderColor = spell.color; e.currentTarget.style.background = `${spell.color}18`; e.currentTarget.style.boxShadow = `0 0 16px ${spell.color}55, inset 0 0 10px ${spell.color}22`; }
              }}
              onMouseLeave={e => {
                setHoveredSpell(null);
                e.currentTarget.style.borderColor = isSelected ? spell.color : `${spell.color}35`;
                e.currentTarget.style.background = isSelected ? `${spell.color}12` : "rgba(10,6,4,0.6)";
                e.currentTarget.style.boxShadow = isSelected ? `0 0 12px ${spell.color}44, inset 0 0 8px ${spell.color}18` : "inset 0 0 6px rgba(0,0,0,0.3)";
              }}
            >
              {onCooldown && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${cdPct * 100}%`, background: "rgba(0,0,0,0.6)", pointerEvents: "none", zIndex: 2, transition: "height 0.1s linear" }} />}
              <div style={{ position: "absolute", top: 1, left: 3, fontSize: 9, color: "#d4a030", fontWeight: "bold", zIndex: 4, opacity: 0.8, textShadow: "0 0 4px rgba(212,160,48,0.3)" }}>{page * SPELLS_PER_PAGE + idx + 1}</div>
              <span style={{ fontSize: 26, position: "relative", zIndex: 3, opacity: canCast ? 1 : 0.35, filter: canCast ? `drop-shadow(0 0 6px ${spell.color}88)` : "none" }}>
                {SPELL_ICON_MAP[spell.id] ? <GameIcon name={SPELL_ICON_MAP[spell.id]} size={28} /> : spell.icon}
              </span>
              <div style={{ fontSize: 10, fontWeight: "bold", color: isSelected ? spell.color : spell.color + "aa", zIndex: 3, whiteSpace: "nowrap", textShadow: isSelected ? `0 0 6px ${spell.color}44` : "none" }}>{spell.name}</div>
              <div style={{ fontSize: 9, color: canCast ? "#6090cc" : "#804040", zIndex: 3 }}>
                {isSummon ? <><GameIcon name="gold" size={12} /> Wybierz</> : <><GameIcon name="gunpowder" size={12} />{spell.manaCost}</>}
                {isAoe && <span style={{ color: "#e0a040", marginLeft: 3 }}>⚡AoE</span>}
              </div>
              {onCooldown && <div style={{ fontSize: 11, fontWeight: "bold", color: "#ff9040", zIndex: 3 }}>{Math.ceil((cdEnd - now) / 1000)}s</div>}
            </div>
          );
        })}

        {hoveredSpell && (
          <div style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            background: "linear-gradient(180deg, rgba(14,8,6,0.97), rgba(8,4,4,0.97))",
            border: "1px solid #5a3818", padding: "8px 14px", borderRadius: 6, marginBottom: 8,
            minWidth: 220, zIndex: 110, pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.7), inset 0 0 12px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 24, filter: `drop-shadow(0 0 6px ${hoveredSpell.color}88)` }}>
                {SPELL_ICON_MAP[hoveredSpell.id] ? <GameIcon name={SPELL_ICON_MAP[hoveredSpell.id]} size={26} /> : hoveredSpell.icon}
              </span>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 13, color: hoveredSpell.color, textShadow: `0 0 6px ${hoveredSpell.color}44` }}>{hoveredSpell.name}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{hoveredSpell.element || "Neutralny"} {hoveredSpell.aoe ? "• Obszarowy" : "• Cel"}</div>
              </div>
            </div>
            {hoveredSpell.id !== "summon" && (
              <div style={{ fontSize: 11, color: "#aaa" }}>
                <span style={{ color: "#e05040" }}>Obrażenia: {hoveredSpell.damage}</span> | <span style={{ color: "#c0a060" }}>Proch: {hoveredSpell.manaCost}</span> | <span style={{ color: "#cc9040" }}>CD: {(hoveredSpell.cooldown / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div onClick={() => hasNext && setPage(p => p + 1)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, cursor: hasNext ? "pointer" : "default", opacity: hasNext ? 0.8 : 0.2, color: "#e0b840", fontSize: 18, fontWeight: "bold" }}>▶</div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 3, justifyContent: "center", position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)" }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} onClick={() => setPage(i)} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i === safePage ? "#e0b840" : "#2a1a08",
              border: "1px solid #5a3818", cursor: "pointer",
              boxShadow: i === safePage ? "0 0 4px rgba(212,160,48,0.4)" : "none",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { SPELLS } from "../data/npcs";
import GameIcon from "./GameIcon";
import { SPELL_ICON_MAP } from "../rendering/icons";

const SPELLS_PER_PAGE = 6;

// Inject pulsing glow animation for active spell
const ACTIVE_GLOW_STYLE_ID = "spell-active-glow-style";
if (typeof document !== "undefined" && !document.getElementById(ACTIVE_GLOW_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = ACTIVE_GLOW_STYLE_ID;
  style.textContent = `
    @keyframes spellActiveGlow {
      0% { box-shadow: 0 0 8px var(--glow-color), inset 0 0 6px var(--glow-color-dim); }
      50% { box-shadow: 0 0 20px var(--glow-color), 0 0 36px var(--glow-color-dim), inset 0 0 12px var(--glow-color-dim); }
      100% { box-shadow: 0 0 8px var(--glow-color), inset 0 0 6px var(--glow-color-dim); }
    }
  `;
  document.head.appendChild(style);
}

// Determine which spells are visible:
// - learned spells (Strzał) are always visible
// - spells with ammoCost are visible only if player has ammo for them
// - summon is visible if learned
function getVisibleSpells(ammo) {
  return SPELLS.filter(s => {
    if (s.learned) return true;
    if (s.ammoCost && ammo && (ammo[s.ammoCost.type] || 0) > 0) return true;
    return false;
  });
}

export default function SpellBar({ mana, ammo, selectedSpell, cooldowns, learnedSpells, onSelect, onDragStart, isMobile, gameW, gameH }) {
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
        const visible = getVisibleSpells(ammo);
        const idx = (page * SPELLS_PER_PAGE) + num - 1;
        if (idx < visible.length) onSelect(visible[idx].id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [page, ammo, onSelect, m]);

  const now = Date.now();
  const visibleSpells = getVisibleSpells(ammo);
  const totalPages = Math.max(1, Math.ceil(visibleSpells.length / SPELLS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  // Avoid calling setState during render — defer page correction
  if (safePage !== page) setTimeout(() => setPage(safePage), 0);
  const pageSpells = visibleSpells.slice(safePage * SPELLS_PER_PAGE, (safePage + 1) * SPELLS_PER_PAGE);
  const hasPrev = safePage > 0;
  const hasNext = safePage < totalPages - 1;

  if (m) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
        padding: "4px 2px",
        paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(0deg, rgba(8,4,6,0.97), rgba(14,8,10,0.95))",
        boxShadow: "inset 0 1px 0 rgba(212,160,48,0.05)",
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
          const hasAmmo = !spell.ammoCost || (ammo && (ammo[spell.ammoCost.type] || 0) >= spell.ammoCost.amount);
          const canCast = isSummon ? !onCooldown : (spell.manaCost === 0 ? hasAmmo && !onCooldown : mana >= spell.manaCost && !onCooldown && hasAmmo);
          return (
            <div key={spell.id} onClick={() => onSelect(spell.id)} style={{
              position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "3px 5px",
              border: `2px solid ${isSelected ? spell.color : spell.color + "30"}`,
              background: isSelected ? `${spell.color}20` : "rgba(10,6,4,0.6)",
              minWidth: 48, minHeight: 48, overflow: "hidden", borderRadius: 3,
              "--glow-color": spell.color + "99", "--glow-color-dim": spell.color + "44",
              animation: isSelected ? "spellActiveGlow 1.5s ease-in-out infinite" : "none",
              boxShadow: isSelected ? `0 0 14px ${spell.color}66, inset 0 0 8px ${spell.color}33` : "none",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
            }}>
              {onCooldown && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${cdPct * 100}%`, background: "rgba(0,0,0,0.65)", pointerEvents: "none", zIndex: 2 }} />}
              {/* Hotkey number */}
              {page === 0 && visibleSpells.indexOf(spell) < 9 && (
                <div style={{ position: "absolute", top: 1, left: 3, fontSize: 8, fontWeight: "bold", color: "#d4a030", opacity: 0.7, zIndex: 4 }}>
                  {visibleSpells.indexOf(spell) + 1}
                </div>
              )}
              <span style={{ fontSize: 20, zIndex: 3, opacity: canCast ? 1 : 0.3, filter: canCast ? `drop-shadow(0 0 4px ${spell.color}66)` : "none" }}>
                {SPELL_ICON_MAP[spell.id] ? <GameIcon name={SPELL_ICON_MAP[spell.id]} size={20} /> : spell.icon}
              </span>
              <div style={{ fontSize: 8, fontWeight: "bold", zIndex: 3, color: isSelected ? spell.color : spell.color + "99", whiteSpace: "nowrap" }}>{spell.name}</div>
              {spell.ammoCost && ammo && (
                <div style={{ fontSize: 7, zIndex: 3, color: hasAmmo ? "#e0a040" : "#804040", fontWeight: "bold" }}>
                  <GameIcon name={SPELL_ICON_MAP[spell.id] || spell.icon} size={8} /> {ammo[spell.ammoCost.type] || 0}
                </div>
              )}
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
      display: "flex", alignItems: "stretch", gap: 0,
      padding: "8px 8px",
      background: "linear-gradient(180deg, rgba(14,8,6,0.97), rgba(8,4,4,0.98))",
      borderTop: "none",
      boxShadow: "inset 0 1px 0 rgba(212,160,48,0.08)",
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
          const hasAmmo = !spell.ammoCost || (ammo && (ammo[spell.ammoCost.type] || 0) >= spell.ammoCost.amount);
          const canCast = isSummon ? !onCooldown : (spell.manaCost === 0 ? hasAmmo && !onCooldown : mana >= spell.manaCost && !onCooldown && hasAmmo);

          return (
            <div key={spell.id}
              style={{
                position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "5px 7px",
                border: `2px solid ${isSelected ? spell.color : spell.color + "35"}`,
                background: isSelected ? `${spell.color}20` : "rgba(10,6,4,0.6)",
                cursor: canCast ? "grab" : "not-allowed",
                transition: isSelected ? "none" : "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                minWidth: 56, userSelect: "none", overflow: "hidden", borderRadius: 4,
                "--glow-color": spell.color + "99", "--glow-color-dim": spell.color + "44",
                animation: isSelected ? "spellActiveGlow 1.5s ease-in-out infinite" : "none",
                boxShadow: isSelected ? `0 0 16px ${spell.color}66, inset 0 0 10px ${spell.color}33` : "inset 0 0 6px rgba(0,0,0,0.3)",
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
                e.currentTarget.style.background = isSelected ? `${spell.color}20` : "rgba(10,6,4,0.6)";
                e.currentTarget.style.boxShadow = isSelected ? `0 0 16px ${spell.color}66, inset 0 0 10px ${spell.color}33` : "inset 0 0 6px rgba(0,0,0,0.3)";
              }}
            >
              {onCooldown && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${cdPct * 100}%`, background: "rgba(0,0,0,0.6)", pointerEvents: "none", zIndex: 2, transition: "height 0.1s linear" }} />}
              <div style={{ position: "absolute", top: 1, left: 3, fontSize: 9, color: "#d4a030", fontWeight: "bold", zIndex: 4, opacity: 0.8, textShadow: "0 0 4px rgba(212,160,48,0.3)" }}>{page * SPELLS_PER_PAGE + idx + 1}</div>
              <span style={{ fontSize: 26, position: "relative", zIndex: 3, opacity: canCast ? 1 : 0.35, filter: canCast ? `drop-shadow(0 0 6px ${spell.color}88)` : "none" }}>
                {SPELL_ICON_MAP[spell.id] ? <GameIcon name={SPELL_ICON_MAP[spell.id]} size={28} /> : spell.icon}
              </span>
              <div style={{ fontSize: 10, fontWeight: "bold", color: isSelected ? spell.color : spell.color + "aa", zIndex: 3, whiteSpace: "nowrap", textShadow: isSelected ? `0 0 6px ${spell.color}44` : "none" }}>{spell.name}</div>
              <div style={{ fontSize: 9, color: canCast ? "#6090cc" : "#804040", zIndex: 3 }}>
                {isSummon ? <><GameIcon name="gold" size={12} /> Wybierz</> : spell.manaCost === 0 && spell.ammoCost ? <><GameIcon name={SPELL_ICON_MAP[spell.id] || spell.icon} size={12} /> {spell.ammoCost.amount}</> : <><GameIcon name="gunpowder" size={12} />{spell.manaCost}</>}
                {isAoe && <span style={{ color: "#e0a040", marginLeft: 3 }}><GameIcon name="lightning" size={9} />AoE</span>}
              </div>
              {spell.manaCost > 0 && spell.ammoCost && ammo && (
                <div style={{ fontSize: 9, zIndex: 3, color: hasAmmo ? "#e0a040" : "#804040", fontWeight: "bold" }}>
                  <GameIcon name={SPELL_ICON_MAP[spell.id] || spell.icon} size={10} /> {ammo[spell.ammoCost.type] || 0}
                </div>
              )}
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
                <span style={{ color: "#e05040" }}>Obrażenia: {hoveredSpell.damage}</span>
                {hoveredSpell.manaCost > 0 && <span style={{ color: "#c0a060" }}> | Proch: {hoveredSpell.manaCost}</span>}
                <span style={{ color: "#cc9040" }}> | CD: {(hoveredSpell.cooldown / 1000).toFixed(1)}s</span>
                {hoveredSpell.ammoCost && ammo && (
                  <span style={{ color: (ammo[hoveredSpell.ammoCost.type] || 0) >= hoveredSpell.ammoCost.amount ? "#e0a040" : "#804040" }}> | Amunicja: {ammo[hoveredSpell.ammoCost.type] || 0}/{hoveredSpell.ammoCost.amount}</span>
                )}
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

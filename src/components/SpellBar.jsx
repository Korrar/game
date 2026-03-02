import { useState, useEffect, useCallback } from "react";
import { SPELLS } from "../data/npcs";
import GameIcon from "./GameIcon";
import { SPELL_ICON_MAP } from "../rendering/icons";

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

// Primary spells always shown in main bar
const PRIMARY_IDS = ["saber", "lightning", "wand"];

// Which spells are available to show
function getVisibleSpells(ammo, learnedIds) {
  return SPELLS.filter(s => {
    if (s.learned) return true;
    if (learnedIds && learnedIds.includes(s.id)) return true;
    if (s.ammoCost && ammo && (ammo[s.ammoCost.type] || 0) > 0) return true;
    return false;
  });
}

function SpellSlot({ spell, isSelected, canCast, onCooldown, cdPct, cdEnd, now, ammo, onSelect, onDragStart, isMobile, hotkey }) {
  const isAoe = !!spell.aoe;
  const hasAmmo = !spell.ammoCost || (ammo && (ammo[spell.ammoCost.type] || 0) >= spell.ammoCost.amount);
  const isSummon = spell.id === "summon";
  const isLegendary = spell.rarity === "legendary";
  const m = isMobile;
  const size = m ? 48 : 56;

  const legendaryBorder = isLegendary ? `2px solid #ffd700` : `2px solid ${isSelected ? spell.color : spell.color + (m ? "30" : "35")}`;
  const legendaryGlow = isLegendary
    ? (isSelected ? `0 0 16px #ffd70088, 0 0 30px #ffd70044, inset 0 0 10px #ffd70033` : `0 0 8px #ffd70055, 0 0 16px #ffd70022, inset 0 0 6px rgba(0,0,0,0.3)`)
    : (isSelected ? `0 0 16px ${spell.color}66, inset 0 0 10px ${spell.color}33` : "inset 0 0 6px rgba(0,0,0,0.3)");
  const legendaryBg = isLegendary
    ? (isSelected ? "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(10,6,4,0.7), rgba(255,215,0,0.1))" : "linear-gradient(135deg, rgba(255,215,0,0.06), rgba(10,6,4,0.6), rgba(255,215,0,0.04))")
    : undefined;

  return (
    <div
      style={{
        position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: m ? "3px 5px" : "5px 7px",
        border: legendaryBorder,
        background: legendaryBg || (isSelected ? `${spell.color}20` : "rgba(10,6,4,0.6)"),
        cursor: canCast ? "grab" : "not-allowed",
        transition: isSelected ? "none" : "border-color 0.15s, background 0.15s, box-shadow 0.15s",
        minWidth: size, minHeight: m ? size : undefined, userSelect: "none", overflow: "hidden", borderRadius: 4,
        "--glow-color": isLegendary ? "#ffd70099" : spell.color + "99", "--glow-color-dim": isLegendary ? "#ffd70044" : spell.color + "44",
        animation: isSelected ? "spellActiveGlow 1.5s ease-in-out infinite" : "none",
        boxShadow: legendaryGlow,
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
      }}
      draggable={!m && canCast && !isAoe}
      onDragStart={e => { if (!canCast || isAoe) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", spell.id); if (onDragStart) onDragStart(spell); }}
      onClick={() => onSelect(spell.id)}
    >
      {isLegendary && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #ffd700, transparent)", zIndex: 5, pointerEvents: "none" }} />}
      {isLegendary && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #ffd700, transparent)", zIndex: 5, pointerEvents: "none" }} />}
      {onCooldown && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${cdPct * 100}%`, background: "rgba(0,0,0,0.6)", pointerEvents: "none", zIndex: 2, transition: "height 0.1s linear" }} />}
      {hotkey && (
        <div style={{ position: "absolute", top: 1, left: 3, fontSize: m ? 8 : 9, color: isLegendary ? "#ffd700" : "#d4a030", fontWeight: "bold", zIndex: 4, opacity: 0.8, textShadow: isLegendary ? "0 0 4px rgba(255,215,0,0.5)" : "0 0 4px rgba(212,160,48,0.3)" }}>{hotkey}</div>
      )}
      <span style={{ fontSize: m ? 20 : 26, position: "relative", zIndex: 3, opacity: canCast ? 1 : 0.35, filter: canCast ? `drop-shadow(0 0 ${m ? 4 : 6}px ${spell.color}${m ? "66" : "88"})` : "none" }}>
        <GameIcon name={spell.icon || SPELL_ICON_MAP[spell.id] || "swords"} size={m ? 20 : 28} />
      </span>
      <div style={{ fontSize: m ? 8 : 10, fontWeight: "bold", color: isSelected ? spell.color : spell.color + "aa", zIndex: 3, whiteSpace: "nowrap", textShadow: isSelected ? `0 0 6px ${spell.color}44` : "none" }}>{spell.name}</div>
      {!m && (
        <div style={{ fontSize: 9, color: canCast ? (isLegendary ? "#ffd700" : "#6090cc") : "#804040", zIndex: 3 }}>
          {spell.isWand ? <><GameIcon name="gunpowder" size={12} /> +1/s</> : isSummon ? <><GameIcon name="gold" size={12} /> Wybierz</> : spell.manaCost === 0 && spell.ammoCost ? <><GameIcon name={SPELL_ICON_MAP[spell.id] || spell.icon} size={12} /> {spell.ammoCost.amount}</> : spell.manaCost > 0 ? <><GameIcon name="gunpowder" size={12} />{spell.manaCost}</> : null}
          {isAoe && <span style={{ color: "#e0a040", marginLeft: 3 }}><GameIcon name="lightning" size={9} />AoE</span>}
        </div>
      )}
      {spell.ammoCost && ammo && (
        <div style={{ fontSize: m ? 7 : 9, zIndex: 3, color: hasAmmo ? "#e0a040" : "#804040", fontWeight: "bold" }}>
          <GameIcon name={SPELL_ICON_MAP[spell.id] || spell.icon} size={m ? 8 : 10} /> {ammo[spell.ammoCost.type] || 0}
        </div>
      )}
      {onCooldown && <div style={{ fontSize: m ? 9 : 11, fontWeight: "bold", color: "#ff9040", zIndex: 3 }}>{Math.ceil((cdEnd - now) / 1000)}s</div>}
    </div>
  );
}

export default function SpellBar({ mana, ammo, selectedSpell, cooldowns, learnedSpells, onSelect, onDragStart, isMobile, gameW, gameH, equippedSaber }) {
  const [, tick] = useState(0);
  const [inneOpen, setInneOpen] = useState(false);
  const m = isMobile;

  useEffect(() => {
    const hasCD = Object.values(cooldowns).some(t => t > Date.now());
    if (!hasCD) return;
    const id = setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(id);
  }, [cooldowns]);

  // Close "Inne" on escape or when selecting a spell
  useEffect(() => {
    if (m) return;
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Escape") setInneOpen(false);
      const num = parseInt(e.key);
      if (num >= 1 && num <= PRIMARY_IDS.length) {
        e.preventDefault();
        const spell = SPELLS.find(s => s.id === PRIMARY_IDS[num - 1]);
        if (spell) onSelect(spell.id);
      }
      if (num > PRIMARY_IDS.length) {
        e.preventDefault();
        const secondary = getVisibleSpells(ammo, learnedSpells).filter(s => !PRIMARY_IDS.includes(s.id));
        if (secondary[num - PRIMARY_IDS.length - 1]) onSelect(secondary[num - PRIMARY_IDS.length - 1].id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [ammo, onSelect, m]);

  const now = Date.now();
  const visibleSpells = getVisibleSpells(ammo, learnedSpells);
  const primarySpells = PRIMARY_IDS.map(id => visibleSpells.find(s => s.id === id)).filter(Boolean);
  const secondarySpells = visibleSpells.filter(s => !PRIMARY_IDS.includes(s.id));

  const handleSelectAndClose = useCallback((id) => {
    onSelect(id);
    setInneOpen(false);
  }, [onSelect]);

  const renderSlot = (spell, hotkey) => {
    // Override saber spell display with equipped saber data
    const displaySpell = (spell.id === "saber" && equippedSaber) ? { ...spell, name: equippedSaber.name, color: equippedSaber.color, icon: equippedSaber.icon } : spell;
    const cdEnd = cooldowns[spell.id] || 0;
    const onCooldown = cdEnd > now;
    const cdPct = onCooldown ? (cdEnd - now) / spell.cooldown : 0;
    const isSummon = spell.id === "summon";
    const hasAmmo = !spell.ammoCost || (ammo && (ammo[spell.ammoCost.type] || 0) >= spell.ammoCost.amount);
    const canCast = isSummon ? !onCooldown : (spell.manaCost === 0 ? hasAmmo && !onCooldown : mana >= spell.manaCost && !onCooldown && hasAmmo);
    return (
      <SpellSlot
        key={spell.id}
        spell={displaySpell}
        isSelected={selectedSpell === spell.id}
        canCast={canCast}
        onCooldown={onCooldown}
        cdPct={cdPct}
        cdEnd={cdEnd}
        now={now}
        ammo={ammo}
        onSelect={inneOpen ? handleSelectAndClose : onSelect}
        onDragStart={onDragStart}
        isMobile={m}
        hotkey={hotkey}
      />
    );
  };

  // --- MOBILE LAYOUT ---
  if (m) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
        padding: "4px 2px",
        paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(0deg, rgba(8,4,6,0.97), rgba(14,8,10,0.95))",
        boxShadow: "inset 0 1px 0 rgba(212,160,48,0.05)",
        position: "relative",
      }}>
        {/* Mana */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 5px", borderRight: "1px solid #2a1808" }}>
          <GameIcon name="gunpowder" size={18} />
          <div style={{ fontWeight: "bold", fontSize: 11, color: "#c0a060", textShadow: "0 0 6px rgba(192,160,96,0.3)" }}>{Math.floor(mana)}</div>
        </div>
        {/* Primary spells */}
        {primarySpells.map((spell, i) => renderSlot(spell, `${i + 1}`))}
        {/* Inne button */}
        {secondarySpells.length > 0 && (
          <div onClick={() => setInneOpen(p => !p)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "3px 8px", minWidth: 48, minHeight: 48,
            border: `1px solid ${inneOpen ? "#d4a030" : "#4a3818"}`,
            background: inneOpen ? "rgba(212,160,48,0.15)" : "rgba(10,6,4,0.6)",
            borderRadius: 3, cursor: "pointer",
            WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
          }}>
            <span style={{ fontSize: 16, color: inneOpen ? "#d4a030" : "#8a7040" }}>⋯</span>
            <div style={{ fontSize: 8, color: inneOpen ? "#d4a030" : "#8a7040", fontWeight: "bold" }}>Inne</div>
          </div>
        )}
        {/* Inne dropdown (mobile = upward) */}
        {inneOpen && secondarySpells.length > 0 && (
          <div style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center",
            background: "rgba(8,4,6,0.97)", border: "1px solid #5a3818",
            padding: 6, borderRadius: 6, marginBottom: 4, zIndex: 120,
            maxWidth: "90vw",
            boxShadow: "0 -4px 16px rgba(0,0,0,0.7)",
          }}>
            {secondarySpells.map((spell, i) => renderSlot(spell, `${i + PRIMARY_IDS.length + 1}`))}
          </div>
        )}
      </div>
    );
  }

  // --- DESKTOP LAYOUT ---
  return (
    <div style={{
      display: "flex", alignItems: "stretch", gap: 0,
      padding: "8px 8px",
      background: "linear-gradient(180deg, rgba(14,8,6,0.97), rgba(8,4,4,0.98))",
      borderTop: "none",
      boxShadow: "inset 0 1px 0 rgba(212,160,48,0.08)",
      position: "relative",
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

      {/* Primary spell slots */}
      <div style={{ display: "flex", gap: 6, marginRight: 6 }}>
        {primarySpells.map((spell, i) => renderSlot(spell, `${i + 1}`))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: "#2a1808", margin: "4px 2px" }} />

      {/* Inne button */}
      {secondarySpells.length > 0 && (
        <div onClick={() => setInneOpen(p => !p)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "5px 12px", marginLeft: 4,
          border: `1px solid ${inneOpen ? "#d4a030" : "#4a3818"}`,
          background: inneOpen ? "rgba(212,160,48,0.15)" : "rgba(10,6,4,0.6)",
          borderRadius: 4, cursor: "pointer", minWidth: 56,
          transition: "border-color 0.15s, background 0.15s",
        }}>
          <span style={{ fontSize: 20, color: inneOpen ? "#d4a030" : "#8a7040" }}>⋯</span>
          <div style={{ fontSize: 10, color: inneOpen ? "#d4a030" : "#8a7040", fontWeight: "bold" }}>Inne ({secondarySpells.length})</div>
        </div>
      )}

      {/* Inne dropdown (desktop = upward popup) */}
      {inneOpen && secondarySpells.length > 0 && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center",
          background: "linear-gradient(180deg, rgba(14,8,6,0.97), rgba(8,4,4,0.97))",
          border: "1px solid #5a3818", padding: 10, borderRadius: 8, marginBottom: 6, zIndex: 120,
          maxWidth: 600,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.8), inset 0 0 12px rgba(0,0,0,0.3)",
        }}>
          <div style={{ width: "100%", textAlign: "center", fontSize: 11, color: "#8a7040", fontWeight: "bold", marginBottom: 4, borderBottom: "1px solid #2a1808", paddingBottom: 4 }}>
            INNE UMIEJĘTNOŚCI
          </div>
          {secondarySpells.map((spell, i) => renderSlot(spell, `${i + PRIMARY_IDS.length + 1}`))}
        </div>
      )}
    </div>
  );
}

import GameIcon from "./GameIcon";

export default function TopBar({ doors, initiative, treasures, money, mana, maxMana, onInv, onShop, onHideout, onBestiary, knowledge, musicOn, onToggleMusic, onSave, isMobile, gameW, playerLevel, playerXp, xpNeeded, onCrew, onFactions, onJournal, onShip, onFortifications }) {
  const m = isMobile;

  // Mobile portrait: render inside game container as absolute-positioned bar
  if (m) {
    return (
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 36, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 4px",
        background: "linear-gradient(180deg,rgba(14,8,6,0.97),rgba(8,4,2,0.95))",
        borderBottom: "2px solid #5a3818",
        boxShadow: "0 2px 12px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(212,160,48,0.15)",
      }}>
        {/* Level + Stats */}
        <div style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 10, flexShrink: 0 }}>
          {playerLevel > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GameIcon name="star" size={12} />
              <b style={{ color: "#ffd700" }}>{playerLevel}</b>
            </span>
          )}
          <span><GameIcon name="doors" size={12} /><b style={{ color: "#e0b840" }}>{doors}</b></span>
          <span><GameIcon name="hourglass" size={12} /><b style={{ color: "#e0b840" }}>{initiative}</b></span>
          <span><GameIcon name="gunpowder" size={12} /><b style={{ color: "#c0a060" }}>{Math.floor(mana)}</b></span>
        </div>
        {/* Currency */}
        <div style={{ display: "flex", gap: 2, alignItems: "center", fontSize: 9, flexShrink: 0 }}>
          <span style={{ color: "#cd7f32" }}><GameIcon name="copper" size={10} /><b>{money.copper}</b></span>
          <span style={{ color: "#c0c0c8" }}><GameIcon name="silver" size={10} /><b>{money.silver}</b></span>
          <span style={{ color: "#ffd700" }}><GameIcon name="gold" size={10} /><b>{money.gold}</b></span>
        </div>
        {/* Buttons — single row, no wrap */}
        <div style={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          {onBestiary && <button onClick={onBestiary} style={mobileBtnStyle(1)}><GameIcon name="wantedList" size={14} /></button>}
          <button onClick={onInv} style={mobileBtnStyle(1)}><GameIcon name="scroll" size={14} /></button>
          {onCrew && <button onClick={onCrew} style={mobileBtnStyle(1)}><GameIcon name="recruit" size={14} /></button>}
          {onJournal && <button onClick={onJournal} style={mobileBtnStyle(1)}><GameIcon name="compass" size={14} /></button>}
          {onFactions && <button onClick={onFactions} style={mobileBtnStyle(1)}><GameIcon name="pirate" size={14} /></button>}
          {onShip && <button onClick={onShip} style={mobileBtnStyle(1)}><GameIcon name="anchor" size={14} /></button>}
          {onFortifications && <button onClick={onFortifications} style={mobileBtnStyle(1)}><GameIcon name="shield" size={14} /></button>}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 52,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", zIndex: 100,
      background: "linear-gradient(180deg,#0e0808,#0a0506)",
      borderBottom: "2px solid #5a3818",
      boxShadow: "0 3px 16px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(212,160,48,0.2)",
    }}>
      {/* Ornamental corner gems */}
      <div style={{ position: "absolute", left: 8, top: 8, width: 6, height: 6, background: "radial-gradient(circle at 35% 35%, #ffe080, #a07020)", borderRadius: 1, transform: "rotate(45deg)", boxShadow: "0 0 6px rgba(212,160,48,0.4)" }} />
      <div style={{ position: "absolute", right: 8, top: 8, width: 6, height: 6, background: "radial-gradient(circle at 35% 35%, #ffe080, #a07020)", borderRadius: 1, transform: "rotate(45deg)", boxShadow: "0 0 6px rgba(212,160,48,0.4)" }} />

      <span style={{
        fontWeight: "bold", fontSize: 18, color: "#ffd700",
        textShadow: "0 0 10px rgba(212,160,48,0.4), 1px 1px 0 #000",
        letterSpacing: 1,
        background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundSize: "200% 100%",
        animation: "shimmer 4s ease-in-out infinite",
      }}><GameIcon name="pirate" size={22} style={{ marginRight: 6 }} /> Szlak Fortuny</span>
      <div style={{ display: "flex", gap: 12, fontSize: 18, alignItems: "center" }}>
        <StatBadge icon={<GameIcon name="doors" size={20} />} value={doors} />
        <StatBadge icon={<GameIcon name="treasure" size={20} />} value={treasures} />
        <StatBadge icon={<GameIcon name="hourglass" size={20} />} value={initiative} />
        {playerLevel > 0 && <XpBadge level={playerLevel} xp={playerXp} xpNeeded={xpNeeded} />}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <CurrencyBadge icon={<GameIcon name="copper" size={18} />} value={money.copper} color="#cd7f32" />
        <CurrencyBadge icon={<GameIcon name="silver" size={18} />} value={money.silver} color="#c0c0c8" />
        <CurrencyBadge icon={<GameIcon name="gold" size={18} />} value={money.gold} color="#ffd700" />
        {mana !== undefined && <CurrencyBadge icon={<GameIcon name="gunpowder" size={18} />} value={`${Math.floor(mana)}/${maxMana || 100}`} color="#c0a060" />}
        {knowledge > 0 && <CurrencyBadge icon={<GameIcon name="fame" size={18} />} value={knowledge} color="#e0c040" />}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {onBestiary && <DesktopBtn onClick={onBestiary} title="Lista Gończa"><GameIcon name="wantedList" size={16} /></DesktopBtn>}
        <DesktopBtn onClick={onInv} title="Ekwipunek"><GameIcon name="scroll" size={16} /></DesktopBtn>
        {onCrew && <DesktopBtn onClick={onCrew} title="Załoga"><GameIcon name="recruit" size={16} /></DesktopBtn>}
        {onFactions && <DesktopBtn onClick={onFactions} title="Frakcje"><GameIcon name="pirate" size={16} /></DesktopBtn>}
        {onJournal && <DesktopBtn onClick={onJournal} title="Dziennik"><GameIcon name="compass" size={16} /></DesktopBtn>}
        {onShip && <DesktopBtn onClick={onShip} title="Statek"><GameIcon name="anchor" size={16} /></DesktopBtn>}
        {onFortifications && <DesktopBtn onClick={onFortifications} title="Fort"><GameIcon name="shield" size={16} /></DesktopBtn>}
      </div>
    </div>
  );
}

function StatBadge({ icon, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 3,
      padding: "2px 8px",
      background: "rgba(212,160,48,0.06)",
      border: "1px solid rgba(212,160,48,0.2)",
      borderRadius: 4,
    }}>
      {icon}<span style={{ color: "#ffd700", fontWeight: "bold", textShadow: "0 0 6px rgba(212,160,48,0.3)" }}>{value}</span>
    </div>
  );
}

function CurrencyBadge({ icon, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color }}>
      {icon}<b style={{ textShadow: `0 0 6px ${color}44` }}>{value}</b>
    </div>
  );
}

function DesktopBtn({ onClick, children, opacity = 1, title }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        background: "linear-gradient(180deg, rgba(40,25,10,0.9), rgba(20,12,6,0.9))",
        border: "1px solid #7a5020",
        borderBottom: "2px solid #5a3818",
        color: "#e0b840",
        fontSize: 13, fontWeight: "bold", padding: "6px 8px", cursor: "pointer",
        transition: "all 0.15s", opacity,
        boxShadow: "0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,160,48,0.15)",
        borderRadius: 3,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "linear-gradient(180deg, #d4a030, #a07020)";
        e.currentTarget.style.color = "#000";
        e.currentTarget.style.boxShadow = "0 0 12px rgba(212,160,48,0.5), inset 0 1px 0 rgba(255,255,255,0.2)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "linear-gradient(180deg, rgba(40,25,10,0.9), rgba(20,12,6,0.9))";
        e.currentTarget.style.color = "#e0b840";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,160,48,0.15)";
      }}
    >{children}</button>
  );
}

function XpBadge({ level, xp, xpNeeded }) {
  const pct = xpNeeded > 0 ? Math.min(100, (xp / xpNeeded) * 100) : 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "2px 8px",
      background: "rgba(212,160,48,0.06)",
      border: "1px solid rgba(212,160,48,0.2)",
      borderRadius: 4, minWidth: 80,
    }}>
      <GameIcon name="star" size={16} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#d4a030", fontWeight: "bold" }}>
          <span>Lv.{level}</span>
          <span style={{ color: "#888", fontWeight: "normal" }}>{xp}/{xpNeeded}</span>
        </div>
        <div style={{
          width: "100%", height: 4, background: "rgba(0,0,0,0.5)",
          borderRadius: 2, overflow: "hidden", marginTop: 1,
        }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, #d4a030, #ffe080, #d4a030)",
            backgroundSize: "200% 100%",
            animation: "xpFill 3s linear infinite",
            borderRadius: 2, transition: "width 0.3s",
          }} />
        </div>
      </div>
    </div>
  );
}

function mobileBtnStyle(opacity) {
  return {
    background: "linear-gradient(180deg, rgba(40,25,10,0.8), rgba(20,12,6,0.8))",
    border: "1px solid #7a5020", color: "#e0b840",
    fontSize: 12, padding: "2px 4px", cursor: "pointer",
    minWidth: 24, minHeight: 24, display: "flex", alignItems: "center", justifyContent: "center",
    opacity, WebkitTapHighlightColor: "transparent", borderRadius: 3,
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  };
}

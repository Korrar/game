export default function TopBar({ doors, initiative, treasures, money, mana, maxMana, onInv, onShop, onHideout, onBestiary, knowledge, musicOn, onToggleMusic, onSave, isMobile, gameW }) {
  const m = isMobile;

  // Mobile portrait: render inside game container as absolute-positioned bar
  if (m) {
    return (
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 34, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 4px",
        background: "linear-gradient(180deg,rgba(30,18,16,0.95),rgba(20,10,8,0.9))",
        borderBottom: "2px solid #3a2818",
      }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11 }}>
          <span>🏕️<b style={{ color: "#d4a030" }}>{doors}</b></span>
          <span>⏳<b style={{ color: "#d4a030" }}>{initiative}</b></span>
          <span>🔮<b style={{ color: "#60a0ff" }}>{Math.floor(mana)}</b></span>
        </div>
        {/* Currency */}
        <div style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 10 }}>
          <span style={{ color: "#b87333" }}>🟤<b>{money.copper}</b></span>
          <span style={{ color: "#a8a8b0" }}>⚪<b>{money.silver}</b></span>
          <span style={{ color: "#d4a030" }}>🟡<b>{money.gold}</b></span>
        </div>
        {/* Buttons */}
        <div style={{ display: "flex", gap: 2 }}>
          {onToggleMusic && (
            <button onClick={onToggleMusic} style={mobileBtnStyle(musicOn ? 1 : 0.5)}>
              {musicOn ? "🔊" : "🔇"}
            </button>
          )}
          {onSave && <button onClick={onSave} style={mobileBtnStyle(1)}>💾</button>}
          {onBestiary && <button onClick={onBestiary} style={mobileBtnStyle(1)}>📖</button>}
          <button onClick={onShop} style={mobileBtnStyle(1)}>🏪</button>
          <button onClick={onHideout} style={mobileBtnStyle(1)}>🏰</button>
          <button onClick={onInv} style={mobileBtnStyle(1)}>📜</button>
        </div>
      </div>
    );
  }

  // Desktop layout
  const hoverOn = (e) => { e.target.style.background = "#d4a030"; e.target.style.color = "#000"; };
  const hoverOff = (e) => { e.target.style.background = "none"; e.target.style.color = "#d4a030"; };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 12px", zIndex: 100, borderBottom: "3px solid #3a2818",
      background: "linear-gradient(180deg,#1e1210,#140a08)",
    }}>
      <span style={{ fontWeight: "bold", fontSize: 17, color: "#d4a030", textShadow: "1px 1px 0 #000" }}>⚔️ Wrota Przeznaczenia</span>
      <div style={{ display: "flex", gap: 14, fontSize: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>🏕️<span style={{ color: "#d4a030", fontWeight: "bold" }}>{doors}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>💎<span style={{ color: "#d4a030", fontWeight: "bold" }}>{treasures}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>⏳<span style={{ color: "#d4a030", fontWeight: "bold" }}>{initiative}</span></div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color: "#b87333" }}>🟤<b>{money.copper}</b></div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color: "#a8a8b0" }}>⚪<b>{money.silver}</b></div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color: "#d4a030" }}>🟡<b>{money.gold}</b></div>
        {mana !== undefined && <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color: "#60a0ff" }}>🔮<b>{Math.floor(mana)}/{maxMana || 100}</b></div>}
        {knowledge > 0 && <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color: "#60a0ff" }}>📖<b>{knowledge}</b></div>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {onToggleMusic && (
          <button style={desktopBtnStyle(musicOn ? 1 : 0.5)} onClick={onToggleMusic} title={musicOn ? "Wycisz" : "Włącz dźwięk"}>
            {musicOn ? "🔊" : "🔇"}
          </button>
        )}
        {onSave && <button style={desktopBtnStyle(1)} onClick={onSave} title="Zapisz grę">💾</button>}
        {onBestiary && <button style={desktopBtnStyle(1)} onClick={onBestiary} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>📖 Bestiariusz</button>}
        <button style={desktopBtnStyle(1)} onClick={onShop} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>🏪 Targ</button>
        <button style={desktopBtnStyle(1)} onClick={onHideout} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>🏰 Kryjówka</button>
        <button style={desktopBtnStyle(1)} onClick={onInv} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>📜 Ekwipunek</button>
      </div>
    </div>
  );
}

function mobileBtnStyle(opacity) {
  return {
    background: "none", border: "1px solid #8a6018", color: "#d4a030",
    fontSize: 14, padding: "3px 6px", cursor: "pointer",
    minWidth: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "center",
    opacity, WebkitTapHighlightColor: "transparent",
  };
}

function desktopBtnStyle(opacity) {
  return {
    background: "none", border: "2px solid #8a6018", color: "#d4a030",
    fontSize: 13, fontWeight: "bold", padding: "4px 10px", cursor: "pointer",
    transition: "all 0.15s", opacity,
  };
}

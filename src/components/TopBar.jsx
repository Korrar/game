const styles = {
  topbar: { position: "fixed", top: 0, left: 0, right: 0, height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", zIndex: 100, borderBottom: "3px solid #3a2818", background: "linear-gradient(180deg,#1e1210,#140a08)" },
  topbarMobile: { position: "fixed", top: 0, left: 0, right: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px", zIndex: 100, borderBottom: "3px solid #3a2818", background: "linear-gradient(180deg,#1e1210,#140a08)" },
  title: { fontWeight: "bold", fontSize: 17, color: "#d4a030", textShadow: "1px 1px 0 #000" },
  titleMobile: { fontWeight: "bold", fontSize: 13, color: "#d4a030", textShadow: "1px 1px 0 #000" },
  stats: { display: "flex", gap: 14, fontSize: 18 },
  statsMobile: { display: "flex", gap: 6, fontSize: 14 },
  stat: { display: "flex", alignItems: "center", gap: 3 },
  statVal: { color: "#d4a030", fontWeight: "bold" },
  currGroup: { display: "flex", gap: 10, alignItems: "center" },
  currGroupMobile: { display: "flex", gap: 4, alignItems: "center" },
  coin: (c) => ({ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color: c }),
  coinMobile: (c) => ({ display: "flex", alignItems: "center", gap: 1, fontSize: 12, color: c }),
  btns: { display: "flex", gap: 6 },
  btnsMobile: { display: "flex", gap: 3 },
  topBtn: { background: "none", border: "2px solid #8a6018", color: "#d4a030", fontSize: 13, fontWeight: "bold", padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" },
  topBtnMobile: { background: "none", border: "2px solid #8a6018", color: "#d4a030", fontSize: 18, fontWeight: "bold", padding: "6px 8px", cursor: "pointer", transition: "all 0.15s", minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" },
};

export default function TopBar({ doors, initiative, treasures, money, mana, maxMana, onInv, onShop, onHideout, onBestiary, knowledge, musicOn, onToggleMusic, onSave, isMobile }) {
  const m = isMobile;
  const hoverOn = (e) => { if (!m) { e.target.style.background = "#d4a030"; e.target.style.color = "#000"; } };
  const hoverOff = (e) => { if (!m) { e.target.style.background = "none"; e.target.style.color = "#d4a030"; } };

  const btnStyle = m ? styles.topBtnMobile : styles.topBtn;
  const coinStyle = m ? styles.coinMobile : styles.coin;

  return (
    <div style={m ? styles.topbarMobile : styles.topbar}>
      <span style={m ? styles.titleMobile : styles.title}>{m ? "⚔️" : "⚔️ Wrota Przeznaczenia"}</span>
      <div style={m ? styles.statsMobile : styles.stats}>
        <div style={styles.stat}>🏕️<span style={styles.statVal}>{doors}</span></div>
        <div style={styles.stat}>💎<span style={styles.statVal}>{treasures}</span></div>
        <div style={styles.stat}>⏳<span style={styles.statVal}>{initiative}</span></div>
      </div>
      <div style={m ? styles.currGroupMobile : styles.currGroup}>
        <div style={coinStyle("#b87333")}>🟤<b>{money.copper}</b></div>
        <div style={coinStyle("#a8a8b0")}>⚪<b>{money.silver}</b></div>
        <div style={coinStyle("#d4a030")}>🟡<b>{money.gold}</b></div>
        {mana !== undefined && <div style={coinStyle("#60a0ff")}>🔮<b>{Math.floor(mana)}</b></div>}
        {knowledge > 0 && <div style={coinStyle("#60a0ff")}>📖<b>{knowledge}</b></div>}
      </div>
      <div style={m ? styles.btnsMobile : styles.btns}>
        {onToggleMusic && (
          <button style={{ ...btnStyle, opacity: musicOn ? 1 : 0.5 }} onClick={onToggleMusic}
            title={musicOn ? "Wycisz" : "Włącz dźwięk"}>
            {musicOn ? "🔊" : "🔇"}
          </button>
        )}
        {onSave && (
          <button style={btnStyle} onClick={onSave} title="Zapisz grę">
            💾
          </button>
        )}
        {onBestiary && <button style={btnStyle} onClick={onBestiary} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{m ? "📖" : "📖 Bestiariusz"}</button>}
        <button style={btnStyle} onClick={onShop} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{m ? "🏪" : "🏪 Targ"}</button>
        <button style={btnStyle} onClick={onHideout} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{m ? "🏰" : "🏰 Kryjówka"}</button>
        <button style={btnStyle} onClick={onInv} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{m ? "📜" : "📜 Ekwipunek"}</button>
      </div>
    </div>
  );
}

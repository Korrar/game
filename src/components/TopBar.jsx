const styles = {
  topbar: { position: "fixed", top: 0, left: 0, right: 0, height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", zIndex: 100, borderBottom: "3px solid #3a2818", background: "linear-gradient(180deg,#1e1210,#140a08)" },
  title: { fontWeight: "bold", fontSize: 17, color: "#d4a030", textShadow: "1px 1px 0 #000" },
  stats: { display: "flex", gap: 14, fontSize: 18 },
  stat: { display: "flex", alignItems: "center", gap: 3 },
  statVal: { color: "#d4a030", fontWeight: "bold" },
  currGroup: { display: "flex", gap: 10, alignItems: "center" },
  coin: (c) => ({ display: "flex", alignItems: "center", gap: 2, fontSize: 16, color: c }),
  btns: { display: "flex", gap: 6 },
  topBtn: { background: "none", border: "2px solid #8a6018", color: "#d4a030", fontSize: 13, fontWeight: "bold", padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" },
};

export default function TopBar({ doors, initiative, treasures, money, mana, maxMana, onInv, onShop, onHideout, onBestiary, knowledge, musicOn, onToggleMusic, onSave }) {
  const hoverOn = (e) => { e.target.style.background = "#d4a030"; e.target.style.color = "#000"; };
  const hoverOff = (e) => { e.target.style.background = "none"; e.target.style.color = "#d4a030"; };

  return (
    <div style={styles.topbar}>
      <span style={styles.title}>⚔️ Wrota Przeznaczenia</span>
      <div style={styles.stats}>
        <div style={styles.stat}>🏕️<span style={styles.statVal}>{doors}</span></div>
        <div style={styles.stat}>💎<span style={styles.statVal}>{treasures}</span></div>
        <div style={styles.stat}>⏳<span style={styles.statVal}>{initiative}</span></div>
      </div>
      <div style={styles.currGroup}>
        <div style={styles.coin("#b87333")}>🟤<b>{money.copper}</b></div>
        <div style={styles.coin("#a8a8b0")}>⚪<b>{money.silver}</b></div>
        <div style={styles.coin("#d4a030")}>🟡<b>{money.gold}</b></div>
        {mana !== undefined && <div style={styles.coin("#60a0ff")}>🔮<b>{Math.floor(mana)}/{maxMana || 100}</b></div>}
        {knowledge > 0 && <div style={styles.coin("#60a0ff")}>📖<b>{knowledge}</b></div>}
      </div>
      <div style={styles.btns}>
        {onToggleMusic && (
          <button style={{ ...styles.topBtn, fontSize: 16, padding: "4px 8px", opacity: musicOn ? 1 : 0.5 }} onClick={onToggleMusic}
            title={musicOn ? "Wycisz" : "Włącz dźwięk"}>
            {musicOn ? "🔊" : "🔇"}
          </button>
        )}
        {onSave && (
          <button style={{ ...styles.topBtn, fontSize: 16, padding: "4px 8px" }} onClick={onSave} title="Zapisz grę">
            💾
          </button>
        )}
        {onBestiary && <button style={styles.topBtn} onClick={onBestiary} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>📖 Bestiariusz</button>}
        <button style={styles.topBtn} onClick={onShop} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>🏪 Targ</button>
        <button style={styles.topBtn} onClick={onHideout} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>🏰 Kryjówka</button>
        <button style={styles.topBtn} onClick={onInv} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>📜 Ekwipunek</button>
      </div>
    </div>
  );
}

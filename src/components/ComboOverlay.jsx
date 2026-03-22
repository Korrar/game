import { useState } from "react";

export default function ComboOverlay({ combo, comboCounter }) {
  const [state, setState] = useState({ visible: false, flash: null, trigger: null, counter: 0 });

  // Detect combo change during render (derived state pattern)
  if (combo && (combo !== state.trigger || comboCounter !== state.counter)) {
    if (state.flashTimer) clearTimeout(state.flashTimer);
    if (state.hideTimer) clearTimeout(state.hideTimer);
    const flashTimer = setTimeout(() => setState(s => ({ ...s, flash: null })), 300);
    const hideTimer = setTimeout(() => setState(s => ({ ...s, visible: false })), 2000);
    setState({
      visible: true,
      flash: combo.flashColor || "rgba(255,255,255,0.2)",
      trigger: combo,
      counter: comboCounter,
      flashTimer,
      hideTimer,
    });
  }

  const { visible, flash } = state;

  return (
    <>
      {/* Screen flash */}
      {flash && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: flash, pointerEvents: "none", zIndex: 150,
          animation: "comboFlash 0.3s ease-out forwards",
        }} />
      )}

      {/* Combo banner */}
      {visible && combo && (
        <div style={{
          position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
          zIndex: 160, textAlign: "center", pointerEvents: "none",
          animation: "comboAppear 0.3s ease-out",
        }}>
          <div style={{
            fontSize: 13, fontWeight: "bold", color: combo.color,
            letterSpacing: 4, textShadow: `0 0 12px ${combo.color}88`,
            marginBottom: 2,
          }}>COMBO!</div>
          <div style={{
            fontSize: 22, fontWeight: "bold", color: combo.color,
            textShadow: `0 0 16px ${combo.color}66, 0 0 30px ${combo.color}33`,
          }}>{combo.name}</div>
          {comboCounter > 1 && (
            <div style={{
              fontSize: 16, fontWeight: "bold", color: "#ffe080",
              textShadow: "0 0 8px rgba(255,224,128,0.4)",
              marginTop: 2,
            }}>x{comboCounter} seria!</div>
          )}
        </div>
      )}
    </>
  );
}

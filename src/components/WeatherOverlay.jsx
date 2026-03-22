import { useState } from "react";
import { getIconUrl } from "../rendering/icons";

function useTimedVisibility(trigger, duration = 2500) {
  const [state, setState] = useState({ visible: false, trigger: null, timerId: null });

  // Detect trigger change during render (React-recommended pattern for derived state)
  if (trigger && trigger !== state.trigger) {
    if (state.timerId) clearTimeout(state.timerId);
    const timerId = setTimeout(() => {
      setState(s => ({ ...s, visible: false, timerId: null }));
    }, duration);
    // setState during render is OK when guarded by a condition that prevents infinite loops
    setState({ visible: true, trigger, timerId });
  }

  return state.visible;
}

export default function WeatherOverlay({ weather }) {
  const visible = useTimedVisibility(weather);

  if (!visible || !weather) return null;

  return (
    <div style={{
      position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
      zIndex: 100, textAlign: "center", pointerEvents: "none",
      animation: "eventAppear 0.4s ease-out",
    }}>
      <div style={{
        background: "linear-gradient(180deg, rgba(14,8,10,0.95), rgba(8,4,6,0.95))",
        border: "2px solid #4080cc",
        padding: "12px 30px", minWidth: 250, borderRadius: 10,
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.5), 0 0 24px rgba(60,120,200,0.3), 0 0 50px rgba(60,120,200,0.1)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Top accent line */}
        <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 1, background: "linear-gradient(90deg, transparent, rgba(60,120,200,0.5), transparent)" }} />
        {/* Corner gems */}
        <div style={{ position: "absolute", top: 4, left: 8, fontSize: 7, color: "#4080cc", opacity: 0.5 }}>◆</div>
        <div style={{ position: "absolute", top: 4, right: 8, fontSize: 7, color: "#4080cc", opacity: 0.5 }}>◆</div>

        <div style={{ marginBottom: 4, filter: "drop-shadow(0 0 8px rgba(60,120,200,0.4))" }}>{getIconUrl(weather.icon, 30) ? <img src={getIconUrl(weather.icon, 30)} width={30} height={30} alt="" /> : null}</div>
        <div style={{ fontSize: 18, color: "#80c0e0", fontWeight: "bold", textShadow: "0 0 8px rgba(80,180,220,0.3)" }}>{weather.name}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{weather.description}</div>
      </div>
    </div>
  );
}

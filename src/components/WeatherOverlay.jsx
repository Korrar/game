import { useState, useEffect } from "react";

export default function WeatherOverlay({ weather }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [weather]);

  if (!visible || !weather) return null;

  return (
    <div style={{
      position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
      zIndex: 100, textAlign: "center", pointerEvents: "none",
      animation: "eventAppear 0.4s ease-out",
    }}>
      <div style={{
        background: "rgba(14,8,10,0.92)",
        border: "3px solid #4080cc",
        padding: "10px 28px", minWidth: 240, borderRadius: 8,
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.5), 0 0 20px rgba(60,120,200,0.3)",
      }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>{weather.emoji}</div>
        <div style={{ fontSize: 18, color: "#80c0e0", fontWeight: "bold" }}>{weather.name}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{weather.description}</div>
      </div>
    </div>
  );
}

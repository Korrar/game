// GroundMarks — persistent ground scorch/frost/blood marks from combat
// Drawn on Canvas2D overlay, fade over time

export const GROUND_MARKS_CONFIG = {
  maxMarks: 30,
  lifetime: 600, // frames (~10 seconds at 60fps)
};

// Element → visual mark style
const MARK_STYLES = {
  fire:      { type: "scorch", color: "rgba(40,20,0,0.6)",       alpha: 0.5 },
  ice:       { type: "frost",  color: "rgba(140,210,255,0.5)",    alpha: 0.45 },
  lightning: { type: "char",   color: "rgba(60,50,20,0.55)",      alpha: 0.4 },
  poison:    { type: "acid",   color: "rgba(60,140,30,0.5)",      alpha: 0.4 },
  shadow:    { type: "void",   color: "rgba(50,20,80,0.5)",       alpha: 0.45 },
  holy:      { type: "glow",   color: "rgba(255,230,140,0.35)",   alpha: 0.35 },
};
const BLOOD_STYLE = { type: "blood", color: "rgba(120,20,20,0.5)", alpha: 0.45 };

export function getMarkStyle(element) {
  if (!element || element === "melee") return BLOOD_STYLE;
  return MARK_STYLES[element] || BLOOD_STYLE;
}

export function createGroundMark(x, y, element, damage) {
  const style = getMarkStyle(element);
  const baseRadius = 8 + Math.min(damage, 60) * 0.4;
  const radius = baseRadius + (Math.random() - 0.5) * 4;

  return {
    x,
    y,
    radius,
    style,
    life: GROUND_MARKS_CONFIG.lifetime,
    maxLife: GROUND_MARKS_CONFIG.lifetime,
  };
}

export function updateGroundMarks(marks) {
  const dead = [];
  for (let i = 0; i < marks.length; i++) {
    marks[i].life--;
    if (marks[i].life <= 0) dead.push(i);
  }
  return dead;
}

export function clearGroundMarks() {
  return [];
}

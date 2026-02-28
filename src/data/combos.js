// Element combo definitions – extracted from App.jsx inline objects
// Each combo triggers when two different elements hit the same NPC within 5 seconds

export const COMBOS = {
  "fire+ice":       { name: "Parowy Wybuch",       mult: 1.5,  color: "#e0e0e0", flashColor: "rgba(220,220,220,0.25)" },
  "fire+lightning":  { name: "Przeładowanie",       mult: 1.4,  color: "#ffaa20", flashColor: "rgba(255,170,30,0.25)" },
  "ice+lightning":   { name: "Roztrzaskanie",       mult: 1.6,  color: "#80d0ff", flashColor: "rgba(128,208,255,0.25)" },
  "fire+shadow":     { name: "Mroczny Płomień",     mult: 1.35, color: "#a040a0", flashColor: "rgba(160,64,160,0.25)" },
  "ice+shadow":      { name: "Lodowe Przekleństwo", mult: 1.45, color: "#6040a0", flashColor: "rgba(96,64,160,0.25)" },
};

// Max combo streak bonus: 5% per consecutive combo, capped at 25%
export const COMBO_STREAK_BONUS = 0.05;
export const COMBO_STREAK_CAP = 0.25;
// Combo streak resets after this many ms without a combo
export const COMBO_STREAK_TIMEOUT = 4000;

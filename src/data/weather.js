// Weather system – random per-room environmental effects that modify combat rules

export const WEATHER_TYPES = {
  storm: {
    id: "storm", name: "Burza", emoji: "⛈️",
    description: "Pioruny +50%, strzały -30% celności",
    damageMult: { lightning: 1.5 },
    accuracyMult: { arrow: 0.7 },
    fxOverride: { rain: 1.0, wind: 0.9 },
    excludeBiomes: ["volcano"],
    weight: 1,
  },
  fog: {
    id: "fog", name: "Mgła", emoji: "🌫️",
    description: "Wrogowie niewidoczni z daleka",
    damageMult: {},
    accuracyMult: {},
    fogVisibility: 0.15,
    fxOverride: { fog: true, fogIntensity: 3.0 },
    excludeBiomes: ["desert", "volcano"],
    weight: 1,
  },
  rain: {
    id: "rain", name: "Deszcz", emoji: "🌧️",
    description: "Ogień -50% obrażeń",
    damageMult: { fire: 0.5 },
    accuracyMult: {},
    fxOverride: { rain: 0.8 },
    excludeBiomes: ["volcano", "desert"],
    weight: 1,
  },
  gale: {
    id: "gale", name: "Wichura", emoji: "💨",
    description: "Pociski znoszone wiatrem",
    damageMult: {},
    accuracyMult: {},
    windDeflection: 0.8,
    fxOverride: { wind: 1.0, leaves: true },
    excludeBiomes: [],
    weight: 1,
  },
};

export function rollWeather(biomeId) {
  if (Math.random() >= 0.4) return null;
  const eligible = Object.values(WEATHER_TYPES)
    .filter(w => !w.excludeBiomes.includes(biomeId));
  if (eligible.length === 0) return null;
  const totalWeight = eligible.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const w of eligible) {
    roll -= w.weight;
    if (roll <= 0) return w;
  }
  return eligible[eligible.length - 1];
}

export function applyWeatherDamage(baseDamage, element, weather) {
  if (!weather || !weather.damageMult || !element) return baseDamage;
  const mult = weather.damageMult[element];
  if (mult != null) return Math.round(baseDamage * mult);
  return baseDamage;
}

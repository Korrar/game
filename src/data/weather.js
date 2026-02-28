// Weather system – random per-room environmental effects that modify combat rules

export const WEATHER_TYPES = {
  storm: {
    id: "storm", name: "Burza", icon: "storm",
    description: "Pioruny +50%, strzały -30% celności",
    damageMult: { lightning: 1.5 },
    accuracyMult: { arrow: 0.7 },
    fxOverride: { rain: 1.0, wind: 0.9 },
    excludeBiomes: ["volcano"],
    weight: 1,
    // Skillshot effect: random lightning strikes every 6s
    skillshotEffect: "lightning_strikes",
    lightningInterval: 6000,
    lightningDamage: 15,
  },
  fog: {
    id: "fog", name: "Mgła", icon: "fog",
    description: "Wrogowie niewidoczni z daleka, zasięg -30%",
    damageMult: {},
    accuracyMult: {},
    fogVisibility: 0.15,
    fxOverride: { fog: true, fogIntensity: 3.0 },
    excludeBiomes: ["desert", "volcano"],
    weight: 1,
    // Skillshot effect: enemies spawn closer (reduced visibility range)
    skillshotEffect: "reduced_range",
    rangeReduction: 0.7,
  },
  rain: {
    id: "rain", name: "Deszcz", icon: "rain",
    description: "Ogień -50%, pociski łukowe lecą krócej",
    damageMult: { fire: 0.5 },
    accuracyMult: {},
    fxOverride: { rain: 0.8 },
    excludeBiomes: ["volcano", "desert"],
    weight: 1,
    // Skillshot effect: arc projectiles affected by extra gravity
    skillshotEffect: "extra_gravity",
    gravityMult: 1.4,
  },
  gale: {
    id: "gale", name: "Wichura", icon: "wind",
    description: "Pociski linearne znoszone wiatrem",
    damageMult: {},
    accuracyMult: {},
    windDeflection: 0.8,
    fxOverride: { wind: 1.0, leaves: true },
    excludeBiomes: [],
    weight: 1,
    // Skillshot effect: linear projectiles drift sideways
    skillshotEffect: "wind_drift",
    windStrength: 0.5,  // pixels per frame drift
    windDir: 0,         // set randomly per room: -1 or 1
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
    if (roll <= 0) {
      // Set random wind direction for gale
      const result = { ...w };
      if (result.skillshotEffect === "wind_drift") {
        result.windDir = Math.random() < 0.5 ? -1 : 1;
      }
      return result;
    }
  }
  const last = { ...eligible[eligible.length - 1] };
  if (last.skillshotEffect === "wind_drift") last.windDir = Math.random() < 0.5 ? -1 : 1;
  return last;
}

export function applyWeatherDamage(baseDamage, element, weather) {
  if (!weather || !weather.damageMult || !element) return baseDamage;
  const mult = weather.damageMult[element];
  if (mult != null) return Math.round(baseDamage * mult);
  return baseDamage;
}

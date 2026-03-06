// Morale system — caravan crew morale affects mercenary performance
// Morale ranges from 0 to 100, starting at 50

export const MORALE_CONFIG = {
  initial: 50,
  min: 0,
  max: 100,
  // Thresholds and their effects
  thresholds: [
    { min: 0,  max: 19, id: "desperate",  name: "Desperacja",     color: "#cc2020", mercDmgMult: 0.70, mercSpeedMult: 0.80, desertionChance: 0.15 },
    { min: 20, max: 39, id: "low",         name: "Niska Morala",   color: "#cc8020", mercDmgMult: 0.85, mercSpeedMult: 0.90, desertionChance: 0.05 },
    { min: 40, max: 59, id: "neutral",     name: "Neutralna",      color: "#b0b040", mercDmgMult: 1.00, mercSpeedMult: 1.00, desertionChance: 0 },
    { min: 60, max: 79, id: "high",        name: "Wysoka Morala",  color: "#40b040", mercDmgMult: 1.10, mercSpeedMult: 1.05, desertionChance: 0 },
    { min: 80, max: 100, id: "inspired",   name: "Inspiracja!",    color: "#40d0d0", mercDmgMult: 1.20, mercSpeedMult: 1.10, desertionChance: 0 },
  ],
};

// Events that modify morale
export const MORALE_EVENTS = {
  // Positive
  fast_victory:     { delta: +5,  desc: "Szybkie zwycięstwo" },       // room cleared < 20s
  boss_kill:        { delta: +10, desc: "Boss pokonany!" },
  no_damage_room:   { delta: +8,  desc: "Bezbłędna obrona" },         // 0 caravan dmg in room
  good_event:       { delta: +4,  desc: "Pomyślne zdarzenie" },
  cook_meal:        { delta: +3,  desc: "Kucharz przygotował posiłek" },
  // Negative
  caravan_hit:      { delta: -3,  desc: "Statek uszkodzony" },         // per hit
  merc_death:       { delta: -8,  desc: "Najemnik poległ!" },
  bad_event:        { delta: -5,  desc: "Złe zdarzenie" },
  long_fight:       { delta: -3,  desc: "Długa walka" },               // room > 60s
  low_health:       { delta: -4,  desc: "Statek w krytycznym stanie" }, // < 20% HP
};

export const getMoraleThreshold = (morale) => {
  return MORALE_CONFIG.thresholds.find(t => morale >= t.min && morale <= t.max) || MORALE_CONFIG.thresholds[2];
};

export const CARAVAN_LEVELS = [
  { name: "Stary Dyliżans",       hp: 100, armor: 0, cost: null },
  { name: "Wzmocniony Dyliżans",  hp: 150, armor: 1, cost: { silver: 8 },  barricade: { hp: 60 } },
  { name: "Opancerzony Galeon",    hp: 220, armor: 2, cost: { silver: 20 }, barricade: { hp: 100 }, thornArmor: { damage: 6 } },
  { name: "Stalowy Pociąg",        hp: 300, armor: 3, cost: { gold: 2 },   barricade: { hp: 140 }, thornArmor: { damage: 10 }, dog: true },
  { name: "Piracki Galeon",        hp: 400, armor: 5, cost: { gold: 5 },   barricade: { hp: 200 }, thornArmor: { damage: 15 }, dog: true, warDrums: { bonus: 15 } },
  { name: "Złoty Galeon",          hp: 500, armor: 7, cost: { gold: 12 },  barricade: { hp: 280 }, thornArmor: { damage: 22 }, dog: true, warDrums: { bonus: 25 } },
];

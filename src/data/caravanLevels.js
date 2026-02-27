export const CARAVAN_LEVELS = [
  { name: "Drewniany Wóz",     hp: 100, armor: 0, cost: null },
  { name: "Wzmocniony Wóz",    hp: 150, armor: 1, cost: { silver: 8 },  barricade: { hp: 60 } },
  { name: "Opancerzony Wóz",   hp: 220, armor: 2, cost: { silver: 20 }, barricade: { hp: 100 }, tower: { hp: 150, damage: 8, attackCd: 2000, range: 40 } },
  { name: "Stalowa Karawana",   hp: 300, armor: 3, cost: { gold: 2 },   barricade: { hp: 140 }, tower: { hp: 250, damage: 12, attackCd: 1800, range: 45 }, dog: true },
  { name: "Forteca na Kółkach", hp: 400, armor: 5, cost: { gold: 5 },   barricade: { hp: 200 }, tower: { hp: 380, damage: 16, attackCd: 1600, range: 50 }, dog: true },
  { name: "Smocza Karawana",    hp: 500, armor: 7, cost: { gold: 12 },  barricade: { hp: 280 }, tower: { hp: 500, damage: 22, attackCd: 1400, range: 55 }, dog: true },
];

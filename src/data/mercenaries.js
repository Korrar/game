// Mercenary types for the summon system
// Each type has unique stats, cost, and combat style
// Knight level applies a multiplier to hp and damage

export const MERCENARY_TYPES = [
  {
    id: "knight", emoji: "⚔️", name: "Rycerz",
    desc: "Wytrzymały zbrojny wojownik",
    hp: 55, damage: 8, speed: 0.04, attackCd: 2500,
    cost: { copper: 25 },
    bodyColor: "#7a7a8a", armorColor: "#4a4a5a",
    color: "#7a8aaa",
    weapon: "sword", combatStyle: "melee",
  },
  {
    id: "rogue", emoji: "🗡️", name: "Łotrzyk",
    desc: "Szybki i zwinny zabójca",
    hp: 30, damage: 5, speed: 0.08, attackCd: 1400,
    cost: { copper: 18 },
    bodyColor: "#5a4a3a", armorColor: "#2a2a1a",
    color: "#a08050",
    weapon: "dagger", combatStyle: "melee",
  },
  {
    id: "mage", emoji: "🔮", name: "Mag Bojowy",
    desc: "Potężne magiczne uderzenia",
    hp: 25, damage: 3, speed: 0.03, attackCd: 3500,
    cost: { copper: 35 },
    bodyColor: "#4a3a6a", armorColor: "#2a1a4a",
    color: "#8060c0",
    weapon: "staff", combatStyle: "ranged",
    mana: 60, manaRegen: 2, spellCost: 15, spellDamage: 14,
    spellCd: 3500, spellElement: "fire", meleeDamage: 3,
  },
  {
    id: "archer", emoji: "🏹", name: "Łucznik",
    desc: "Celne i szybkie strzały",
    hp: 40, damage: 6, speed: 0.035, attackCd: 1800,
    cost: { copper: 22 },
    bodyColor: "#5a6a3a", armorColor: "#3a4a1a",
    color: "#60a050",
    weapon: "bow", combatStyle: "ranged",
    projectileDamage: 6, projectileCd: 1800, range: 35,
  },
];

// Knight level multipliers for mercenary stats
export const LEVEL_MULTIPLIERS = [1.0, 1.3, 1.6, 2.0, 2.5];

// Mercenary types for the recruit system
// Each type has unique stats, cost, and combat style

export const MERCENARY_TYPES = [
  {
    id: "knight", icon: "sheriff", name: "Szeryf",
    desc: "Wytrzymały stróż prawa z rewolwerem",
    hp: 45, damage: 7, speed: 0.04, attackCd: 2800,
    cost: { copper: 25 },
    bodyColor: "#7a7a8a", armorColor: "#4a4a5a",
    color: "#7a8aaa",
    weapon: "sword", combatStyle: "melee",
  },
  {
    id: "rogue", icon: "pirate", name: "Pirat",
    desc: "Szybki zabójca, cios krytyczny przy niskim HP wroga",
    hp: 38, damage: 6, speed: 0.09, attackCd: 1200,
    cost: { copper: 20 },
    bodyColor: "#5a4a3a", armorColor: "#2a2a1a",
    color: "#a08050",
    weapon: "dagger", combatStyle: "melee",
    critChance: 0.25, critMult: 2.0,
  },
  {
    id: "mage", icon: "alchemist", name: "Alchemik",
    desc: "Potężne bomby i mikstury",
    hp: 35, damage: 4, speed: 0.03, attackCd: 3000,
    cost: { copper: 30 },
    bodyColor: "#4a3a6a", armorColor: "#2a1a4a",
    color: "#8060c0",
    weapon: "staff", combatStyle: "ranged",
    mana: 80, manaRegen: 3, spellCost: 12, spellDamage: 18,
    spellCd: 2800, spellElement: "fire", meleeDamage: 4,
  },
  {
    id: "archer", icon: "gunner", name: "Strzelec",
    desc: "Celne i szybkie strzały z karabinu",
    hp: 40, damage: 6, speed: 0.035, attackCd: 1800,
    cost: { copper: 22 },
    bodyColor: "#5a6a3a", armorColor: "#3a4a1a",
    color: "#60a050",
    weapon: "bow", combatStyle: "ranged",
    projectileDamage: 7, projectileCd: 1600, range: 40,
  },
];

// Rank multipliers for mercenary stats
export const LEVEL_MULTIPLIERS = [1.0, 1.3, 1.6, 2.0, 2.5];

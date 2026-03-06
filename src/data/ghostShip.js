// Ghost Ship mode — special high-risk/high-reward encounter
// Available after room 30, 10% chance on room entry
// Enemies are ghostly (translucent), mercenaries refuse to fight (fear)
// Loot is tripled, fortifications still work

export const GHOST_SHIP_CONFIG = {
  minRoom: 30,
  chance: 0.10,
  lootMultiplier: 3,
  mercDisabled: true, // mercs won't fight
  enemyOpacity: 0.4, // visual transparency
  waveCount: 4,
  enemyHpMult: 1.2,
  enemyDmgMult: 0.9, // ghosts hit slightly weaker but are hard to target
  // Special ghost enemies
  enemies: [
    {
      icon: "ghost", name: "Widmo Pirata", hp: 50, resist: null,
      loot: { copper: 30 }, rarity: "rare",
      bodyColor: "#8888cc", armorColor: "#6666aa", bodyType: "humanoid",
      ability: { type: "shadowBolt", damage: 12, cooldown: 4000, element: "shadow", range: 30 },
      isGhost: true,
    },
    {
      icon: "skull", name: "Upiór Kapitana", hp: 80, resist: "shadow",
      loot: { copper: 50 }, rarity: "epic",
      bodyColor: "#aa88cc", armorColor: "#8866aa", bodyType: "humanoid",
      ability: { type: "drain", damage: 15, cooldown: 5000, element: "shadow", range: 25 },
      isGhost: true,
    },
    {
      icon: "ghost", name: "Duch Marynarza", hp: 35, resist: null,
      loot: { copper: 20 }, rarity: "uncommon",
      bodyColor: "#7788bb", armorColor: "#5566aa", bodyType: "humanoid",
      ability: null,
      isGhost: true,
    },
    {
      icon: "skull", name: "Widmowy Kanonier", hp: 60, resist: "fire",
      loot: { copper: 40 }, rarity: "rare",
      bodyColor: "#9988bb", armorColor: "#7766aa", bodyType: "humanoid",
      ability: { type: "fireBreath", damage: 10, cooldown: 4500, element: "fire", range: 20 },
      isGhost: true,
    },
  ],
  // Reward for clearing all waves
  completionReward: {
    silver: 10,
    copper: 100,
  },
  completionMessage: "Widmowy Statek oczyszczony! Legendarny łup!",
};

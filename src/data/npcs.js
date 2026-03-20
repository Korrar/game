// NPC definitions per biome — Western × Pirate theme
// hp: hit points, resist: elemental resistance (null, "fire", "ice")

export const BIOME_NPCS = {
  jungle: [
    { icon: "recruit", name: "Piracki Strażnik", hp: 40, resist: null, loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#8B7355", armorColor: "#2d5a1e", bodyType: "humanoid", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 22 } },
    { icon: "skull", name: "Krokodyl Rzeczny", hp: 25, resist: null, loot: { copper: 8 }, rarity: "common", bodyColor: "#4a6a30", armorColor: "#2a4020", bodyType: "serpent", ability: { type: "charge", damage: 8, cooldown: 5500, element: null, range: 20 } },
    { icon: "skull", name: "Dzika Małpa", hp: 20, resist: null, loot: { copper: 5 }, rarity: "common", bodyColor: "#8B6914", armorColor: "#5a4020", bodyType: "quadruped", ability: { type: "charge", damage: 8, cooldown: 5000, element: null, range: 20 } },
    { icon: "poison", name: "Jadowita Żaba", hp: 18, resist: null, loot: { copper: 6 }, rarity: "common", bodyColor: "#e06020", armorColor: "#a04010", bodyType: "frog", ability: { type: "poisonSpit", damage: 6, cooldown: 4500, element: "shadow", range: 18 } },
    { icon: "skull", name: "Dżunglowy Pająk", hp: 30, resist: null, loot: { copper: 10 }, rarity: "uncommon", bodyColor: "#2a4a20", armorColor: "#1a3010", bodyType: "spider", ability: { type: "poisonSpit", damage: 5, cooldown: 4000, element: "shadow", range: 20 } },
  ],
  island: [
    { icon: "pirate", name: "Kapitan Piratu", hp: 35, resist: "ice", loot: { copper: 15 }, rarity: "uncommon", bodyColor: "#8a6a50", armorColor: "#4a3030", bodyType: "humanoid", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 24 } },
    { icon: "water", name: "Syrena Morska", hp: 45, resist: "ice", loot: { copper: 20 }, rarity: "rare", bodyColor: "#4a8090", armorColor: "#2a5060", bodyType: "floating", ability: { type: "iceShot", damage: 8, cooldown: 4500, element: "ice", range: 25 } },
    { icon: "skull", name: "Krab Kokosowy", hp: 28, resist: null, loot: { copper: 9 }, rarity: "common", bodyColor: "#b04830", armorColor: "#803020", bodyType: "spider", ability: { type: "charge", damage: 8, cooldown: 5000, element: null, range: 18 } },
    { icon: "skull", name: "Waran Wyspowy", hp: 40, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#5a6a40", armorColor: "#3a4a28", bodyType: "serpent", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 22 } },
    { icon: "skull", name: "Rekin Przybrzeżny", hp: 55, resist: "ice", loot: { copper: 18 }, rarity: "rare", bodyColor: "#506a80", armorColor: "#304a60", bodyType: "serpent", ability: { type: "charge", damage: 15, cooldown: 4500, element: null, range: 28 } },
    { icon: "pirate", name: "Piracki Kanonier", hp: 42, resist: null, loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#7a5a40", armorColor: "#4a3020", bodyType: "humanoid", ability: { type: "fireBreath", damage: 12, cooldown: 5000, element: "fire", range: 24 } },
    { icon: "skull", name: "Ośmiornica", hp: 35, resist: "ice", loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#8a4060", armorColor: "#602040", bodyType: "spider", ability: { type: "poisonSpit", damage: 7, cooldown: 3500, element: "shadow", range: 22 } },
  ],
  desert: [
    { icon: "recruit", name: "Bandyta z Kanionu", hp: 60, resist: "fire", loot: { silver: 1 }, rarity: "epic", bodyColor: "#6040a0", armorColor: "#402060", bodyType: "humanoid", ability: { type: "shadowBolt", damage: 12, cooldown: 4000, element: "shadow", range: 30 } },
    { icon: "skull", name: "Pustynny Skorpion", hp: 30, resist: "fire", loot: { copper: 10 }, rarity: "common", bodyColor: "#6a5030", armorColor: "#4a3020", bodyType: "scorpion", ability: { type: "poisonSpit", damage: 8, cooldown: 4000, element: "shadow", range: 25 } },
    { icon: "fire", name: "Kaktusowy Strzelec", hp: 45, resist: "fire", loot: { copper: 18 }, rarity: "rare", bodyColor: "#806040", armorColor: "#503020", bodyType: "humanoid", ability: { type: "fireBreath", damage: 10, cooldown: 5000, element: "fire", range: 20 } },
    { icon: "skull", name: "Pustynna Żmija", hp: 22, resist: "fire", loot: { copper: 7 }, rarity: "common", bodyColor: "#c0a050", armorColor: "#907030", bodyType: "serpent", ability: { type: "poisonSpit", damage: 6, cooldown: 3500, element: "shadow", range: 20 } },
    { icon: "skull", name: "Ropucha Piaskowa", hp: 26, resist: "fire", loot: { copper: 8 }, rarity: "common", bodyColor: "#b09060", armorColor: "#806040", bodyType: "frog", ability: { type: "poisonSpit", damage: 6, cooldown: 4000, element: "shadow", range: 18 } },
  ],
  winter: [
    { icon: "skull", name: "Arktyczny Wilk", hp: 35, resist: "ice", loot: { copper: 12 }, rarity: "common", bodyColor: "#8090a0", armorColor: "#506070", bodyType: "quadruped", ability: { type: "charge", damage: 15, cooldown: 6000, element: null, range: 30 } },
    { icon: "anchor", name: "Duch Lodowca", hp: 50, resist: "ice", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#6080b0", armorColor: "#304060", bodyType: "floating", ability: { type: "iceShot", damage: 8, cooldown: 4500, element: "ice", range: 24 } },
    { icon: "ice", name: "Lodowy Pirat", hp: 55, resist: "ice", loot: { silver: 1 }, rarity: "rare", bodyColor: "#6a6a80", armorColor: "#404060", bodyType: "humanoid", ability: { type: "iceShot", damage: 10, cooldown: 4000, element: "ice", range: 25 } },
    { icon: "skull", name: "Lodowy Pająk", hp: 32, resist: "ice", loot: { copper: 11 }, rarity: "common", bodyColor: "#90a8c0", armorColor: "#607080", bodyType: "spider", ability: { type: "iceShot", damage: 6, cooldown: 4500, element: "ice", range: 20 } },
  ],
  city: [
    { icon: "skull", name: "Szczur Portowy", hp: 25, resist: null, loot: { copper: 8 }, rarity: "common", bodyColor: "#6a5a40", armorColor: "#3a3020", bodyType: "quadruped", ability: { type: "charge", damage: 6, cooldown: 4500, element: null, range: 18 } },
    { icon: "baron", name: "Szef Mafii", hp: 55, resist: null, loot: { silver: 1, copper: 10 }, rarity: "epic", bodyColor: "#5a3040", armorColor: "#2a1820", bodyType: "humanoid", ability: { type: "shadowBolt", damage: 12, cooldown: 4500, element: "shadow", range: 28 } },
    { icon: "swords", name: "Złodziej Portowy", hp: 30, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#4a4a4a", armorColor: "#2a2a2a", bodyType: "humanoid", ability: { type: "charge", damage: 8, cooldown: 4000, element: null, range: 20 } },
    { icon: "skull", name: "Kanałowy Skorpion", hp: 28, resist: null, loot: { copper: 9 }, rarity: "common", bodyColor: "#4a4a30", armorColor: "#2a2a18", bodyType: "scorpion", ability: { type: "poisonSpit", damage: 7, cooldown: 4000, element: "shadow", range: 20 } },
    { icon: "pirate", name: "Portowy Najemnik", hp: 42, resist: null, loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#6a5050", armorColor: "#3a2828", bodyType: "humanoid", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 22 } },
  ],
  volcano: [
    { icon: "fire", name: "Strażnik Wulkanu", hp: 70, resist: "fire", loot: { silver: 1, copper: 20 }, rarity: "epic", bodyColor: "#8a3030", armorColor: "#4a2020", bodyType: "humanoid", ability: { type: "fireBreath", damage: 15, cooldown: 5000, element: "fire", range: 20 } },
    { icon: "fire", name: "Morski Wąż Ognia", hp: 90, resist: "fire", loot: { silver: 2 }, rarity: "legendary", bodyColor: "#6a4020", armorColor: "#3a2010", bodyType: "serpent", ability: { type: "fireBreath", damage: 12, cooldown: 5000, element: "fire", range: 20 } },
    { icon: "skull", name: "Lawowy Skorpion", hp: 50, resist: "fire", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#6a2020", armorColor: "#401010", bodyType: "scorpion", ability: { type: "fireBreath", damage: 10, cooldown: 4500, element: "fire", range: 20 } },
    { icon: "skull", name: "Ognisty Salamander", hp: 40, resist: "fire", loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#c04020", armorColor: "#902010", bodyType: "frog", ability: { type: "fireBreath", damage: 8, cooldown: 4000, element: "fire", range: 18 } },
  ],
  summer: [
    { icon: "bull", name: "Byk Prerii", hp: 30, resist: null, loot: { copper: 10 }, rarity: "common", bodyColor: "#6a5030", armorColor: "#4a3820", bodyType: "quadruped", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 25 } },
    { icon: "star", name: "Orzeł Łowca", hp: 35, resist: null, loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#c0a020", armorColor: "#806010", bodyType: "floating", ability: { type: "poisonSpit", damage: 6, cooldown: 3500, element: "shadow", range: 20 } },
    { icon: "recruit", name: "Strach na Polu", hp: 45, resist: "fire", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#8a7a50", armorColor: "#5a5030", bodyType: "humanoid", ability: { type: "fireBreath", damage: 8, cooldown: 5000, element: "fire", range: 20 } },
  ],
  autumn: [
    { icon: "skull", name: "Kojot", hp: 28, resist: null, loot: { copper: 9 }, rarity: "common", bodyColor: "#a06020", armorColor: "#704010", bodyType: "quadruped", ability: { type: "charge", damage: 8, cooldown: 4500, element: null, range: 22 } },
    { icon: "gunner", name: "Traper", hp: 50, resist: null, loot: { copper: 18 }, rarity: "rare", bodyColor: "#6a5a30", armorColor: "#3a3018", bodyType: "humanoid", ability: { type: "poisonSpit", damage: 10, cooldown: 4000, element: "shadow", range: 24 } },
    { icon: "ghost", name: "Duch Kanionu", hp: 40, resist: "fire", loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#c06020", armorColor: "#804010", bodyType: "floating", ability: { type: "fireBreath", damage: 8, cooldown: 5000, element: "fire", range: 18 } },
  ],
  spring: [
    { icon: "skull", name: "Wilk Stepowy", hp: 25, resist: null, loot: { copper: 8 }, rarity: "common", bodyColor: "#707060", armorColor: "#505040", bodyType: "quadruped", ability: { type: "charge", damage: 8, cooldown: 5000, element: null, range: 22 } },
    { icon: "recruit", name: "Dezerter", hp: 40, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#50a050", armorColor: "#307030", bodyType: "humanoid", ability: { type: "poisonSpit", damage: 7, cooldown: 3800, element: "shadow", range: 22 } },
    { icon: "skull", name: "Niedźwiedź Grizzly", hp: 55, resist: null, loot: { copper: 20 }, rarity: "rare", bodyColor: "#6a4a2a", armorColor: "#4a3018", bodyType: "quadruped", ability: { type: "charge", damage: 15, cooldown: 6000, element: null, range: 30 } },
  ],
  mushroom: [
    { icon: "skull", name: "Nietoperz Jaskiniowy", hp: 35, resist: null, loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#8060a0", armorColor: "#504070", bodyType: "floating", ability: { type: "shadowBolt", damage: 7, cooldown: 4000, element: "shadow", range: 22 } },
    { icon: "skull", name: "Jaskiniowy Pająk", hp: 40, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#3a3a3a", armorColor: "#1a1a1a", bodyType: "spider", ability: { type: "poisonSpit", damage: 7, cooldown: 4000, element: "shadow", range: 22 } },
    { icon: "skull", name: "Grzybowy Szczur", hp: 22, resist: null, loot: { copper: 7 }, rarity: "common", bodyColor: "#8a6a80", armorColor: "#5a4050", bodyType: "quadruped", ability: { type: "charge", damage: 5, cooldown: 4500, element: null, range: 18 } },
    { icon: "poison", name: "Trujący Ślimak", hp: 30, resist: null, loot: { copper: 10 }, rarity: "common", bodyColor: "#7050a0", armorColor: "#402070", bodyType: "frog", ability: { type: "poisonSpit", damage: 6, cooldown: 3500, element: "shadow", range: 18 } },
    { icon: "skull", name: "Jaskiniowy Skorpion", hp: 38, resist: null, loot: { copper: 13 }, rarity: "uncommon", bodyColor: "#504040", armorColor: "#302020", bodyType: "scorpion", ability: { type: "poisonSpit", damage: 8, cooldown: 4000, element: "shadow", range: 22 } },
  ],
  swamp: [
    { icon: "skull", name: "Aligator", hp: 30, resist: "ice", loot: { copper: 10 }, rarity: "common", bodyColor: "#506030", armorColor: "#304020", bodyType: "serpent", ability: { type: "charge", damage: 12, cooldown: 6000, element: null, range: 25 } },
    { icon: "water", name: "Bagienne Widmo", hp: 45, resist: "ice", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#506050", armorColor: "#304030", bodyType: "floating", ability: { type: "iceShot", damage: 8, cooldown: 4500, element: "ice", range: 22 } },
    { icon: "poison", name: "Żabi Szaman", hp: 50, resist: "ice", loot: { copper: 18 }, rarity: "rare", bodyColor: "#408040", armorColor: "#205020", bodyType: "frog", ability: { type: "poisonSpit", damage: 9, cooldown: 4000, element: "shadow", range: 22 } },
    { icon: "skull", name: "Bagienne Pijawki", hp: 20, resist: "ice", loot: { copper: 6 }, rarity: "common", bodyColor: "#304830", armorColor: "#1a3018", bodyType: "serpent", ability: { type: "poisonSpit", damage: 5, cooldown: 3500, element: "shadow", range: 18 } },
    { icon: "skull", name: "Bagienne Robale", hp: 32, resist: null, loot: { copper: 11 }, rarity: "uncommon", bodyColor: "#506040", armorColor: "#304028", bodyType: "spider", ability: { type: "poisonSpit", damage: 6, cooldown: 4000, element: "shadow", range: 20 } },
  ],
  sunset_beach: [
    { icon: "skull", name: "Krab Plażowy", hp: 22, resist: null, loot: { copper: 7 }, rarity: "common", bodyColor: "#c05030", armorColor: "#903820", bodyType: "spider", ability: { type: "charge", damage: 6, cooldown: 4500, element: null, range: 18 } },
    { icon: "pirate", name: "Pirat Rozbitek", hp: 38, resist: "fire", loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#a07050", armorColor: "#604030", bodyType: "humanoid", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 22 } },
    { icon: "water", name: "Meduza Brzegowa", hp: 30, resist: "ice", loot: { copper: 10 }, rarity: "common", bodyColor: "#e0a0c0", armorColor: "#c070a0", bodyType: "floating", ability: { type: "poisonSpit", damage: 7, cooldown: 4000, element: "shadow", range: 20 } },
    { icon: "skull", name: "Żółw Morski", hp: 50, resist: "ice", loot: { copper: 18 }, rarity: "rare", bodyColor: "#507040", armorColor: "#305020", bodyType: "quadruped", ability: { type: "charge", damage: 12, cooldown: 6000, element: null, range: 18 } },
    { icon: "anchor", name: "Duch Zachodniej Laguny", hp: 55, resist: "fire", loot: { silver: 1 }, rarity: "rare", bodyColor: "#d0a060", armorColor: "#a07030", bodyType: "floating", ability: { type: "fireBreath", damage: 10, cooldown: 4500, element: "fire", range: 22 } },
    { icon: "skull", name: "Krab Pustelnik", hp: 32, resist: null, loot: { copper: 11 }, rarity: "common", bodyColor: "#c08050", armorColor: "#905830", bodyType: "spider", ability: { type: "charge", damage: 9, cooldown: 4500, element: null, range: 18 } },
    { icon: "skull", name: "Płaszczka Plażowa", hp: 28, resist: "ice", loot: { copper: 10 }, rarity: "common", bodyColor: "#4070a0", armorColor: "#204870", bodyType: "serpent", ability: { type: "poisonSpit", damage: 8, cooldown: 4000, element: "shadow", range: 20 } },
    { icon: "pirate", name: "Łowca Pereł", hp: 48, resist: null, loot: { copper: 16, silver: 1 }, rarity: "rare", bodyColor: "#8a6a50", armorColor: "#5a4030", bodyType: "humanoid", ability: { type: "charge", damage: 12, cooldown: 5000, element: null, range: 24 } },
  ],
  bamboo_falls: [
    { icon: "skull", name: "Bambusowa Żmija", hp: 28, resist: null, loot: { copper: 9 }, rarity: "common", bodyColor: "#50a040", armorColor: "#308020", bodyType: "serpent", ability: { type: "poisonSpit", damage: 8, cooldown: 4000, element: "shadow", range: 22 } },
    { icon: "recruit", name: "Leśny Strażnik", hp: 42, resist: null, loot: { copper: 15 }, rarity: "uncommon", bodyColor: "#506030", armorColor: "#304018", bodyType: "humanoid", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 25 } },
    { icon: "skull", name: "Małpa Gibbon", hp: 25, resist: null, loot: { copper: 8 }, rarity: "common", bodyColor: "#8a6a30", armorColor: "#604a18", bodyType: "quadruped", ability: { type: "charge", damage: 7, cooldown: 3500, element: null, range: 20 } },
    { icon: "water", name: "Duch Wodospadu", hp: 48, resist: "ice", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#40a0b0", armorColor: "#207080", bodyType: "floating", ability: { type: "iceShot", damage: 9, cooldown: 4000, element: "ice", range: 24 } },
    { icon: "skull", name: "Jaszczurka Szmaragdowa", hp: 35, resist: null, loot: { copper: 12 }, rarity: "uncommon", bodyColor: "#30b060", armorColor: "#208040", bodyType: "serpent", ability: { type: "poisonSpit", damage: 7, cooldown: 4000, element: "shadow", range: 20 } },
  ],
  blue_lagoon: [
    { icon: "skull", name: "Turkusowy Krab", hp: 26, resist: "ice", loot: { copper: 8 }, rarity: "common", bodyColor: "#20a0a0", armorColor: "#107070", bodyType: "spider", ability: { type: "charge", damage: 7, cooldown: 4500, element: null, range: 18 } },
    { icon: "water", name: "Syrena Laguny", hp: 45, resist: "ice", loot: { copper: 18 }, rarity: "rare", bodyColor: "#60b0c0", armorColor: "#308090", bodyType: "floating", ability: { type: "iceShot", damage: 9, cooldown: 4500, element: "ice", range: 24 } },
    { icon: "pirate", name: "Pirat Rozbitek", hp: 38, resist: null, loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#a08060", armorColor: "#604030", bodyType: "humanoid", ability: { type: "charge", damage: 10, cooldown: 5000, element: null, range: 22 } },
    { icon: "skull", name: "Morski Wąż", hp: 32, resist: "ice", loot: { copper: 11 }, rarity: "uncommon", bodyColor: "#30a080", armorColor: "#207060", bodyType: "serpent", ability: { type: "poisonSpit", damage: 7, cooldown: 4000, element: "shadow", range: 20 } },
    { icon: "skull", name: "Jadowita Ryba", hp: 20, resist: "ice", loot: { copper: 6 }, rarity: "common", bodyColor: "#e08040", armorColor: "#b06030", bodyType: "frog", ability: { type: "poisonSpit", damage: 6, cooldown: 3500, element: "shadow", range: 18 } },
    { icon: "skull", name: "Morski Jeż", hp: 24, resist: "ice", loot: { copper: 8 }, rarity: "common", bodyColor: "#302060", armorColor: "#1a1040", bodyType: "spider", ability: { type: "poisonSpit", damage: 5, cooldown: 3000, element: "shadow", range: 16 } },
    { icon: "water", name: "Duch Zatopionego Kapitana", hp: 65, resist: "ice", loot: { silver: 2 }, rarity: "epic", bodyColor: "#3060a0", armorColor: "#204070", bodyType: "floating", ability: { type: "iceShot", damage: 12, cooldown: 4000, element: "ice", range: 28 } },
    { icon: "skull", name: "Elektryczny Węgorz", hp: 38, resist: "ice", loot: { copper: 14 }, rarity: "uncommon", bodyColor: "#40a0c0", armorColor: "#207090", bodyType: "serpent", ability: { type: "shadowBolt", damage: 10, cooldown: 4500, element: "lightning", range: 22 } },
  ],
  olympus: [
    { icon: "swords", name: "Spartański Wojownik", hp: 55, resist: null, loot: { copper: 18 }, rarity: "uncommon", bodyColor: "#c0a070", armorColor: "#8a6030", bodyType: "humanoid", ability: { type: "charge", damage: 14, cooldown: 5000, element: null, range: 26 } },
    { icon: "lightning", name: "Kapłan Zeusa", hp: 65, resist: null, loot: { silver: 1, copper: 10 }, rarity: "rare", bodyColor: "#e0d8c0", armorColor: "#4060b0", bodyType: "humanoid", ability: { type: "shadowBolt", damage: 15, cooldown: 4000, element: "lightning", range: 30 } },
    { icon: "star", name: "Gryfon Olimpijski", hp: 70, resist: null, loot: { silver: 1, copper: 15 }, rarity: "epic", bodyColor: "#c4a040", armorColor: "#8a7020", bodyType: "floating", ability: { type: "charge", damage: 18, cooldown: 5500, element: null, range: 32 } },
    { icon: "skull", name: "Kamienny Gargulec", hp: 50, resist: "fire", loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#808080", armorColor: "#505050", bodyType: "quadruped", ability: { type: "charge", damage: 12, cooldown: 5000, element: null, range: 22 } },
    { icon: "skull", name: "Minotaur", hp: 85, resist: null, loot: { silver: 2 }, rarity: "epic", bodyColor: "#6a4a30", armorColor: "#3a2818", bodyType: "quadruped", ability: { type: "charge", damage: 20, cooldown: 6000, element: null, range: 35 } },
    { icon: "fire", name: "Chimera", hp: 75, resist: "fire", loot: { silver: 1, copper: 20 }, rarity: "rare", bodyColor: "#a06040", armorColor: "#604020", bodyType: "quadruped", ability: { type: "fireBreath", damage: 14, cooldown: 4500, element: "fire", range: 24 } },
  ],
  underworld: [
    { icon: "skull", name: "Szkielet Hoplita", hp: 40, resist: null, loot: { copper: 14 }, rarity: "common", bodyColor: "#d0c8a0", armorColor: "#504030", bodyType: "humanoid", ability: { type: "charge", damage: 10, cooldown: 4500, element: null, range: 22 } },
    { icon: "ghost", name: "Cień Achillesa", hp: 60, resist: "ice", loot: { silver: 1 }, rarity: "rare", bodyColor: "#5050a0", armorColor: "#303070", bodyType: "floating", ability: { type: "shadowBolt", damage: 14, cooldown: 4000, element: "shadow", range: 28 } },
    { icon: "fire", name: "Demoniczny Pies Cerbera", hp: 80, resist: "fire", loot: { silver: 2 }, rarity: "epic", bodyColor: "#3a1a1a", armorColor: "#1a0a0a", bodyType: "quadruped", ability: { type: "fireBreath", damage: 16, cooldown: 5000, element: "fire", range: 24 } },
    { icon: "skull", name: "Empuza", hp: 45, resist: null, loot: { copper: 16 }, rarity: "uncommon", bodyColor: "#8a4060", armorColor: "#502040", bodyType: "humanoid", ability: { type: "poisonSpit", damage: 10, cooldown: 3500, element: "shadow", range: 22 } },
    { icon: "poison", name: "Jadowita Hydra", hp: 90, resist: null, loot: { silver: 2, copper: 10 }, rarity: "legendary", bodyColor: "#306040", armorColor: "#1a3020", bodyType: "serpent", ability: { type: "poisonSpit", damage: 12, cooldown: 3000, element: "shadow", range: 26 } },
    { icon: "skull", name: "Harpia", hp: 35, resist: null, loot: { copper: 12 }, rarity: "common", bodyColor: "#706050", armorColor: "#504038", bodyType: "floating", ability: { type: "charge", damage: 10, cooldown: 4000, element: null, range: 24 } },
  ],
  meteor: [
    { icon: "meteor", name: "Ognisty Strażnik", hp: 80, resist: "fire", loot: { silver: 2 }, rarity: "epic", bodyColor: "#8a4020", armorColor: "#5a2010", bodyType: "floating", ability: { type: "fireBreath", damage: 14, cooldown: 4500, element: "fire", range: 22 } },
    { icon: "skull", name: "Kościany Strażnik", hp: 60, resist: null, loot: { silver: 1, copper: 20 }, rarity: "rare", bodyColor: "#2a2040", armorColor: "#6040a0", bodyType: "humanoid", ability: { type: "shadowBolt", damage: 10, cooldown: 4000, element: "shadow", range: 28 } },
    { icon: "kraken", name: "Morska Bestia", hp: 100, resist: null, loot: { silver: 3 }, rarity: "legendary", bodyColor: "#303060", armorColor: "#202048", bodyType: "serpent", ability: { type: "charge", damage: 20, cooldown: 5000, element: null, range: 35 } },
  ],
};

// Actions the player can perform – each has ammo cost, cooldown (ms), damage, element
// "Strzał" is the only basic skill available from the start (learned: true)
// All other skills appear automatically when the player has ammo for them
// Arsenal POI gives random ammo, unlocking skills temporarily
// skillshot: true = requires aiming (projectile-based), false = click-to-target
export const SPELLS = [
  { id: "lightning",  icon: "sniper", name: "Strzał",          color: "#f0e060", colorLight: "#fffff0", desc: "Przytrzymaj aby strzelać serią! (1 proch/strzał)",        manaCost: 1, cooldown: 120, damage: 5, element: "lightning", learned: true, skillshot: true, rapidFire: true },
  { id: "fireball",  icon: "dynamite", name: "Dynamit",        color: "#ff6020", colorLight: "#ffb060", desc: "Rzut dynamitem w łuku — eksploduje przy trafieniu (celuj!)",     manaCost: 0,  cooldown: 3000, damage: 25, element: "fire", learned: false, skillshot: true, ammoCost: { type: "dynamite", amount: 1 } },
  { id: "icelance",   icon: "harpoon", name: "Harpun",          color: "#40c0ff", colorLight: "#c0f0ff", desc: "Harpun przeszywa pierwszego wroga na wylot (celuj!)",                manaCost: 0,  cooldown: 2500, damage: 18, element: "ice", learned: false, skillshot: true, ammoCost: { type: "harpoon", amount: 1 } },
  { id: "holybeam",   icon: "cannon", name: "Strzał z Armaty",      color: "#d4a030", colorLight: "#fff8d0", desc: "Wolna kula armatnia z obrażeniami obszarowymi (celuj!)",            manaCost: 10, cooldown: 6000, damage: 40, element: "holy", learned: false, skillshot: true, ammoCost: { type: "cannonball", amount: 1 } },
  { id: "summon",     icon: "recruit", name: "Zwerbuj Rewolwerowca", color: "#40e060", colorLight: "#a0ffa0", desc: "Werbuje rewolwerowca (koszt: monety)", manaCost: 0, cooldown: 15000, damage: 0, element: "summon", learned: false },
  // Skills unlocked via ammo from arsenal POI
  { id: "meteor",    icon: "cannon", name: "Salwa Armatnia",  color: "#ff4020", colorLight: "#ff8060", desc: "Trzymaj aby bombardować teren! Kule armatnie zadają 35 obrażeń + obszarowy wybuch (1 kula + 5 prochu/strzał).",  manaCost: 5, cooldown: 0, damage: 35, element: "fire", learned: false, skillshot: false, isSalva: true, ammoCost: { type: "cannonball", amount: 1 } },
  { id: "blizzard",  icon: "bulletRain", name: "Grad Kul",        color: "#80d0ff", colorLight: "#d0f0ff", desc: "Zaznacz obszar — deszcz kul (celuj w ziemię!)",            manaCost: 0, cooldown: 7000, damage: 35, element: "ice", learned: false, aoe: true, skillshot: true, ammoCost: { type: "harpoon", amount: 2 } },
  { id: "drain",     icon: "pirateRaid", name: "Piracki Haracz",  color: "#c02060", colorLight: "#ff80a0", desc: "Okrada wroga i leczy wykonawcę (celuj!)",                manaCost: 0, cooldown: 5000, damage: 28, element: "shadow", learned: false, skillshot: true, ammoCost: { type: "rum", amount: 1 } },
  { id: "chainlightning", icon: "ricochet", name: "Rykoszet",   color: "#e0e040", colorLight: "#ffff80", desc: "Kula odbija się między wrogami (celuj w pierwszego!)",                manaCost: 0, cooldown: 6000, damage: 30, element: "lightning", learned: false, aoe: true, skillshot: true, ammoCost: { type: "chain", amount: 2 } },
  { id: "earthquake", icon: "mine", name: "Mina Wybuchowa",  color: "#8a6030", colorLight: "#c0a060", desc: "Postaw minę — eksploduje gdy wróg nadejdzie (celuj w ziemię!)",           manaCost: 0, cooldown: 7000, damage: 45, element: "holy", learned: false, aoe: true, skillshot: true, ammoCost: { type: "dynamite", amount: 2 } },
  { id: "saber",      icon: "swords", name: "Szabla",           color: "#c0c0c0", colorLight: "#f0f0f0", desc: "Przeciągnij przez wrogów jak w Fruit Ninja!",                          manaCost: 0, cooldown: 300,  damage: 10, element: null, learned: true, skillshot: true, isSaber: true },
  { id: "wand",       icon: "lightning", name: "Różdżka Burzy",  color: "#4080ff", colorLight: "#80c0ff", desc: "Trzymaj aby kule piorunów krążyły wokół kursora! Zbiera 1 proch/s.",  manaCost: 0, cooldown: 0,     damage: 10, element: "lightning", learned: false, skillshot: false, isWand: true, rarity: "legendary" },
];

// Resistance labels for messages
export const RESIST_NAMES = {
  fire: "ogień",
  ice: "lód",
  lightning: "piorun",
  shadow: "cień",
  poison: "trucizna",
  holy: "święty",
};

// Pick a random NPC for a given biome id
export function pickNpc(biomeId) {
  const pool = BIOME_NPCS[biomeId];
  if (!pool || pool.length === 0) return null;
  const npc = pool[Math.floor(Math.random() * pool.length)];
  return { ...npc, biomeId };
}

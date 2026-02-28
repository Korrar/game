export const BOSSES = [
  {
    id: "boar_king",
    name: "Byk El Dorado",
    icon: "bull",
    bodyType: "quadruped",
    hp: 300,
    damage: 15,
    speed: 0.04,
    attackCd: 2000,
    combatStyle: "melee",
    ability: "charge",
    abilityCd: 6000,
    phase2: { hpThreshold: 0.5, speed: 0.06, attackCd: 1500, abilityCd: 4000 },
    minions: { type: "Byk", count: 2, interval: 8000, hp: 40, damage: 6, bodyType: "quadruped", combatStyle: "melee", speed: 0.05, icon: "bull" },
  },
  {
    id: "vampire_lord",
    name: "Baron Czarnego Portu",
    icon: "baron",
    bodyType: "humanoid",
    hp: 500,
    damage: 18,
    speed: 0.03,
    attackCd: 2200,
    combatStyle: "ranged",
    ability: "shadowBolt",
    abilityCd: 5000,
    phase2: { hpThreshold: 0.5, ability: "drain", abilityCd: 4000, attackCd: 1800 },
    minions: { type: "Gangster", count: 3, interval: 7000, hp: 25, damage: 5, bodyType: "humanoid", combatStyle: "melee", speed: 0.06, icon: "swords" },
  },
  {
    id: "volcano_dragon",
    name: "Kraken Ognistych Wód",
    icon: "kraken",
    bodyType: "serpent",
    hp: 800,
    damage: 22,
    speed: 0.025,
    attackCd: 2500,
    combatStyle: "ranged",
    ability: "fireBreath",
    abilityCd: 7000,
    phase2: { hpThreshold: 0.4, abilityCd: 4500, damage: 28 },
    minions: { type: "Macka", count: 2, interval: 10000, hp: 60, damage: 10, bodyType: "serpent", combatStyle: "melee", speed: 0.04, icon: "kraken" },
  },
  {
    id: "lich",
    name: "Duch Kapitana Flinta",
    icon: "ghost",
    bodyType: "floating",
    hp: 1000,
    damage: 25,
    speed: 0.02,
    attackCd: 2800,
    combatStyle: "ranged",
    ability: "iceShot",
    abilityCd: 5000,
    phase2: { hpThreshold: 0.4, manaShield: true, shieldHp: 200, ability: "poisonSpit", abilityCd: 3500 },
    minions: { type: "Szkielet Pirata", count: 3, interval: 8000, hp: 50, damage: 8, bodyType: "humanoid", combatStyle: "melee", speed: 0.04, icon: "skull" },
  },
  {
    id: "cosmic_titan",
    name: "Złoty Cesarz",
    icon: "emperor",
    bodyType: "humanoid",
    hp: 1500,
    damage: 30,
    speed: 0.03,
    attackCd: 2000,
    combatStyle: "melee",
    ability: "charge",
    abilityCd: 6000,
    phase2: { hpThreshold: 0.66, ability: "fireBreath", abilityCd: 5000, combatStyle: "ranged" },
    phase3: { hpThreshold: 0.33, ability: "shadowBolt", abilityCd: 3000, speed: 0.05, attackCd: 1500 },
    minions: { type: "Złoty Strażnik", count: 2, interval: 9000, hp: 80, damage: 12, bodyType: "humanoid", combatStyle: "ranged", speed: 0.03, icon: "star" },
  },
];

export function getBossForRoom(roomNumber) {
  if (roomNumber % 10 !== 0 || roomNumber === 0) return null;
  const idx = Math.floor((roomNumber / 10 - 1) % BOSSES.length);
  const cycle = Math.floor((roomNumber / 10 - 1) / BOSSES.length);
  const boss = { ...BOSSES[idx] };
  if (cycle > 0) {
    const scale = 1 + cycle * 0.5;
    boss.hp = Math.round(boss.hp * scale);
    boss.damage = Math.round(boss.damage * scale);
  }
  return boss;
}

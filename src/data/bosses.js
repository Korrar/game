export const BOSSES = [
  {
    id: "boar_king",
    name: "Król Dzików",
    emoji: "🐗",
    bodyType: "quadruped",
    hp: 300,
    damage: 15,
    speed: 0.04,
    attackCd: 2000,
    combatStyle: "melee",
    ability: "charge",
    abilityCd: 6000,
    phase2: { hpThreshold: 0.5, speed: 0.06, attackCd: 1500, abilityCd: 4000 },
    minions: { type: "Dzik", count: 2, interval: 8000, hp: 40, damage: 6, bodyType: "quadruped", combatStyle: "melee", speed: 0.05, emoji: "🐗" },
  },
  {
    id: "vampire_lord",
    name: "Wampirzy Lord",
    emoji: "🧛",
    bodyType: "humanoid",
    hp: 500,
    damage: 18,
    speed: 0.03,
    attackCd: 2200,
    combatStyle: "ranged",
    ability: "shadowBolt",
    abilityCd: 5000,
    phase2: { hpThreshold: 0.5, ability: "drain", abilityCd: 4000, attackCd: 1800 },
    minions: { type: "Nietoperz", count: 3, interval: 7000, hp: 25, damage: 5, bodyType: "humanoid", combatStyle: "melee", speed: 0.06, emoji: "🦇" },
  },
  {
    id: "volcano_dragon",
    name: "Smok Wulkanu",
    emoji: "🐉",
    bodyType: "serpent",
    hp: 800,
    damage: 22,
    speed: 0.025,
    attackCd: 2500,
    combatStyle: "ranged",
    ability: "fireBreath",
    abilityCd: 7000,
    phase2: { hpThreshold: 0.4, abilityCd: 4500, damage: 28 },
    minions: { type: "Magmowy Żywioł", count: 2, interval: 10000, hp: 60, damage: 10, bodyType: "humanoid", combatStyle: "melee", speed: 0.04, emoji: "🔥" },
  },
  {
    id: "lich",
    name: "Lich Wieczności",
    emoji: "💀",
    bodyType: "floating",
    hp: 1000,
    damage: 25,
    speed: 0.02,
    attackCd: 2800,
    combatStyle: "ranged",
    ability: "iceShot",
    abilityCd: 5000,
    phase2: { hpThreshold: 0.4, manaShield: true, shieldHp: 200, ability: "poisonSpit", abilityCd: 3500 },
    minions: { type: "Szkielet", count: 3, interval: 8000, hp: 50, damage: 8, bodyType: "humanoid", combatStyle: "melee", speed: 0.04, emoji: "💀" },
  },
  {
    id: "cosmic_titan",
    name: "Kosmiczny Tytan",
    emoji: "⭐",
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
    minions: { type: "Gwiezdny Fragment", count: 2, interval: 9000, hp: 80, damage: 12, bodyType: "floating", combatStyle: "ranged", speed: 0.03, emoji: "✨" },
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

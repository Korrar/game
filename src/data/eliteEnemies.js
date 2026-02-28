// Elite enemy modifiers – applied on special defense rooms (5, 15, 25, 35...)

export const ELITE_MODIFIERS = [
  {
    id: "armored",
    name: "Opancerzony",
    desc: "Otrzymuje 30% mniej obrażeń",
    color: "#888",
    icon: "shield",
    hpMult: 3,
    damageTakenMult: 0.70,
  },
  {
    id: "frenzied",
    name: "Szalony",
    desc: "Atakuje 50% szybciej, zadaje +50% obrażeń",
    color: "#cc3030",
    icon: "fire",
    hpMult: 3,
    attackSpeedMult: 0.5,
    damageMult: 1.5,
  },
  {
    id: "dark",
    name: "Mroczny",
    desc: "Odporny na cień, leczy się za 2% HP/s",
    color: "#6040a0",
    icon: "skull",
    hpMult: 3,
    resist: "shadow",
    regenPct: 0.02,
  },
  {
    id: "frozen",
    name: "Mroźny",
    desc: "Odporny na lód, spowalnia pobliskich sojuszników",
    color: "#80d0ff",
    icon: "anchor",
    hpMult: 3,
    resist: "ice",
    slowAura: true,
  },
];

// Check if a room is an elite room (every 10 rooms starting from 5, but not boss rooms)
export function isEliteRoom(roomNumber) {
  if (roomNumber <= 0) return false;
  // Boss rooms are every 10 (10, 20, 30...) — skip those
  if (roomNumber % 10 === 0) return false;
  // Elite rooms: 5, 15, 25, 35...
  return roomNumber % 10 === 5;
}

// Pick a random elite modifier
export function rollEliteModifier() {
  return ELITE_MODIFIERS[Math.floor(Math.random() * ELITE_MODIFIERS.length)];
}

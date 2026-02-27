// Knight upgrade levels for the summon system
// Each level provides a stat multiplier to all mercenary types
export const KNIGHT_LEVELS = [
  { level: 1, emoji: "🛡️", name: "Rekrut",           mult: 1.0,  cost: null,          desc: "Podstawowi najemnicy" },
  { level: 2, emoji: "⚔️",  name: "Weteran",          mult: 1.3,  cost: { silver: 5 },  desc: "+30% HP i obrażeń" },
  { level: 3, emoji: "🗡️", name: "Elita",            mult: 1.6,  cost: { silver: 15 }, desc: "+60% HP i obrażeń" },
  { level: 4, emoji: "⚜️",  name: "Mistrz Gildii",    mult: 2.0,  cost: { gold: 1 },   desc: "+100% HP i obrażeń" },
  { level: 5, emoji: "👑",  name: "Legendarny Dowódca", mult: 2.5, cost: { gold: 3 },   desc: "+150% HP i obrażeń" },
];

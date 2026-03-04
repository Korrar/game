// XP & Level system – perks offered on level up

export const LEVEL_PERKS = [
  { id: "spell_dmg",    name: "Siła Ognia",         desc: "+10% obrażeń akcji",           icon: "fire",       color: "#e05040" },
  { id: "max_mana",     name: "Beczka Prochu",      desc: "+15 maks. prochu",             icon: "gunpowder",  color: "#c0a060" },
  { id: "merc_hp",      name: "Hartowani Żołnierze",desc: "+5 HP najemników",             icon: "shield",     color: "#40a0c0" },
  { id: "cooldown",     name: "Szybkie Ręce",       desc: "-10% cooldown akcji",          icon: "hourglass",  color: "#e0c040" },
  { id: "loot_value",   name: "Piracki Nos",        desc: "+20% wartość łupu",            icon: "coin",       color: "#d4a030" },
  { id: "caravan_armor",name: "Stalowy Kadłub+",     desc: "+1 pancerz statku",            icon: "convoy",     color: "#888" },
  { id: "merc_crit",    name: "Zabójczy Instynkt",  desc: "+10% crit najemników",         icon: "swords",     color: "#cc3030" },
];

// XP required for a given level: level * 50
export function xpForLevel(level) {
  return level * 50;
}

// Roll 3 random perks from the pool (no duplicates in one offer)
export function rollLevelPerks() {
  const shuffled = [...LEVEL_PERKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

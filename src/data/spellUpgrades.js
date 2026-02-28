// Spell upgrade system – offered after boss fights

export const UPGRADE_TYPES = [
  { id: "damage",   name: "Wzmocnienie",   desc: "+25% obrażeń",     icon: "fire",       color: "#e05040" },
  { id: "cooldown", name: "Przyspieszenie",desc: "-20% cooldown",    icon: "hourglass",  color: "#e0c040" },
  { id: "ammo",     name: "Oszczędność",   desc: "-1 koszt amunicji",icon: "gunpowder",  color: "#c0a060" },
  { id: "aoe",      name: "Rozproszenie",  desc: "Efekt obszarowy",  icon: "lightning",   color: "#60c0ff" },
];

// Max 3 upgrades per spell
export const MAX_UPGRADES_PER_SPELL = 3;

// Roll 3 random (spell, upgrade) pairs for the post-boss picker
export function rollUpgradeChoices(learnedSpellIds, spellList, currentUpgrades) {
  const choices = [];
  const tried = new Set();

  for (let attempts = 0; attempts < 30 && choices.length < 3; attempts++) {
    const spellId = learnedSpellIds[Math.floor(Math.random() * learnedSpellIds.length)];
    // Skip summon spell
    const spell = spellList.find(s => s.id === spellId);
    if (!spell || spell.id === "summon") continue;

    const upgradeType = UPGRADE_TYPES[Math.floor(Math.random() * UPGRADE_TYPES.length)];
    const key = `${spellId}:${upgradeType.id}`;
    if (tried.has(key)) continue;
    tried.add(key);

    // Check current upgrade count for this spell
    const spellUpgrades = currentUpgrades[spellId] || [];
    if (spellUpgrades.length >= MAX_UPGRADES_PER_SPELL) continue;

    // AoE upgrade: skip if spell is already AoE or already has aoe upgrade
    if (upgradeType.id === "aoe" && (spell.aoe || spellUpgrades.includes("aoe"))) continue;
    // Ammo upgrade: skip if spell doesn't use ammo, or already has enough reductions
    if (upgradeType.id === "ammo" && !spell.ammoCost) continue;

    choices.push({ spellId, spell, upgrade: upgradeType });
  }

  return choices;
}

// Get upgraded stats for a spell given current upgrades
export function getUpgradedSpellStats(spell, upgrades) {
  const ups = upgrades || [];
  let damageMult = 1;
  let cooldownMult = 1;
  let ammoCostReduction = 0;
  let hasAoeUpgrade = false;

  for (const upId of ups) {
    if (upId === "damage") damageMult += 0.25;
    if (upId === "cooldown") cooldownMult *= 0.80;
    if (upId === "ammo") ammoCostReduction += 1;
    if (upId === "aoe") hasAoeUpgrade = true;
  }

  return {
    damage: Math.round(spell.damage * damageMult),
    cooldown: Math.round(spell.cooldown * cooldownMult),
    ammoCostReduction,
    hasAoeUpgrade,
    damageMult,
    cooldownMult,
  };
}

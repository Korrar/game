// Enemy Mutation system — enemies evolve every 10 rooms
// Enemies the player kills least gain mutations (adaptations)

export const MUTATION_INTERVAL = 10; // every 10 rooms, mutations trigger

export const MUTATIONS = [
  {
    id: "armored_hide",
    name: "Pancerna Skóra",
    icon: "shield",
    desc: "Wróg zyskuje +40% HP",
    color: "#8888aa",
    apply: (npc) => { npc.hp = Math.round(npc.hp * 1.4); npc.mutated = true; npc.mutationName = "Pancerna Skóra"; },
  },
  {
    id: "berserker",
    name: "Berserk",
    icon: "fire",
    desc: "Wróg zadaje +50% obrażeń i atakuje szybciej",
    color: "#cc3030",
    apply: (npc) => { npc._dmgMult = (npc._dmgMult || 1) * 1.5; npc._atkSpeedMult = (npc._atkSpeedMult || 1) * 1.3; npc.mutated = true; npc.mutationName = "Berserk"; },
  },
  {
    id: "regenerator",
    name: "Regeneracja",
    icon: "herb",
    desc: "Wróg regeneruje 2% HP co sekundę",
    color: "#40cc40",
    apply: (npc) => { npc._regenPct = 0.02; npc.mutated = true; npc.mutationName = "Regeneracja"; },
  },
  {
    id: "evasive",
    name: "Unik",
    icon: "pirate",
    desc: "Wróg ma 25% szans na unik",
    color: "#c0a040",
    apply: (npc) => { npc._dodgeChance = 0.25; npc.mutated = true; npc.mutationName = "Unik"; },
  },
  {
    id: "elemental_shift",
    name: "Zmiana Żywiołu",
    icon: "lightning",
    desc: "Wróg zyskuje losową odporność elementalną",
    color: "#8060c0",
    apply: (npc) => {
      const elements = ["fire", "ice", "lightning", "shadow"];
      npc.resist = elements[Math.floor(Math.random() * elements.length)];
      npc.mutated = true;
      npc.mutationName = "Zmiana Żywiołu";
    },
  },
  {
    id: "swarm",
    name: "Rój",
    icon: "skull",
    desc: "Zmutowany wróg pojawia się w parze",
    color: "#cc6040",
    apply: (npc) => { npc._spawnDouble = true; npc.mutated = true; npc.mutationName = "Rój"; },
  },
];

// Pick which enemies mutate based on kill counts
export const selectMutationTargets = (killsByType, biomeEnemies) => {
  // Sort by kills ascending — least killed enemies mutate first
  const sorted = [...biomeEnemies].sort((a, b) => {
    const ka = killsByType[a.name] || 0;
    const kb = killsByType[b.name] || 0;
    return ka - kb;
  });
  // Top 2 least killed enemy types mutate
  return sorted.slice(0, 2).map(npc => npc.name);
};

export const pickMutation = () => {
  return MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
};

// Tools available for purchase at the market
export const SHOP_TOOLS = [
  {
    id: "axe",
    icon: "🪓",
    name: "Siekiera drwala",
    desc: "Pozwala rąbać drewno w leśnych biomach",
    cost: { silver: 3 },
    terrain: "forest",
  },
  {
    id: "pickaxe",
    icon: "⛏️",
    name: "Kilof górnika",
    desc: "Pozwala kopać rudę w kamiennych biomach",
    cost: { silver: 3 },
    terrain: "mine",
  },
  {
    id: "spyglass",
    icon: "🔭",
    name: "Luneta zwiadowcy",
    desc: "Pokaże podgląd następnej komnaty przed wejściem",
    cost: { silver: 5 },
  },
];

// Resources that can be gathered with tools
// terrain: which biome terrain type allows this
// tool: which tool id is required
// chance: probability of resource node spawning in matching biome
export const RESOURCES = {
  forest: [
    { icon: "🪵", name: "Drewno dębowe", desc: "Solidny kawałek twardego drewna", rarity: "common", value: { copper: 6 }, chance: 0.5 },
    { icon: "🪵", name: "Drewno sosnowe", desc: "Lekkie, żywiczne drewno", rarity: "common", value: { copper: 4 }, chance: 0.55 },
    { icon: "🌿", name: "Rzadkie zioła", desc: "Cenione przez alchemików", rarity: "uncommon", value: { copper: 12 }, chance: 0.25 },
    { icon: "🍄", name: "Magiczny grzyb", desc: "Mieni się w ciemności", rarity: "rare", value: { copper: 18 }, chance: 0.12 },
    { icon: "🪵", name: "Drewno elfickie", desc: "Srebrzysty połysk, niezwykle lekkie", rarity: "epic", value: { silver: 1 }, chance: 0.06 },
  ],
  mine: [
    { icon: "🪨", name: "Ruda żelaza", desc: "Ciężki kawałek rudy", rarity: "common", value: { copper: 7 }, chance: 0.5 },
    { icon: "🪨", name: "Ruda miedzi", desc: "Zielonkawy kamień z żyłami metalu", rarity: "common", value: { copper: 5 }, chance: 0.55 },
    { icon: "💎", name: "Surowy kryształ", desc: "Lśni w blasku pochodni", rarity: "uncommon", value: { copper: 15 }, chance: 0.2 },
    { icon: "🪨", name: "Ruda srebra", desc: "Błyszczące żyły w skale", rarity: "rare", value: { copper: 25 }, chance: 0.1 },
    { icon: "💎", name: "Smocza ruda", desc: "Pulsuje wewnętrznym żarem", rarity: "epic", value: { silver: 1, copper: 20 }, chance: 0.05 },
  ],
};

// Mana potions available at the market
export const MANA_POTIONS = [
  { id: "mana_small",  icon: "🧪", name: "Mała Mikstura Many",    desc: "+15 many",  mana: 15,  cost: { copper: 20 } },
  { id: "mana_medium", icon: "🧪", name: "Średnia Mikstura Many", desc: "+40 many",  mana: 40,  cost: { silver: 1 } },
  { id: "mana_large",  icon: "🧪", name: "Duża Mikstura Many",    desc: "+100 many", mana: 100, cost: { silver: 3 } },
];

// Mine times in seconds based on rarity (hold-to-mine mechanic)
export const MINE_TIMES = {
  common: 1.5,
  uncommon: 2.5,
  rare: 4,
  epic: 6,
};

// Pick a random resource for the given terrain
export function pickResource(terrain) {
  const pool = RESOURCES[terrain];
  if (!pool) return null;
  // Weighted by chance
  const totalW = pool.reduce((s, r) => s + r.chance, 0);
  let roll = Math.random() * totalW;
  for (const r of pool) {
    roll -= r.chance;
    if (roll <= 0) return { ...r, id: Date.now() + Math.random() };
  }
  return { ...pool[0], id: Date.now() + Math.random() };
}

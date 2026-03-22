// Tools available for purchase at the market
export const SHOP_TOOLS = [
  {
    id: "axe",
    icon: "axe",
    name: "Siekiera drwala",
    desc: "Pozwala rąbać drewno w leśnych biomach",
    cost: { silver: 3 },
    terrain: "forest",
  },
  {
    id: "pickaxe",
    icon: "pickaxe",
    name: "Kilof górnika",
    desc: "Pozwala kopać rudę w kamiennych biomach",
    cost: { silver: 3 },
    terrain: "mine",
  },
  {
    id: "spyglass",
    icon: "spyglass",
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
    { icon: "wood", name: "Drewno dębowe", desc: "Solidny kawałek twardego drewna", rarity: "common", value: { copper: 6 }, chance: 0.5 },
    { icon: "wood", name: "Drewno sosnowe", desc: "Lekkie, żywiczne drewno", rarity: "common", value: { copper: 4 }, chance: 0.55 },
    { icon: "herb", name: "Rzadkie zioła", desc: "Cenione przez alchemików", rarity: "uncommon", value: { copper: 12 }, chance: 0.25 },
    { icon: "mushroom", name: "Grzyb trujący", desc: "Mieni się w ciemności", rarity: "rare", value: { copper: 18 }, chance: 0.12 },
    { icon: "wood", name: "Drewno mahoniowe", desc: "Ciemny połysk, niezwykle trwałe", rarity: "epic", value: { silver: 1 }, chance: 0.06 },
  ],
  mine: [
    { icon: "rock", name: "Ruda żelaza", desc: "Ciężki kawałek rudy", rarity: "common", value: { copper: 7 }, chance: 0.5 },
    { icon: "rock", name: "Ruda miedzi", desc: "Zielonkawy kamień z żyłami metalu", rarity: "common", value: { copper: 5 }, chance: 0.55 },
    { icon: "gem", name: "Surowy kryształ", desc: "Lśni w blasku pochodni", rarity: "uncommon", value: { copper: 15 }, chance: 0.2 },
    { icon: "rock", name: "Ruda srebra", desc: "Błyszczące żyły w skale", rarity: "rare", value: { copper: 25 }, chance: 0.1 },
    { icon: "gem", name: "Złota żyła", desc: "Pulsuje wewnętrznym blaskiem", rarity: "epic", value: { silver: 1, copper: 20 }, chance: 0.05 },
  ],
};

// Ammo items available at the market — one predefined quantity per type
export const AMMO_ITEMS = [
  { id: "dynamite_pack",    icon: "dynamite",    name: "Paczka Dynamitu",     desc: "+5 dynamitu",        ammoType: "dynamite",    amount: 5,  cost: { copper: 20 } },
  { id: "harpoon_bundle",   icon: "harpoon",     name: "Wiązka Harpunów",     desc: "+5 harpunów",        ammoType: "harpoon",     amount: 5,  cost: { copper: 20 } },
  { id: "cannonball_pouch", icon: "cannon",      name: "Worek Kul Armatnich", desc: "+3 kule armatnie",   ammoType: "cannonball",  amount: 3,  cost: { copper: 30 } },
  { id: "rum_barrel",       icon: "pirateRaid",  name: "Beczka Rumu",         desc: "+3 rumu",            ammoType: "rum",         amount: 3,  cost: { copper: 25 } },
  { id: "chain_coil",       icon: "ricochet",    name: "Zwój Łańcuchów",      desc: "+4 łańcuchy",        ammoType: "chain",       amount: 4,  cost: { copper: 25 } },
];

// Ammo (proch) potions available at the market
export const MANA_POTIONS = [
  { id: "mana_small",  icon: "gunpowder", name: "Mały Zapas Prochu",     desc: "+15 prochu",  mana: 15,  cost: { copper: 20 } },
  { id: "mana_medium", icon: "gunpowder", name: "Średni Zapas Prochu",   desc: "+40 prochu",  mana: 40,  cost: { silver: 1 } },
  { id: "mana_large",  icon: "gunpowder", name: "Duży Zapas Prochu",     desc: "+100 prochu", mana: 100, cost: { silver: 3 } },
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

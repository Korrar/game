export const RELICS = [
  { id: "blood_weapon",    icon: "pirateRaid", name: "Krwawy Sztylet",     desc: "Akcje leczą losowego sojusznika za 15% zadanych obrażeń", rarity: "rare" },
  { id: "ice_core",        icon: "anchor", name: "Kotwica Ochronna",   desc: "25% szans na zablokowanie obrażeń statku", rarity: "rare" },
  { id: "greedy_merchant", icon: "gold", name: "Piracka Chciwość",   desc: "Wartość skarbów x1.5, ale wrogowie mają +30% HP", rarity: "epic" },
  { id: "storm_echo",      icon: "lightning", name: "Rykoszet Srebrny",   desc: "Strzały mają 30% szans na odbicie do drugiego wroga (60% dmg)", rarity: "epic" },
  { id: "stone_skin",      icon: "shield", name: "Skórzany Pancerz",  desc: "Najemnicy otrzymują +30 do maksymalnego HP", rarity: "common" },
  { id: "necromancer",     icon: "skull", name: "Klątwa Daviego Jonesa", desc: "10% szans przy zabiciu wroga na zwerbowanie tymczasowego sojusznika (15s)", rarity: "epic" },
  { id: "fortune_magnet",  icon: "magnet", name: "Pirackie Szczęście", desc: "Szansa na skrzynię wzrasta z 38% do 60%", rarity: "rare" },
  { id: "mana_spring",     icon: "gunpowder", name: "Prochownica",        desc: "+1.5 prochu na sekundę pasywnie", rarity: "rare" },
  { id: "chaos_blade",     icon: "vortex", name: "Szaleństwo Kapitana", desc: "Obrażenia akcji +40%, ale koszt prochu +25%", rarity: "epic" },
  { id: "faith_shield",    icon: "shield", name: "Stalowy Kadłub",    desc: "Statek otrzymuje +3 do pancerza", rarity: "common" },
  { id: "golden_reaper",   icon: "coin", name: "Łowca Nagród",       desc: "Łup z wrogów x2", rarity: "rare" },
  { id: "berserker",       icon: "fire", name: "Desperacki Strzał",  desc: "Najemnicy poniżej 30% HP zadają podwójne obrażenia", rarity: "epic" },
];

export const RELIC_RARITY_COLOR = {
  common: "#888",
  rare: "#40a8b8",
  epic: "#a050e0",
};

// Relic synergies – bonus effects when player owns both relics in a pair
export const RELIC_SYNERGIES = [
  {
    id: "desperacka_krew",
    relics: ["blood_weapon", "berserker"],
    name: "Desperacka Krew",
    desc: "Lifesteal x2 gdy sojusznik poniżej 30% HP",
    color: "#cc3030",
    icon: "pirateRaid",
  },
  {
    id: "burzowy_szal",
    relics: ["chaos_blade", "storm_echo"],
    name: "Burzowy Szał",
    desc: "Szansa na rykoszet wzrasta do 50%",
    color: "#60c0ff",
    icon: "lightning",
  },
  {
    id: "piracki_monopol",
    relics: ["golden_reaper", "greedy_merchant"],
    name: "Piracki Monopol",
    desc: "20% szans na dodatkowy skarb przy zabiciu wroga",
    color: "#d4a030",
    icon: "gold",
  },
  {
    id: "twierdza",
    relics: ["stone_skin", "faith_shield"],
    name: "Twierdza",
    desc: "Najemnicy +30 HP bonus, statek +2 pancerza",
    color: "#888",
    icon: "shield",
  },
  {
    id: "wampiryczny_pakt",
    relics: ["necromancer", "blood_weapon"],
    name: "Wampiryczny Pakt",
    desc: "Przywołani sojusznicy leczą się przy trafieniu",
    color: "#a050e0",
    icon: "skull",
  },
  {
    id: "prochowy_baron",
    relics: ["mana_spring", "chaos_blade"],
    name: "Prochowy Baron",
    desc: "Szaleństwo Kapitana nie zwiększa kosztu prochu",
    color: "#c0a060",
    icon: "gunpowder",
  },
];

// System Morski — żegluga między biomami
// Mini-gra żeglarska z wydarzeniami losowymi na morzu

export const SHIP_UPGRADES = [
  {
    id: "hull_1",
    category: "hull",
    level: 1,
    icon: "shield",
    name: "Wzmocniony Kadłub",
    desc: "Statek wytrzymuje 1 dodatkowe trafienie na morzu",
    cost: { silver: 3 },
    effect: { extraHits: 1 },
  },
  {
    id: "hull_2",
    category: "hull",
    level: 2,
    icon: "shield",
    name: "Dębowy Kadłub",
    desc: "Statek wytrzymuje 2 dodatkowe trafienia, -20% obrażeń",
    cost: { silver: 8 },
    effect: { extraHits: 2, damageTakenMult: 0.80 },
    requires: "hull_1",
  },
  {
    id: "sails_1",
    category: "sails",
    level: 1,
    icon: "feather",
    name: "Płócienne Żagle",
    desc: "+20% szybkość podróży morskiej",
    cost: { silver: 2 },
    effect: { speedMult: 1.20 },
  },
  {
    id: "sails_2",
    category: "sails",
    level: 2,
    icon: "feather",
    name: "Jedwabne Żagle",
    desc: "+40% szybkość, szansa na uniknięcie burz",
    cost: { silver: 6 },
    effect: { speedMult: 1.40, stormDodgeChance: 0.30 },
    requires: "sails_1",
  },
  {
    id: "cannons_1",
    category: "cannons",
    level: 1,
    icon: "cannon",
    name: "Lekkie Działa",
    desc: "Statek może odpierać piratów morskich",
    cost: { silver: 4 },
    effect: { canFight: true, shipDamage: 15 },
  },
  {
    id: "cannons_2",
    category: "cannons",
    level: 2,
    icon: "cannon",
    name: "Ciężkie Działa",
    desc: "Podwójne obrażenia, szansa na zatopienie wrogiego statku",
    cost: { silver: 10 },
    effect: { canFight: true, shipDamage: 30, sinkChance: 0.25 },
    requires: "cannons_1",
  },
  {
    id: "crow_nest",
    category: "special",
    level: 1,
    icon: "spyglass",
    name: "Bocianowe Gniazdo",
    desc: "Podgląd wydarzeń morskich z wyprzedzeniem",
    cost: { silver: 3 },
    effect: { scoutEvents: true },
  },
  {
    id: "cargo_hold",
    category: "special",
    level: 1,
    icon: "treasure",
    name: "Większa Ładownia",
    desc: "+2 miejsca w ekwipunku",
    cost: { silver: 5 },
    effect: { extraSlots: 2 },
  },
];

// Wydarzenia morskie — losują się podczas podróży między biomami
export const SEA_EVENTS = [
  {
    id: "calm_sea",
    name: "Spokojne Morze",
    icon: "water",
    weight: 25,
    themeColor: "#4080c0",
    desc: "Spokojna podróż. Załoga odpoczywa.",
    effect: { type: "heal", value: 15 },
    resultText: "Statek regeneruje +15 HP dzięki spokojnemu rejsowi.",
  },
  {
    id: "storm",
    name: "Sztorm!",
    icon: "lightning",
    weight: 20,
    themeColor: "#404060",
    desc: "Potężna burza szarpie statkiem! Unikaj fal!",
    effect: { type: "damage", value: 25 },
    resultText: "Sztorm uszkadza statek — -25 HP.",
    dodgeable: true, // gracz może klikać żeby unikać
    dodgeReduction: 0.6, // udany unik = 60% mniej obrażeń
  },
  {
    id: "pirate_ship",
    name: "Piracki Korsarz!",
    icon: "pirate",
    weight: 15,
    themeColor: "#cc3030",
    desc: "Wrogi statek atakuje! Odpieraj abordaż!",
    effect: { type: "combat", enemies: 3 },
    requiresCannons: true,
    rewardOnWin: { copper: 60, silver: 1 },
    penaltyOnLoss: { copper: 40 },
    resultText: "Odparłeś piratów!",
  },
  {
    id: "floating_cargo",
    name: "Dryfujący Ładunek",
    icon: "treasure",
    weight: 18,
    themeColor: "#d4a030",
    desc: "Ładunek z zatopionego statku dryfuje na wodzie.",
    effect: { type: "loot" },
    resultText: "Znaleziono skarby wśród wraku!",
  },
  {
    id: "reef",
    name: "Rafa Koralowa!",
    icon: "rock",
    weight: 12,
    themeColor: "#cc8030",
    desc: "Rafa zagraża kadłubowi! Omijaj skały!",
    effect: { type: "damage", value: 15 },
    dodgeable: true,
    dodgeReduction: 0.8,
    resultText: "Statek ociera się o rafę — -15 HP.",
  },
  {
    id: "mysterious_island",
    name: "Tajemnicza Wyspa",
    icon: "compass",
    weight: 10,
    themeColor: "#40a050",
    desc: "Nieznana wyspa na horyzoncie! Zbadać czy ominąć?",
    effect: { type: "choice" },
    choices: [
      { label: "Zbadaj wyspę", desc: "50% szans na skarb, 50% na pułapkę", reward: { gamble: true }, icon: "spyglass" },
      { label: "Omiń wyspę", desc: "Bezpieczna podróż, brak nagrody", reward: null, icon: "compass" },
    ],
    resultText: "Odkryto tajemniczą wyspę!",
  },
  {
    id: "mermaid",
    name: "Syreni Śpiew",
    icon: "water",
    weight: 8,
    themeColor: "#60a0c0",
    desc: "Syreni śpiew niesie się po falach — kusi lub ostrzega.",
    effect: { type: "buff", manaRestore: 40, initiativeBoost: 30 },
    resultText: "Syreni śpiew dodaje mocy — +40 prochu, +30 inicjatywy.",
  },
  {
    id: "sea_monster",
    name: "Morski Potwór!",
    icon: "kraken",
    weight: 5,
    themeColor: "#2a4060",
    desc: "Macki wyłaniają się z głębin! Uciekaj lub walcz!",
    effect: { type: "boss_event" },
    choices: [
      { label: "Walcz z potworem!", desc: "Trudna walka — nagroda: legendarny przedmiot", reward: { legendaryTreasure: true }, risk: { caravanDmg: 40 }, icon: "swords" },
      { label: "Pełna naprzód!", desc: "Uciekasz z drobnym uszkodzeniem", reward: null, penalty: { caravanDmg: 10 }, icon: "feather" },
    ],
    resultText: "Morski potwór atakuje!",
  },
  {
    id: "fishing_spot",
    name: "Ławica Ryb",
    icon: "anchor",
    weight: 14,
    themeColor: "#3090b0",
    desc: "Woda kipi od ryb! Załoga zarzuca sieci.",
    effect: { type: "choice" },
    choices: [
      { label: "Złów ile się da", desc: "Długie łowienie — +60 miedzi, ale tracisz czas (dodatkowe wydarzenie)", reward: { copper: 60, extraEvent: true }, icon: "anchor" },
      { label: "Szybki połów", desc: "Krótkie łowienie — +25 miedzi, bezpiecznie", reward: { copper: 25 }, icon: "feather" },
    ],
    resultText: "Sieci pełne ryb!",
  },
  {
    id: "ghost_fleet",
    name: "Widmowa Flota",
    icon: "ghost",
    weight: 6,
    themeColor: "#4a3070",
    desc: "Duchy okrętów płyną w milczeniu. Kapitan widmo proponuje układ.",
    effect: { type: "choice" },
    choices: [
      { label: "Zaproponuj wymianę", desc: "Oddaj 30 miedzi — duchy dają rzadki skarb i +20 prochu", cost: { copper: 30 }, reward: { treasure: true, mana: 20 }, icon: "ghost" },
      { label: "Oddaj hołd", desc: "Zapal pochodnie — duchy błogosławią: +2 pancerza statku na 3 pokoje", reward: { caravanArmorBuff: 2, duration: 3 }, icon: "fire" },
      { label: "Płyń dalej", desc: "Unikasz duchów — bez zysku, bez ryzyka", reward: null, icon: "compass" },
    ],
    resultText: "Widmowa flota znika we mgle...",
  },
  {
    id: "sea_fog",
    name: "Gęsta Mgła",
    icon: "water",
    weight: 12,
    themeColor: "#708090",
    desc: "Gęsta mgła spowija statek. Nic nie widać na wyciągnięcie ręki.",
    effect: { type: "choice" },
    choices: [
      { label: "Płyń na oślep", desc: "50% szans na nic, 50% na rafę (-20 HP)", reward: { gamble: "fog_navigate" }, icon: "compass" },
      { label: "Rzuć kotwicę i czekaj", desc: "Mgła opada — bezpiecznie, ale tracisz czas", reward: { heal: 5 }, penalty: { extraEvent: true }, icon: "anchor" },
    ],
    resultText: "Mgła pochłania widoczność...",
  },
  {
    id: "trading_galleon",
    name: "Galeon Handlowy",
    icon: "shop",
    weight: 10,
    themeColor: "#d4a030",
    desc: "Wielki galeon handlowy cumuje obok! Kapitan oferuje wymianę.",
    effect: { type: "shop" },
    shopItems: [
      { icon: "dynamite", name: "Beczka Dynamitu", desc: "+5 dynamitu", cost: { copper: 30 }, reward: { dynamite: 5 } },
      { icon: "harpoon", name: "Skrzynia Harpunów", desc: "+5 harpunów", cost: { copper: 25 }, reward: { harpoon: 5 } },
      { icon: "cannon", name: "Kule Armatnie", desc: "+3 kule armatnie", cost: { copper: 35 }, reward: { cannonball: 3 } },
      { icon: "gunpowder", name: "Proch z Dalekiego Wschodu", desc: "Pełny zapas prochu", cost: { silver: 1 }, reward: { fullMana: true } },
    ],
    resultText: "Galeon handlowy cumuje obok!",
  },
  {
    id: "treasure_dive",
    name: "Zatopiony Wrak",
    icon: "gem",
    weight: 8,
    themeColor: "#2a6080",
    desc: "Pod statkiem leży wrak pełen skarbów. Nurkowanie jest ryzykowne.",
    effect: { type: "choice" },
    choices: [
      { label: "Nurkuj osobiście", desc: "Najlepsza nagroda, ale ryzyko: 30% szans na -30 HP", reward: { silver: 3, treasure: true }, risk: { caravanDmg: 30, chance: 0.30 }, icon: "gem" },
      { label: "Wyślij nurka", desc: "Bezpieczniej — gwarantowana nagroda, ale mniejsza", reward: { copper: 40, silver: 1 }, icon: "recruit" },
      { label: "Zostaw wrak", desc: "Nie ryzykujesz — płyniesz dalej", reward: null, icon: "compass" },
    ],
    resultText: "Wrak widnieje pod wodą...",
  },
  {
    id: "whale_encounter",
    name: "Wieloryb!",
    icon: "water",
    weight: 7,
    themeColor: "#1a5080",
    desc: "Ogromny wieloryb wynurza się tuż obok statku!",
    effect: { type: "choice" },
    choices: [
      { label: "Podążaj za wielorybem", desc: "Wieloryb prowadzi do sekretnej wyspy — szansa na legendarny skarb", reward: { discoverIsland: true }, icon: "compass" },
      { label: "Obserwuj z daleka", desc: "Załoga jest zainspirowana — +50 inicjatywy", reward: { initiativeBoost: 50 }, icon: "star" },
    ],
    resultText: "Wieloryb wynurza się z głębin!",
  },
  {
    id: "pirate_ambush",
    name: "Piracka Zasadzka!",
    icon: "pirate",
    weight: 9,
    themeColor: "#8a2020",
    desc: "Dwa pirackie statki wyłaniają się zza skał! To pułapka!",
    effect: { type: "combat", enemies: 5 },
    requiresCannons: true,
    rewardOnWin: { copper: 100, silver: 2, treasure: true },
    penaltyOnLoss: { copper: 60, caravanDmg: 20 },
    resultText: "Piracka zasadzka! Dwa statki atakują!",
  },
  {
    id: "bottle_message",
    name: "Butelka z Wiadomością",
    icon: "scroll",
    weight: 11,
    themeColor: "#c0a060",
    desc: "Butelka z listem dryfuje obok statku. Wiadomość jest zaszyfrowana.",
    effect: { type: "choice" },
    choices: [
      { label: "Odczytaj wiadomość", desc: "Mapa do ukrytego skarbu — +2 srebrne i fragment mapy", reward: { silver: 2, mapFragment: true }, icon: "scroll" },
      { label: "Ignoruj butelkę", desc: "Kto wie, może to pułapka...", reward: null, icon: "compass" },
    ],
    resultText: "Butelka z tajemniczą wiadomością!",
  },
  {
    id: "albatross",
    name: "Albatros",
    icon: "feather",
    weight: 10,
    themeColor: "#e0e8f0",
    desc: "Majestatyczny albatros krąży nad statkiem. Marynarze mówią, że to dobry omen.",
    effect: { type: "buff", luckBoost: true, duration: 3 },
    resultText: "Albatros przynosi szczęście! Lepszy łup przez 3 pokoje.",
  },
  {
    id: "maelstrom",
    name: "Wir Morski!",
    icon: "vortex",
    weight: 4,
    themeColor: "#1a3050",
    desc: "Ogromny wir morski wciąga statek! Musisz działać szybko!",
    effect: { type: "damage", value: 35 },
    dodgeable: true,
    dodgeReduction: 0.7,
    resultText: "Wir morski szarpie statkiem! -35 HP.",
  },
];

// Wyspy do eksploracji — losowane między biomami
export const DISCOVERABLE_ISLANDS = [
  { id: "gold_beach",  icon: "gold",    name: "Złota Plaża",       desc: "Piasek skrzy się złotem", loot: { gold: 1, silver: 3 }, chance: 0.08 },
  { id: "herb_island",  icon: "herb",    name: "Wyspa Ziół",        desc: "Rzadkie rośliny lecznicze", loot: { caravanHeal: 40, mana: 30 }, chance: 0.12 },
  { id: "weapon_cache", icon: "swords",  name: "Ukryty Arsenał",    desc: "Skrytka z bronią i amunicją", loot: { dynamite: 5, harpoon: 5, cannonball: 3 }, chance: 0.10 },
  { id: "ghost_wreck",  icon: "ghost",   name: "Widmowy Wrak",      desc: "Zatopiony statek pełen tajemnic", loot: { treasure: true, knowledge: 20 }, chance: 0.06 },
  { id: "tribal_camp",  icon: "recruit", name: "Obóz Tubylców",     desc: "Przyjaźni tubylcy oferują pomoc", loot: { tempMerc: true, copper: 40 }, chance: 0.10 },
  { id: "rum_island",    icon: "rum",     name: "Wyspa Rumowa",      desc: "Opuszczona destylarnia wśród palm", loot: { rum: 5, copper: 30, mana: 20 }, chance: 0.09 },
  { id: "pearl_lagoon",  icon: "gem",     name: "Perłowa Laguna",    desc: "Dno pełne muszelek i pereł", loot: { silver: 4, treasure: true }, chance: 0.06 },
  { id: "pirate_grave",  icon: "skull",   name: "Cmentarz Piratów",  desc: "Krzyże i kości na pustej plaży", loot: { treasure: true, knowledge: 30 }, chance: 0.07 },
  { id: "volcano_isle",  icon: "fire",    name: "Wyspa Ognia",       desc: "Mała wyspa z gorącymi źródłami", loot: { caravanHeal: 60, dynamite: 3 }, chance: 0.05 },
  { id: "turtle_beach",  icon: "shield",  name: "Żółwia Plaża",      desc: "Żółwie morskie składają tu jaja", loot: { copper: 50, caravanHeal: 25 }, chance: 0.11 },
  { id: "smuggler_cove", icon: "pirate",  name: "Zatoka Przemytników", desc: "Ukryta baza przemytników z towarem", loot: { silver: 2, dynamite: 4, harpoon: 3 }, chance: 0.07 },
  { id: "ancient_lighthouse", icon: "star", name: "Starożytna Latarnia", desc: "Ruiny latarni morskiej ze skarbem strażników", loot: { gold: 1, silver: 2, knowledge: 25 }, chance: 0.04 },
];

export function rollSeaEvent() {
  const totalWeight = SEA_EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const ev of SEA_EVENTS) {
    roll -= ev.weight;
    if (roll <= 0) return { ...ev };
  }
  return { ...SEA_EVENTS[0] };
}

export function rollIslandDiscovery() {
  // Collect all islands that pass their check, then pick one randomly (avoids first-match bias)
  const found = DISCOVERABLE_ISLANDS.filter(() => Math.random() < 0.08); // flat 8% per island
  if (found.length === 0) return null;
  return { ...found[Math.floor(Math.random() * found.length)] };
}

// Ile wydarzeń morskich na jedną podróż (zależy od odległości biomu)
export function getSeaEventCount(fromBiomeIdx, toBiomeIdx) {
  const distance = Math.abs(toBiomeIdx - fromBiomeIdx);
  return Math.max(1, Math.min(3, distance));
}

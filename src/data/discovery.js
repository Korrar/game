// Odkrywanie i Kolekcjonowanie — dziennik podróży, ukryte pokoje, kolekcja artefaktów

// Dziennik podróży — automatycznie zapisuje odkrycia
export const JOURNAL_CATEGORIES = [
  { id: "biomes",     icon: "compass",  name: "Odkryte Biomy",      desc: "Biomy przez które przeszedłeś" },
  { id: "enemies",    icon: "skull",    name: "Pokonani Wrogowie",  desc: "Typy wrogów jakich pokonałeś" },
  { id: "bosses",     icon: "crown",    name: "Pokonani Bossowie",  desc: "Bossowie których zwyciężyłeś" },
  { id: "treasures",  icon: "treasure", name: "Znalezione Skarby",  desc: "Unikalne skarby w kolekcji" },
  { id: "events",     icon: "scroll",   name: "Przeżyte Przygody",  desc: "Specjalne wydarzenia" },
  { id: "secrets",    icon: "eye",      name: "Odkryte Sekrety",    desc: "Ukryte pokoje i tajemnice" },
  { id: "artifacts",  icon: "gem",      name: "Artefakty Starożytnych", desc: "Fragmenty pradawnej historii" },
  { id: "factions",   icon: "pirate",   name: "Relacje Frakcyjne",  desc: "Twoje kontakty z frakcjami" },
];

// Kolekcja Artefaktów — fragmenty historii świata gry
// Kompletne zestawy dają permanentne bonusy
export const ARTIFACT_SETS = [
  {
    id: "pirate_kings",
    name: "Relikty Pirackich Królów",
    icon: "crown",
    color: "#d4a030",
    desc: "Legendarne przedmioty dawnych władców mórz",
    pieces: [
      { id: "pk_crown",   icon: "crown",     name: "Korona Króla Piratów",    desc: "Noszono ją tylko w bitwie", lore: "Pierwszy Król Piratów nosił ją podczas Bitwy o Złoty Przylądek. Mówi się, że daje nieśmiertelność w walce." },
      { id: "pk_sword",   icon: "swords",    name: "Miecz Krwawego Kapitana", desc: "Ostrze wciąż tęskni za bitwą", lore: "Wykuty z meteorytu, który spadł na Wyspę Kości. Krwawy Kapitan zabił nim 100 ludzi w jednej nocy." },
      { id: "pk_compass", icon: "compass",   name: "Kompas Zaginionych Mórz", desc: "Wskazuje nie północ, a pragnienia", lore: "Stworzony przez ślepego nawigatora. Kompas prowadzi do tego, czego serce najbardziej pragnie." },
      { id: "pk_flag",    icon: "pirate",    name: "Flaga Ostatniego Rejsu",  desc: "Szepcze o zapomnianych wyspach", lore: "Flaga Czarnej Perły — ostatni okręt, który widział Koniec Świata i wrócił." },
    ],
    setBonus: { desc: "Komplet: +25% obrażeń, +2 pancerza konwoju, podwójny łup z bossów", effect: { dmgMult: 1.25, caravanArmor: 2, bossLootMult: 2.0 } },
  },
  {
    id: "sea_gods",
    name: "Dary Bóstw Morskich",
    icon: "water",
    color: "#4080c0",
    desc: "Artefakty ofiarowane przez starożytne bóstwa oceanu",
    pieces: [
      { id: "sg_trident", icon: "harpoon",   name: "Ząb Lewiatana",         desc: "Z bestii, która połknęła księżyc", lore: "Wyrwany z paszczy Lewiatana przez pierwszego harpuniarza. Daje władztwo nad falami." },
      { id: "sg_pearl",   icon: "gem",       name: "Perła Głębin",          desc: "Świeci własnym światłem w ciemności", lore: "Rosła przez tysiąc lat w muszli żyjącej na dnie Rowu Mariańskiego." },
      { id: "sg_shell",   icon: "anchor",    name: "Muszla Posejdona",      desc: "Słychać w niej przeszłość i przyszłość", lore: "Posejdon zostawił ją na brzegu jako ostrzeżenie dla śmiertelników." },
      { id: "sg_kelp",    icon: "herb",      name: "Koralowy Amulet",       desc: "Tętni energią głębin", lore: "Wodorosty splecione przez syreny w amulet chroniący przed utopieniem." },
    ],
    setBonus: { desc: "Komplet: +50 max prochu, regeneracja prochu x2, odporność na lód", effect: { maxManaBonus: 50, manaRegenMult: 2.0, iceResist: true } },
  },
  {
    id: "ancient_tech",
    name: "Technologia Starożytnych",
    icon: "lightning",
    color: "#e0e040",
    desc: "Zapomniane wynalazki pradawnej cywilizacji",
    pieces: [
      { id: "at_gear",    icon: "rock",      name: "Zębatka Wieczności",     desc: "Obraca się sama od wieków", lore: "Część maszyny, która poruszała kontynenty. Kto ją obraca, kontroluje czas." },
      { id: "at_lens",    icon: "spyglass",  name: "Soczewka Prawdy",        desc: "Ujawnia to, co ukryte", lore: "Przez tę soczewkę widać prawdziwą naturę rzeczy — i ludzi." },
      { id: "at_core",    icon: "lightning",  name: "Rdzeń Energetyczny",     desc: "Wibruje niesłyszalnym dźwiękiem", lore: "Źródło energii starożytnych latarni morskich. Jedno wystarczyło na tysiąc lat." },
      { id: "at_map",     icon: "scroll",    name: "Hologram Starożytnych",  desc: "Mapa świata sprzed potopu", lore: "Trójwymiarowa projekcja kontynentów sprzed Wielkiego Potopu. Pokazuje wyspy, które zatopił ocean." },
    ],
    setBonus: { desc: "Komplet: pułapki x2 obrażeń, +1 max pułapek, cooldown czarów -15%", effect: { trapDmgMult: 2.0, extraTraps: 1, cooldownMult: 0.85 } },
  },
];

// Ukryte pokoje — specjalne pomieszczenia z zagadkami
export const SECRET_ROOMS = [
  {
    id: "mirror_chamber",
    name: "Komnata Luster",
    icon: "eye",
    themeColor: "#c0a0ff",
    desc: "Ściany z luster odbijają nieskończoność. Jedna droga jest prawdziwa.",
    puzzle: {
      type: "sequence",
      desc: "Dotknij luster w odpowiedniej kolejności (zapamiętaj sekwencję!)",
      difficulty: 3, // ile elementów do zapamiętania
      reward: { artifact: true, copper: 100 },
      failPenalty: { caravanDmg: 15 },
    },
  },
  {
    id: "sunken_library",
    name: "Zatopiona Biblioteka",
    icon: "scroll",
    themeColor: "#4080a0",
    desc: "Półki pełne przemokniętych ksiąg. Kilka wciąż czytelnych.",
    puzzle: {
      type: "riddle",
      desc: "Odpowiedz na zagadkę strażnika wiedzy",
      difficulty: 2,
      reward: { knowledge: 30, artifact: true },
      failPenalty: { manaLoss: 20 },
    },
  },
  {
    id: "golden_vault",
    name: "Złoty Skarbiec",
    icon: "gold",
    themeColor: "#d4a030",
    desc: "Skarby piętrzą się po sufit. Ale strzeże ich mechanizm...",
    puzzle: {
      type: "timing",
      desc: "Kliknij we właściwym momencie, żeby otworzyć zamek!",
      difficulty: 4,
      reward: { gold: 2, silver: 5, treasure: "legendary" },
      failPenalty: { copperLoss: 50 },
    },
  },
  {
    id: "spirit_well",
    name: "Studnia Dusz",
    icon: "vortex",
    themeColor: "#6040a0",
    desc: "Dusza za duszę — ofiaruj coś, by zyskać coś innego.",
    puzzle: {
      type: "trade",
      desc: "Wybierz co ofiarujesz duchom w zamian za moc",
      trades: [
        { offer: "50 HP konwoju",  cost: { caravanHp: 50 },  reward: { permDmgBuff: 0.15 }, rewardDesc: "+15% obrażeń permanentnie" },
        { offer: "30 prochu",      cost: { mana: 30 },       reward: { artifact: true },     rewardDesc: "Fragment artefaktu" },
        { offer: "1 srebrny",      cost: { silver: 1 },      reward: { mercRevive: true },   rewardDesc: "Wskrzeszenie najemnika" },
      ],
    },
  },
];

// Milestony odkryć — permanentne bonusy za ilość odkryć
export const DISCOVERY_MILESTONES = [
  { threshold: 5,   name: "Nowicjusz",          icon: "compass", reward: { copper: 50 }, desc: "5 odkryć — +50 miedzi" },
  { threshold: 15,  name: "Poszukiwacz",         icon: "spyglass", reward: { silver: 2 }, desc: "15 odkryć — +2 srebrne" },
  { threshold: 30,  name: "Odkrywca",            icon: "scroll",  reward: { dmgMult: 1.05 }, desc: "30 odkryć — +5% obrażeń permanentnie" },
  { threshold: 50,  name: "Kartograf",           icon: "compass", reward: { maxManaBonus: 15 }, desc: "50 odkryć — +15 max prochu" },
  { threshold: 75,  name: "Archeolog",           icon: "gem",     reward: { dmgMult: 1.10, caravanArmor: 1 }, desc: "75 odkryć — +10% obrażeń, +1 pancerza" },
  { threshold: 100, name: "Legenda Mórz",        icon: "crown",   reward: { dmgMult: 1.15, caravanArmor: 2, maxManaBonus: 25 }, desc: "100 odkryć — +15% obrażeń, +2 pancerza, +25 prochu" },
];

export function getDiscoveryMilestone(totalDiscoveries) {
  let best = null;
  for (const m of DISCOVERY_MILESTONES) {
    if (totalDiscoveries >= m.threshold) best = m;
  }
  return best;
}

export function rollSecretRoom(roomNum) {
  // 5% szans na ukryty pokój + bonus za numer pokoju
  const chance = 0.05 + Math.min(0.05, roomNum * 0.001);
  if (Math.random() > chance) return null;
  return SECRET_ROOMS[Math.floor(Math.random() * SECRET_ROOMS.length)];
}

export function checkArtifactSetComplete(ownedArtifactIds, setId) {
  const set = ARTIFACT_SETS.find(s => s.id === setId);
  if (!set) return false;
  return set.pieces.every(p => ownedArtifactIds.includes(p.id));
}

export function getCompletedSetBonuses(ownedArtifactIds) {
  const bonuses = [];
  for (const set of ARTIFACT_SETS) {
    if (checkArtifactSetComplete(ownedArtifactIds, set.id)) {
      bonuses.push({ setId: set.id, setName: set.name, ...set.setBonus });
    }
  }
  return bonuses;
}

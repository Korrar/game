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
    setBonus: { desc: "Komplet: +25% obrażeń, +2 pancerza statku, podwójny łup z bossów", effect: { dmgMult: 1.25, caravanArmor: 2, bossLootMult: 2.0 } },
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
  {
    id: "olympian_relics",
    name: "Relikty Olimpu",
    icon: "lightning",
    color: "#80b0ff",
    desc: "Artefakty wykute przez bogów na szczycie Olimpu",
    pieces: [
      { id: "ol_bolt",   icon: "lightning", name: "Piorun Zeusa",         desc: "Trzaska nawet w ciszy", lore: "Wykuty przez cyklopów w głębinach Tartaru. Jeden piorun mógł rozłupać górę na pół." },
      { id: "ol_helm",   icon: "skull",     name: "Hełm Hadesa",          desc: "Czyni nosiciela niewidocznym", lore: "Hades nosił go podczas Titanomachii. Kto go założy, znika z oczu śmiertelników i bogów." },
      { id: "ol_trident", icon: "harpoon",  name: "Trójząb Posejdona",    desc: "Władca mórz i trzęsień", lore: "Jednym uderzeniem tworzył wyspy, drugim je zatapiał. Morze drży na jego widok." },
      { id: "ol_shield", icon: "shield",    name: "Egida Ateny",          desc: "Tarcza z głową Meduzy", lore: "Noszona przez boginię mądrości. Twarz Meduzy zamienia w kamień każdego, kto spojrzy bez pozwolenia." },
    ],
    setBonus: { desc: "Komplet: +30% obrażeń, odporność na pioruny, +3 pancerza statku", effect: { dmgMult: 1.30, lightningResist: true, caravanArmor: 3 } },
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
        { offer: "50 HP statku",  cost: { caravanHp: 50 },  reward: { permDmgBuff: 0.15 }, rewardDesc: "+15% obrażeń permanentnie" },
        { offer: "30 prochu",      cost: { mana: 30 },       reward: { artifact: true },     rewardDesc: "Fragment artefaktu" },
        { offer: "1 srebrny",      cost: { silver: 1 },      reward: { mercRevive: true },   rewardDesc: "Wskrzeszenie najemnika" },
      ],
    },
  },
  {
    id: "olympian_forge",
    name: "Kuźnia Hefajstosa",
    icon: "fire",
    themeColor: "#ff6030",
    desc: "Starożytna kuźnia bogów — kowadło wciąż rozżarzone po tysiącleciach.",
    puzzle: {
      type: "timing",
      desc: "Uderzaj w kowadło w rytm — wykuj boską broń!",
      difficulty: 3,
      reward: { spellDmgBuff: 0.2, duration: 8, artifact: true },
      failPenalty: { caravanDmg: 10 },
    },
  },
  {
    id: "oracle_temple",
    name: "Świątynia Wyroczni",
    icon: "eye",
    themeColor: "#d0a0ff",
    desc: "Dym z kadzideł unosi się spiralą. Pytia czeka na twoją ofiarę.",
    puzzle: {
      type: "trade",
      desc: "Wybierz ofiarę dla wyroczni — im większa, tym lepsza przepowiednia",
      trades: [
        { offer: "20 miedzi",      cost: { copper: 20 },     reward: { initiative: 80 },     rewardDesc: "+80 inicjatywy" },
        { offer: "1 srebrny",      cost: { silver: 1 },      reward: { revealMap: 5 },       rewardDesc: "Mapa 5 kolejnych pokoi" },
        { offer: "1 złoty",        cost: { gold: 1 },        reward: { artifact: true, gold: 2 }, rewardDesc: "Fragment artefaktu + 2 złote" },
      ],
    },
  },
  {
    id: "styx_crossing",
    name: "Przeprawa przez Styks",
    icon: "water",
    themeColor: "#3040a0",
    desc: "Charon czeka w łodzi. Cena przeprawy jest nieoczekiwana.",
    puzzle: {
      type: "trade",
      desc: "Charon żąda zapłaty — ale nie złotem...",
      trades: [
        { offer: "Wspomnienie (30 prochu)",   cost: { mana: 30 },      reward: { shadowDmgBuff: 0.15, duration: 8 }, rewardDesc: "+15% obrażeń cieni na 8 pokoi" },
        { offer: "Krew (25 HP statku)",        cost: { caravanHp: 25 }, reward: { treasure: "legendary" },           rewardDesc: "Legendarny skarb z podziemi" },
        { offer: "Czas (50 inicjatywy)",       cost: { initLoss: 50 },  reward: { tempMercs: 2, duration: 6 },       rewardDesc: "2 widmowych najemników na 6 pokoi" },
      ],
    },
  },
  // ─── NEW SECRET ROOMS ────────────────────────────────────────────
  {
    id: "pirate_treasury",
    name: "Skarbiec Piratów",
    icon: "gold",
    themeColor: "#d4a030",
    desc: "Ogromne drzwi z czaszką strzegą legendarnego skarbca. Potrzeba trzech kluczy.",
    puzzle: {
      type: "multi_key",
      desc: "Znajdź 3 ukryte klucze w pokoju — każdy wymaga innej akcji",
      difficulty: 3,
      keys: [
        { action: "shoot", hint: "Strzel w oko czaszki na drzwiach" },
        { action: "saber", hint: "Przecięcie łańcucha na kolumnie" },
        { action: "click", hint: "Naciśnij ukryty kafel na podłodze" },
      ],
      reward: { gold: 3, silver: 5, copper: 100, treasure: "legendary" },
      failPenalty: { caravanDmg: 20, copperLoss: 30 },
    },
  },
  {
    id: "ghost_captains_cabin",
    name: "Kajuta Widmowego Kapitana",
    icon: "ghost",
    themeColor: "#6080c0",
    desc: "Duch kapitana siedzi przy biurku, pisząc w dzienniku. Oferuje pakt.",
    puzzle: {
      type: "pact",
      desc: "Kapitan oferuje moce w zamian za przysięgę — wybierz mądrze",
      pacts: [
        { name: "Przysięga Krwi", cost: { maxHpReduction: 20 }, reward: { permDmgBuff: 0.20 }, rewardDesc: "-20 max HP karawany, +20% obrażeń permanentnie" },
        { name: "Przysięga Złota", cost: { goldTax: 0.25 }, reward: { doubleChestChance: true }, rewardDesc: "25% złota idzie do ducha, podwójna szansa na skrzynie" },
        { name: "Przysięga Duszy", cost: { mercSacrifice: 1 }, reward: { ghostMerc: true, artifact: true }, rewardDesc: "Traci najemnika, zyskuje widmowego wojownika + artefakt" },
      ],
    },
  },
  {
    id: "ancient_armory",
    name: "Starożytna Zbrojownia",
    icon: "swords",
    themeColor: "#a08040",
    desc: "Rzędy broni z dawnych epok — niektóre wciąż naładowane mocą.",
    puzzle: {
      type: "choose",
      desc: "Wybierz jedną broń — pozostałe rozsypią się w proch",
      choices: [
        { name: "Miecz Płomieni", icon: "fire", reward: { spellDmgBuff: 0.15, element: "fire", duration: 10 }, desc: "+15% obrażeń ognia na 10 pokoi" },
        { name: "Lodowy Berdysz", icon: "ice", reward: { spellDmgBuff: 0.15, element: "ice", duration: 10 }, desc: "+15% obrażeń lodu na 10 pokoi" },
        { name: "Piorunowy Młot", icon: "lightning", reward: { spellDmgBuff: 0.15, element: "lightning", duration: 10 }, desc: "+15% obrażeń piorunów na 10 pokoi" },
        { name: "Cienisty Sztylet", icon: "skull", reward: { spellDmgBuff: 0.15, element: "shadow", duration: 10 }, desc: "+15% obrażeń cieni na 10 pokoi" },
      ],
    },
  },
  {
    id: "mermaids_grotto",
    name: "Grota Syren",
    icon: "water",
    themeColor: "#40c0b0",
    desc: "Śpiew syren niesie się echem. Fontanna pośrodku groty świeci błękitem.",
    puzzle: {
      type: "trade",
      desc: "Syreny oferują dary morza — każdy ma swoją cenę",
      trades: [
        { offer: "Pieśń (40 prochu)", cost: { mana: 40 }, reward: { fullHeal: true, manaRegen: 2.0, duration: 5 }, rewardDesc: "Pełne HP karawany + x2 regeneracja prochu na 5 pokoi" },
        { offer: "Perła (1 złoty)", cost: { gold: 1 }, reward: { artifact: true, silver: 3 }, rewardDesc: "Fragment artefaktu + 3 srebrne" },
        { offer: "Serce (najemnik)", cost: { mercSacrifice: 1 }, reward: { permDmgBuff: 0.10, permMaxMana: 20 }, rewardDesc: "+10% obrażeń + 20 max prochu permanentnie" },
      ],
    },
  },
  {
    id: "time_rift",
    name: "Szczelina Czasu",
    icon: "hourglass",
    themeColor: "#e0a0ff",
    desc: "Powietrze faluje. Przez szczelinę widzisz siebie z przeszłości i przyszłości.",
    puzzle: {
      type: "gamble",
      desc: "Szczelina oferuje skok w czasie — wynik nieprzewidywalny",
      options: [
        { name: "Cofnij czas", chance: 0.5, success: { fullHeal: true, fullMana: true, initiative: 100 }, fail: { caravanDmg: 30, manaLoss: 30 }, successDesc: "Pełne HP, proch i inicjatywa!", failDesc: "Paradoks! -30 HP, -30 prochu" },
        { name: "Przyspiesz czas", chance: 0.5, success: { gold: 2, artifact: true, permDmgBuff: 0.05 }, fail: { copperLoss: 80, enemyBuff: 5 }, successDesc: "+2 Au, artefakt, +5% obrażeń", failDesc: "-80 Cu, wrogowie +50% HP na 5 pokoi" },
        { name: "Zatrzymaj czas", chance: 0.7, success: { timeStop: 3 }, fail: { cooldownDebuff: 1.5, duration: 3 }, successDesc: "Czas zatrzymany na 3 walki (wrogowie zamrożeni na start)", failDesc: "+50% cooldowny na 3 pokoje" },
      ],
    },
  },
  {
    id: "cursed_throne",
    name: "Przeklęty Tron",
    icon: "crown",
    themeColor: "#8030a0",
    desc: "Tron z czarnego obsydianu. Kto usiądzie, zyska moc — lub straci rozum.",
    puzzle: {
      type: "risk",
      desc: "Usiądź na tronie — im większe ryzyko, tym większa nagroda",
      tiers: [
        { name: "Dotknij tron", risk: 0.1, reward: { copper: 50 }, penalty: { manaLoss: 10 }, rewardDesc: "+50 Cu", penaltyDesc: "-10 prochu" },
        { name: "Usiądź na chwilę", risk: 0.3, reward: { silver: 3, permDmgBuff: 0.05 }, penalty: { caravanDmg: 15, copperLoss: 30 }, rewardDesc: "+3 Ag, +5% obrażeń", penaltyDesc: "-15 HP, -30 Cu" },
        { name: "Zasiądź jak król", risk: 0.5, reward: { gold: 2, artifact: true, permDmgBuff: 0.10 }, penalty: { caravanDmg: 40, mercDeath: 1, manaLoss: 50 }, rewardDesc: "+2 Au, artefakt, +10% obrażeń", penaltyDesc: "-40 HP, -1 najemnik, -50 prochu" },
      ],
    },
  },
  {
    id: "smugglers_den",
    name: "Kryjówka Przemytników",
    icon: "pirate",
    themeColor: "#4a6a2a",
    desc: "Tajne przejście prowadzi do podziemnej jaskini pełnej skradzionych towarów.",
    puzzle: {
      type: "trade",
      desc: "Przemytnicy oferują rzadkie towary — ale nie za darmo",
      trades: [
        { offer: "80 miedzi", cost: { copper: 80 }, reward: { ammo: { dynamite: 8, harpoon: 6, cannonball: 4 } }, rewardDesc: "+8 dynamitu, +6 harpunów, +4 kule" },
        { offer: "2 srebrne", cost: { silver: 2 }, reward: { randomRelic: true }, rewardDesc: "Losowy relikt (może być rzadki!)" },
        { offer: "50 miedzi + 1 srebrny", cost: { copper: 50, silver: 1 }, reward: { treasureMap: true }, rewardDesc: "Mapa skarbów — prowadzi do legendarnej nagrody" },
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

export function rollSecretRoom(roomNum, secretRoomMult = 1.0) {
  // 5% szans na ukryty pokój + bonus za numer pokoju, modified by curses/relics
  const chance = (0.05 + Math.min(0.05, roomNum * 0.001)) * secretRoomMult;
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

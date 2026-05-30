// Collectible items dropped by enemies — persist across runs via localStorage.
// Each item belongs to a biome and optionally a set; full sets grant bonuses.
// Rarities (tiers extend RARITY_C from treasures.js): common, uncommon, rare, epic, legendary, mythic, antique.

export const COLLECTIBLE_RARITY_C = {
  common: "#9aa0a8",
  uncommon: "#50b860",
  rare: "#40b8d8",
  epic: "#b070ff",
  legendary: "#ffd450",
  mythic: "#ff4488",
  antique: "#00ffcc",
};

export const COLLECTIBLE_RARITY_L = {
  common: "Pospolity",
  uncommon: "Niepospolity",
  rare: "Rzadki",
  epic: "Epicki",
  legendary: "Legendarny",
  mythic: "Mityczny",
  antique: "Antyczny",
};

// Order for sorting and tier comparison
export const COLLECTIBLE_RARITY_TIER = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5, antique: 6,
};

// First-find rewards (money awarded once when a collectible is discovered)
export const FIRST_FIND_REWARD = {
  common:    { copper: 5 },
  uncommon:  { copper: 15 },
  rare:      { silver: 1, copper: 10 },
  epic:      { silver: 3 },
  legendary: { gold: 1 },
  mythic:    { gold: 2 },
  antique:   { gold: 5 },
};

// Drop chance baseline per NPC rarity (multiplied by biome/elite/boss multipliers in App.jsx)
export const COLLECTIBLE_DROP_BASE = {
  common:    0.012,
  uncommon:  0.025,
  rare:      0.05,
  epic:      0.10,
  elite:     0.15,
  legendary: 0.30,
};

// Pity: after this many rooms without any collectible drop, next enemy guarantees one
export const COLLECTIBLE_PITY_ROOMS = 12;

// Each completed set grants a permanent caravan max-HP bonus
export const SET_HP_BONUS = 5;

// ─── COLLECTIBLE SETS ─────────────────────────────────────────────────
// itemIds in each set must match an entry below
export const COLLECTIBLE_SETS = [
  { id: "set_pirate_fleet",    name: "Piracka Flota",        biome: "island",       reward: { silver: 3 }, desc: "Zaginiona załoga Kapitana Złotopiana." },
  { id: "set_olympus",         name: "Greckie Dziedzictwo",  biome: "olympus",      reward: { silver: 3 }, desc: "Relikwie spod tronu Zeusa." },
  { id: "set_hades",           name: "Podziemia Hadesa",     biome: "underworld",   reward: { silver: 3 }, desc: "Dary zza wrót Styksu." },
  { id: "set_jungle_idol",     name: "Dżungla Bogów",        biome: "jungle",       reward: { silver: 3 }, desc: "Ołtarz starożytnych łowców." },
  { id: "set_desert",          name: "Karawana Pustyni",     biome: "desert",       reward: { silver: 3 }, desc: "Kości rewolwerowców wśród piasków." },
  { id: "set_winter",          name: "Polarna Ekspedycja",   biome: "winter",       reward: { silver: 3 }, desc: "Załoga zaginionego okrętu." },
  { id: "set_mushroom",        name: "Kult Grzybów",         biome: "mushroom",     reward: { silver: 3 }, desc: "Tajemnice sekty przemytników." },
  { id: "set_volcano",         name: "Smocza Forja",         biome: "volcano",      reward: { silver: 3 }, desc: "Skarby ognistego serca wyspy." },
  { id: "set_city",            name: "Łotry Portowe",        biome: "city",         reward: { silver: 3 }, desc: "Pamiątki po nocnych bandach." },
  { id: "set_summer",          name: "Złota Preria",         biome: "summer",       reward: { silver: 3 }, desc: "Skarby Złotej Doliny." },
];

// ─── COLLECTIBLES ─────────────────────────────────────────────────────
// Per-biome pool. Each item:
// { id, name, icon, rarity, biome, desc, lore, setId? }
export const COLLECTIBLES = [
  // ── ISLAND / Piracka Zatoka ──
  { id: "col_skull_capt",   name: "Czaszka Kapitana",     icon: "skull",    rarity: "common",    biome: "island", setId: "set_pirate_fleet", desc: "Wciąż się szczerzy.", lore: "Należała do Skrzypiącego Bena, postrachu Małych Antyli." },
  { id: "col_shell_pearl",  name: "Perłowa Muszla",       icon: "shell",    rarity: "uncommon",  biome: "island", setId: "set_pirate_fleet", desc: "Iryzuje siedmioma kolorami.", lore: "Wyłowiona z głębi Toni Topielców." },
  { id: "col_pirate_anchor", name: "Złota Kotwica Floty", icon: "anchor",   rarity: "rare",      biome: "island", setId: "set_pirate_fleet", desc: "Miniatura kotwicy okrętu flagowego.", lore: "Symbol Floty Czarnobrodego." },
  { id: "col_pirate_spy",   name: "Luneta Korsarza",      icon: "spyglass", rarity: "epic",      biome: "island", setId: "set_pirate_fleet", desc: "Pokazuje brzegi nieistniejących lądów.", lore: "Krew kapitana wciąż plami soczewki." },
  { id: "col_kraken_eye",   name: "Oko Krakena",          icon: "eye",      rarity: "legendary", biome: "island", desc: "Patrzy nawet zamknięte.", lore: "Wyrwane z głębin podczas Burzy Stulecia." },
  { id: "col_atlantis_orb", name: "Sfera Atlantydy",      icon: "gem",      rarity: "mythic",    biome: "island", desc: "Pulsuje rytmem zatopionego miasta.", lore: "Jedyny ocalały artefakt zaginionej cywilizacji." },

  // ── JUNGLE ──
  { id: "col_jungle_feather", name: "Pióro Quetzala",     icon: "feather",  rarity: "common",    biome: "jungle", setId: "set_jungle_idol", desc: "Mieni się szmaragdem.", lore: "Z ptaka, który widział pierwsze świty." },
  { id: "col_jungle_idol",   name: "Małpi Idol",          icon: "skull",    rarity: "uncommon",  biome: "jungle", setId: "set_jungle_idol", desc: "Szczerzy zęby z drewna.", lore: "Plemienna pamiątka po Nocy Płonącej Świątyni." },
  { id: "col_jungle_totem",  name: "Totem Łowcy Głów",    icon: "skull",    rarity: "rare",      biome: "jungle", setId: "set_jungle_idol", desc: "Mruczy klątwy szeptem.", lore: "Każde słowo to dusza pokonanego." },
  { id: "col_jungle_vine",   name: "Liana Życiodajna",    icon: "herb",     rarity: "epic",      biome: "jungle", setId: "set_jungle_idol", desc: "Rośnie sama w słoiku.", lore: "Pochodzi z Drzewa Matki." },
  { id: "col_jaguar_fang",   name: "Kieł Jaguara Cieni",  icon: "swords",   rarity: "legendary", biome: "jungle", desc: "Tnie powietrze samym dotykiem.", lore: "Wyrwany jaguarowi z legendy." },
  { id: "col_jungle_heart",  name: "Serce Dżungli",       icon: "gem",      rarity: "mythic",    biome: "jungle", desc: "Bije, kiedy nikt nie patrzy.", lore: "Esencja milionów oddychających liści." },

  // ── DESERT / Dziki Zachód ──
  { id: "col_desert_skull",  name: "Czaszka Bandyty",     icon: "skull",    rarity: "common",    biome: "desert", setId: "set_desert", desc: "Z dziurą po kuli.", lore: "Ofiara Pojedynku Krwawego Słońca." },
  { id: "col_desert_spur",   name: "Ostroga Rewolwerowca", icon: "swords",   rarity: "uncommon",  biome: "desert", setId: "set_desert", desc: "Wciąż srebrzysta.", lore: "Wisi nad nią nagroda za sześć trupów." },
  { id: "col_desert_badge",  name: "Gwiazda Szeryfa",     icon: "star",     rarity: "rare",      biome: "desert", setId: "set_desert", desc: "Przebita kulą w samym środku.", lore: "Ostatnia odznaka miasta-widmo Redstone." },
  { id: "col_desert_hourglass", name: "Klepsydra Pustyni", icon: "hourglass", rarity: "epic",     biome: "desert", setId: "set_desert", desc: "Sypie nigdy nie kończący się piasek.", lore: "Czas tu przestał płynąć." },
  { id: "col_desert_legend", name: "Złoto Eldorado",      icon: "crown",    rarity: "legendary", biome: "desert", desc: "Bryła w kształcie korony.", lore: "Z żyły, która zatopiła armię konkwistadorów." },
  { id: "col_desert_mythic", name: "Łza Boga Słońca",     icon: "fire",     rarity: "mythic",    biome: "desert", desc: "Pali oczy, jeśli za długo patrzysz.", lore: "Spadła z nieba, gdy umarł ostatni szaman." },

  // ── WINTER ──
  { id: "col_winter_ice",    name: "Lodowy Kryształ",     icon: "ice",      rarity: "common",    biome: "winter", setId: "set_winter", desc: "Nie topnieje.", lore: "Powstał w sercu lodowca Mórz Północnych." },
  { id: "col_winter_compass", name: "Zamarznięty Kompas", icon: "compass",  rarity: "uncommon",  biome: "winter", setId: "set_winter", desc: "Wskazuje północ — i coś więcej.", lore: "Igła reaguje na umarłych." },
  { id: "col_winter_journal", name: "Dziennik Wyprawy",   icon: "scroll",   rarity: "rare",      biome: "winter", setId: "set_winter", desc: "Ostatni wpis: \"oni nadchodzą\".", lore: "Z ekspedycji, która nigdy nie wróciła." },
  { id: "col_winter_pelt",   name: "Skóra Białego Niedźwiedzia", icon: "swords", rarity: "epic", biome: "winter", setId: "set_winter", desc: "Wciąż ciepła w mroźną noc.", lore: "Niedźwiedź miał dwa razy więcej kłów niż powinien." },
  { id: "col_winter_horn",   name: "Róg Wikingów",        icon: "swords",   rarity: "legendary", biome: "winter", desc: "Echo bitwy nadal w nim drży.", lore: "Należał do Olafa Krwawego." },
  { id: "col_winter_mythic", name: "Serce Króla Mrozu",   icon: "gem",      rarity: "mythic",    biome: "winter", desc: "Mroźny lapis lazuli wielkości pięści.", lore: "Pulsuje raz na sto lat." },

  // ── CITY / Portowe Miasto ──
  { id: "col_city_coin",     name: "Fałszywy Dublon",     icon: "coin",     rarity: "common",    biome: "city", setId: "set_city", desc: "Wybijany w piwnicach Portu.", lore: "Stempel oszusta Jakubsona." },
  { id: "col_city_lockpick", name: "Złota Wytrychu",      icon: "ring",     rarity: "uncommon",  biome: "city", setId: "set_city", desc: "Otwiera większość zamków.", lore: "Z arsenału Cienistego Gildii." },
  { id: "col_city_mask",     name: "Maska Bandyty",       icon: "skull",    rarity: "rare",      biome: "city", setId: "set_city", desc: "Pełna ran od pięści.", lore: "Symbol Bractwa Czerwonych Latarni." },
  { id: "col_city_brand",    name: "Pieczęć Burmistrza",  icon: "scroll",   rarity: "epic",      biome: "city", setId: "set_city", desc: "Otwiera niejedne drzwi.", lore: "Skradziona z biura, które już nie istnieje." },
  { id: "col_city_legend",   name: "Klucz do Skarbca",    icon: "treasure", rarity: "legendary", biome: "city", desc: "Pasuje do skarbca, którego nikt nie widział.", lore: "Wykuty ze złota stopionego z koroną." },
  { id: "col_city_mythic",   name: "Cień Złodzieja",      icon: "ghost",    rarity: "mythic",    biome: "city", desc: "Słoik wypełniony nicością.", lore: "Sam Cień Króla Złodziei — uwięziony." },

  // ── VOLCANO ──
  { id: "col_volcano_ember", name: "Iskra Wulkanu",       icon: "fire",     rarity: "common",    biome: "volcano", setId: "set_volcano", desc: "Wciąż gorąca.", lore: "Wyrwana z gardła Ognistej Góry." },
  { id: "col_volcano_crystal", name: "Obsydianowa Kła",   icon: "crystal",  rarity: "uncommon",  biome: "volcano", setId: "set_volcano", desc: "Tnie myśli.", lore: "Wytopiona z lawy magami pradawnymi." },
  { id: "col_volcano_scale", name: "Łuska Smoka",         icon: "gem",      rarity: "rare",      biome: "volcano", setId: "set_volcano", desc: "Zimna jak lód mimo źródła.", lore: "Z grzbietu Ostatniego." },
  { id: "col_volcano_heart", name: "Bijące Serce Lawy",   icon: "fire",     rarity: "epic",      biome: "volcano", setId: "set_volcano", desc: "Pulsuje w klatce ze stali.", lore: "Wydobyte ze studni magmy." },
  { id: "col_volcano_legend", name: "Korona Smoczego Króla", icon: "crown", rarity: "legendary", biome: "volcano", desc: "Topi się powoli.", lore: "Ostatni władca Ognistej Wyspy." },
  { id: "col_volcano_mythic", name: "Jajo Smoka",         icon: "gem",      rarity: "mythic",    biome: "volcano", desc: "Słychać szept od środka.", lore: "Czeka stulecia." },

  // ── OLYMPUS ──
  { id: "col_olympus_laurel", name: "Wieniec Laurowy",    icon: "herb",     rarity: "common",    biome: "olympus", setId: "set_olympus", desc: "Złote liście nigdy nie więdną.", lore: "Z głowy zwycięzcy Igrzysk Czterolecia." },
  { id: "col_olympus_chalice", name: "Kielich Nektaru",   icon: "rum",      rarity: "uncommon",  biome: "olympus", setId: "set_olympus", desc: "Wciąż pełen ambrozji.", lore: "Naczynie biesiad Olimpu." },
  { id: "col_olympus_bolt",  name: "Iskra Zeusa",         icon: "lightning", rarity: "rare",     biome: "olympus", setId: "set_olympus", desc: "Iskrzy, gdy nikt nie patrzy.", lore: "Odprysk pioruna z Olimpu." },
  { id: "col_olympus_statue", name: "Posążek Atheny",     icon: "statue",   rarity: "epic",      biome: "olympus", setId: "set_olympus", desc: "Oczy z chryzolitu.", lore: "Wyrzeźbiona przez Dedala." },
  { id: "col_olympus_legend", name: "Kostka Heraklesa",   icon: "swords",   rarity: "legendary", biome: "olympus", desc: "Z dłoni największego herosa.", lore: "Skamieniała pięść siły." },
  { id: "col_olympus_mythic", name: "Tron Bogów",         icon: "crown",    rarity: "mythic",    biome: "olympus", desc: "Miniaturka trzeszczy elektrycznością.", lore: "Esencja władzy Olimpu." },

  // ── UNDERWORLD / Hades ──
  { id: "col_hades_coin",    name: "Obol Charona",        icon: "coin",     rarity: "common",    biome: "underworld", setId: "set_hades", desc: "Moneta na przeprawę.", lore: "Pieniądz zmarłych." },
  { id: "col_hades_bone",    name: "Kość z Tartaru",      icon: "skull",    rarity: "uncommon",  biome: "underworld", setId: "set_hades", desc: "Mróz wieczny.", lore: "Z legionów Hadesa." },
  { id: "col_hades_chain",   name: "Ogniwo Łańcuchów Styksu", icon: "chain", rarity: "rare",     biome: "underworld", setId: "set_hades", desc: "Wibruje wiecznym jękiem.", lore: "Skute przez samego Hefajstosa." },
  { id: "col_hades_skull",   name: "Hełm Cerbera",        icon: "skull",    rarity: "epic",      biome: "underworld", setId: "set_hades", desc: "Trzy gardła wciąż warczą.", lore: "Strażnik bram Hadesu." },
  { id: "col_hades_legend",  name: "Sceptr Hadesa",       icon: "scepter",  rarity: "legendary", biome: "underworld", desc: "Cień skrada się za nim.", lore: "Symbol władzy nad Podziemiem." },
  { id: "col_hades_mythic",  name: "Hełm Niewidzialności", icon: "skull",   rarity: "mythic",    biome: "underworld", desc: "Zakładający go znika z czasu.", lore: "Dar Cyklopów dla Hadesa." },

  // ── MUSHROOM ──
  { id: "col_mush_spore",    name: "Świecący Zarodnik",   icon: "mushroom", rarity: "common",    biome: "mushroom", setId: "set_mushroom", desc: "Pulsuje fioletem.", lore: "Z jaskiń Kultu Grzybów." },
  { id: "col_mush_amulet",   name: "Amulet Przemytnika",  icon: "magnet",   rarity: "uncommon",  biome: "mushroom", setId: "set_mushroom", desc: "Pachnie ziołem.", lore: "Otwiera tajne komnaty kultu." },
  { id: "col_mush_cap",      name: "Czapka Lordów",       icon: "mushroom", rarity: "rare",      biome: "mushroom", setId: "set_mushroom", desc: "Wciąż żyje.", lore: "Rośnie tylko w cieniu starych kości." },
  { id: "col_mush_book",     name: "Księga Halucynacji",  icon: "scroll",   rarity: "epic",      biome: "mushroom", setId: "set_mushroom", desc: "Strony same się czytają.", lore: "Przepisy mistycznych mikstur." },
  { id: "col_mush_legend",   name: "Korona Króla Grzybów", icon: "crown",   rarity: "legendary", biome: "mushroom", desc: "Mieni się tysiącem barw.", lore: "Sam Pan Spor." },
  { id: "col_mush_mythic",   name: "Pierwszy Zarodnik",   icon: "mushroom", rarity: "mythic",    biome: "mushroom", desc: "Pulsuje w rytm serc świata.", lore: "Z początku wszelkiego życia." },

  // ── SUMMER / Złota Preria ──
  { id: "col_summer_wheat",  name: "Złoty Kłos",          icon: "wheat",    rarity: "common",    biome: "summer", setId: "set_summer", desc: "Wciąż dorodny.", lore: "Z pól, które nigdy nie były obsiewane." },
  { id: "col_summer_flower", name: "Słonecznik Wieczności", icon: "flower", rarity: "uncommon",  biome: "summer", setId: "set_summer", desc: "Zawsze patrzy ku słońcu.", lore: "Z ogrodów Złotej Doliny." },
  { id: "col_summer_bull",   name: "Róg Złotego Byka",    icon: "bull",     rarity: "rare",      biome: "summer", setId: "set_summer", desc: "Drży, gdy zbliża się burza.", lore: "Ze stada króla Midasa." },
  { id: "col_summer_legend", name: "Klejnot Lata",        icon: "gem",      rarity: "legendary", biome: "summer", desc: "Promień słońca uwięziony w bursztynie.", lore: "Z grobu Króla Słońca." },
  { id: "col_summer_mythic", name: "Cień Helios",         icon: "star",     rarity: "mythic",    biome: "summer", desc: "Ciemny okruch, który grzeje.", lore: "Spadł, gdy Faeton zginął." },

  // ── AUTUMN ──
  { id: "col_autumn_leaf",   name: "Liść Wieczności",     icon: "leaf",     rarity: "common",    biome: "autumn", desc: "Nie kruszy się.", lore: "Z drzewa, które płonie a nie spala." },
  { id: "col_autumn_pumpkin", name: "Dynia Lampionowa",   icon: "pumpkin",  rarity: "uncommon",  biome: "autumn", desc: "Świeci o północy.", lore: "Z pól duchów." },
  { id: "col_autumn_rare",   name: "Klucz Drzew",         icon: "ring",     rarity: "rare",      biome: "autumn", desc: "Otwiera kory.", lore: "Druidzki sekret." },
  { id: "col_autumn_mythic", name: "Łza Drzewa Matki",    icon: "water",    rarity: "mythic",    biome: "autumn", desc: "Pachnie pierwszą jesienią.", lore: "Soczysta krew korzeni świata." },

  // ── SPRING ──
  { id: "col_spring_egg",    name: "Pisanka Wiosny",      icon: "treasure", rarity: "common",    biome: "spring", desc: "Lekko ciepła.", lore: "Z gniazda przyszłości." },
  { id: "col_spring_butterfly", name: "Skrzydło Motyla", icon: "butterfly", rarity: "uncommon",  biome: "spring", desc: "Łapie światło jak witraż.", lore: "Z motyla, który żyje sto lat." },
  { id: "col_spring_seed",   name: "Złote Nasienie",      icon: "herb",     rarity: "rare",      biome: "spring", desc: "Wykwita w kieszeni.", lore: "Z ogrodów Pana Wiosny." },
  { id: "col_spring_mythic", name: "Korona Wiosny",       icon: "flower",   rarity: "mythic",    biome: "spring", desc: "Wszystkie kwiaty świata.", lore: "Pierwsza wiosna." },

  // ── SWAMP ──
  { id: "col_swamp_skull",   name: "Czaszka Topielca",    icon: "skull",    rarity: "common",    biome: "swamp", desc: "Pełna mułu.", lore: "Z dna Trzęsawiska." },
  { id: "col_swamp_eye",     name: "Oko Bagiennika",      icon: "eye",      rarity: "uncommon",  biome: "swamp", desc: "Mruga.", lore: "Wciąż widzi ofiary." },
  { id: "col_swamp_rare",    name: "Trujący Bursztyn",    icon: "gem",      rarity: "rare",      biome: "swamp", desc: "Muszka w środku jeszcze macha.", lore: "Z bagien Wieczności." },
  { id: "col_swamp_mythic",  name: "Korzeń Pierwotny",    icon: "herb",     rarity: "mythic",    biome: "swamp", desc: "Bije rytmem ciemnej wody.", lore: "Z dna pierwszego bagna." },

  // ── METEOR ──
  { id: "col_meteor_shard",  name: "Odłamek Meteoru",     icon: "meteor",   rarity: "uncommon",  biome: "meteor", desc: "Zimny mimo wszystko.", lore: "Pył gwiazd." },
  { id: "col_meteor_core",   name: "Rdzeń Krateru",       icon: "crystal",  rarity: "rare",      biome: "meteor", desc: "Pulsuje fioletowo.", lore: "Z serca uderzenia." },
  { id: "col_meteor_mythic", name: "Gwiezdna Esencja",    icon: "star",     rarity: "mythic",    biome: "meteor", desc: "Materia obcego nieba.", lore: "Z dalszej galaktyki." },

  // ── SUNSET BEACH / BAMBOO / LAGOON (smaller pools) ──
  { id: "col_sunset_shell",  name: "Muszla Zachodu",      icon: "shell",    rarity: "common",    biome: "sunset_beach", desc: "Słychać szum morza wieczornego.", lore: "Z plaży, gdzie konie morskie wychodzą o zmierzchu." },
  { id: "col_sunset_legend", name: "Kompas Zaginionej Wyspy", icon: "compass", rarity: "legendary", biome: "sunset_beach", desc: "Wskazuje zachód słońca.", lore: "Pasuje wyłącznie do nieistniejących map." },
  { id: "col_bamboo_flute",  name: "Bambusowy Flet",      icon: "scroll",   rarity: "uncommon",  biome: "bamboo_falls", desc: "Gra, gdy wiatr przechodzi obok.", lore: "Z gaju ośmiu mistrzów." },
  { id: "col_bamboo_legend", name: "Świątynia w Miniaturze", icon: "statue", rarity: "legendary", biome: "bamboo_falls", desc: "Mała, ale doskonale dokładna.", lore: "Wykonana przez mnicha-pustelnika." },
  { id: "col_lagoon_pearl",  name: "Perła Laguny",        icon: "shell",    rarity: "rare",      biome: "blue_lagoon", desc: "Świeci błękitem dna.", lore: "Z ostrygi olbrzymki." },
  { id: "col_lagoon_mythic", name: "Łza Posejdona",       icon: "water",    rarity: "mythic",    biome: "blue_lagoon", desc: "Jedna kropla — cały ocean.", lore: "Spadła, gdy Posejdon zatopił Atlantydę." },

  // ── ANTIQUE — cross-biome, boss-only ──
  { id: "col_antique_chronos", name: "Klepsydra Chronosa", icon: "hourglass", rarity: "antique", biome: null, desc: "Czas zatrzymuje się wokół niej.", lore: "Pierwszy zegar, jaki kiedykolwiek powstał." },
  { id: "col_antique_phoenix", name: "Pióro Feniksa",      icon: "feather",   rarity: "antique", biome: null, desc: "Płonie, ale nie spala.", lore: "Spada raz na tysiąc lat." },
  { id: "col_antique_void",    name: "Fragment Pustki",    icon: "ghost",     rarity: "antique", biome: null, desc: "Patrzy na ciebie nicością.", lore: "Stamtąd, gdzie nie ma niczego." },
];

// Helper: index by id
export const COLLECTIBLE_BY_ID = COLLECTIBLES.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

// Helper: index by biome
export function getCollectiblesForBiome(biomeId) {
  return COLLECTIBLES.filter(c => c.biome === biomeId);
}

// Helper: index by set
export function getCollectiblesInSet(setId) {
  return COLLECTIBLES.filter(c => c.setId === setId);
}

// Helper: roll which tier drops given enemy classification + pity
// Returns tier string or null. Caller picks specific item from pool.
export function rollCollectibleTier(rarityHint, isBoss, isElite, pityForced) {
  let mult = 1;
  if (isBoss) mult = 6;
  else if (isElite) mult = 3;
  else if (rarityHint === "rare") mult = 2.5;
  else if (rarityHint === "uncommon") mult = 1.5;

  // Pity guarantees at least uncommon, with chance to upgrade
  if (pityForced) {
    const r = Math.random();
    if (isBoss && r < 0.20) return "legendary";
    if ((isBoss || isElite) && r < 0.40) return "epic";
    if (r < 0.55) return "rare";
    return "uncommon";
  }

  // Roll from worst to best
  const tiers = [
    { tier: "legendary", chance: COLLECTIBLE_DROP_BASE.legendary * mult },
    { tier: "epic",      chance: COLLECTIBLE_DROP_BASE.epic * mult },
    { tier: "rare",      chance: COLLECTIBLE_DROP_BASE.rare * mult },
    { tier: "uncommon",  chance: COLLECTIBLE_DROP_BASE.uncommon * mult },
    { tier: "common",    chance: COLLECTIBLE_DROP_BASE.common * mult },
  ];
  for (const t of tiers) {
    if (Math.random() < t.chance) return t.tier;
  }
  return null;
}

// Pick a collectible to drop given biome and tier.
// Prefer NOT-yet-collected items (boost their weight).
// `ownedMap` is an object { [id]: { count, ... } }.
export function pickCollectibleDrop(biomeId, tier, ownedMap = {}) {
  let pool = COLLECTIBLES.filter(c => c.rarity === tier && c.biome === biomeId);
  // Fallback: any biome (if biome has none of that tier)
  if (pool.length === 0) {
    pool = COLLECTIBLES.filter(c => c.rarity === tier && c.biome && c.biome !== "meteor");
  }
  if (pool.length === 0) return null;
  // Weight unowned 4x more than owned (still allow duplicates)
  const weighted = [];
  for (const c of pool) {
    const owned = !!ownedMap[c.id];
    const w = owned ? 1 : 4;
    for (let i = 0; i < w; i++) weighted.push(c);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

// Pick antique drop — boss only, very rare
export function pickAntiqueDrop(ownedMap = {}) {
  const pool = COLLECTIBLES.filter(c => c.rarity === "antique");
  if (pool.length === 0) return null;
  const weighted = [];
  for (const c of pool) {
    const owned = !!ownedMap[c.id];
    const w = owned ? 0 : 1;
    for (let i = 0; i < w; i++) weighted.push(c);
  }
  if (weighted.length === 0) return null;
  return weighted[Math.floor(Math.random() * weighted.length)];
}

// Compute completed sets from collectedItems map
export function getCompletedSets(collectedMap) {
  const completed = [];
  for (const set of COLLECTIBLE_SETS) {
    const items = getCollectiblesInSet(set.id);
    if (items.length === 0) continue;
    const allOwned = items.every(it => collectedMap[it.id]);
    if (allOwned) completed.push(set);
  }
  return completed;
}

// Global completion stats
export function getCollectionStats(collectedMap) {
  const total = COLLECTIBLES.length;
  const found = Object.keys(collectedMap).filter(k => collectedMap[k]).length;
  const mythicTotal = COLLECTIBLES.filter(c => c.rarity === "mythic").length;
  const mythicFound = COLLECTIBLES.filter(c => c.rarity === "mythic" && collectedMap[c.id]).length;
  const antiqueTotal = COLLECTIBLES.filter(c => c.rarity === "antique").length;
  const antiqueFound = COLLECTIBLES.filter(c => c.rarity === "antique" && collectedMap[c.id]).length;
  return { total, found, mythicTotal, mythicFound, antiqueTotal, antiqueFound, pct: total ? Math.round(100 * found / total) : 0 };
}

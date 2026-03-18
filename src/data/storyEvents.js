// Dynamiczne Wydarzenia Fabularne — mini-questy i rozgałęziające się decyzje
// Rozciągają się na kilka pokoi i wpływają na dalszą rozgrywkę

export const STORY_ARCS = [
  {
    id: "treasure_map",
    name: "Mapa Skarbów",
    icon: "scroll",
    themeColor: "#d4a030",
    desc: "Znajdź 3 fragmenty starożytnej mapy, by odkryć legendarny skarb",
    totalSteps: 3,
    stepChance: 0.25, // szansa na pojawienie się fragmentu w pokoju
    steps: [
      { desc: "Znaleziono pierwszy fragment mapy!", reward: { copper: 20 }, icon: "scroll" },
      { desc: "Drugi fragment pasuje! Zarys wyspy widoczny.", reward: { copper: 30 }, icon: "scroll" },
      { desc: "Mapa kompletna! Skarb odkryty!", reward: { gold: 3, silver: 5 }, icon: "treasure" },
    ],
  },
  {
    id: "ghost_ship",
    name: "Widmowy Okręt",
    icon: "ghost",
    themeColor: "#6040a0",
    desc: "Duchy piratów szukają odkupienia — pomóż im lub okradnij wrakowiec",
    totalSteps: 3,
    stepChance: 0.20,
    steps: [
      { desc: "Widzisz widmowy statek na horyzoncie...", reward: { copper: 15 }, icon: "ghost" },
      { desc: "Duchy proszą o pomoc — szukają zaginionej kotwicy.", reward: { mana: 30 }, icon: "anchor" },
      {
        desc: "Odnaleziono kotwicę! Wybierz swój los:",
        icon: "ghost",
        choices: [
          { label: "Oddaj kotwicę duchom", desc: "Duchy błogosławią cię — +3 pancerza statku na 5 pokoi", reward: { caravanArmorBuff: 3, duration: 5 }, icon: "shield" },
          { label: "Zatrzymaj kotwicę", desc: "Sprzedajesz ją za dużo złota — ale duchy mszczą się", reward: { gold: 2 }, penalty: { enemyBuff: 5 }, icon: "gold" },
        ],
      },
    ],
  },
  {
    id: "rival_crew",
    name: "Rywalska Załoga",
    icon: "pirate",
    themeColor: "#cc3030",
    desc: "Konkurencyjna załoga piracka tropi twój statek",
    totalSteps: 4,
    stepChance: 0.22,
    steps: [
      { desc: "Ślady obcych butów na szlaku...", reward: { copper: 10 }, icon: "skull" },
      { desc: "Znaleziono porzucony obóz rywali — zostawili zapasy!", reward: { dynamite: 3, harpoon: 2 }, icon: "fire" },
      { desc: "Rywale zastawiają zasadzkę! Dodatkowa fala wrogów!", effect: "ambush_wave", icon: "swords" },
      {
        desc: "Konfrontacja z kapitanem rywali!",
        icon: "pirate",
        choices: [
          { label: "Walcz do końca", desc: "Pokonaj ich kapitana — zdobądź epicki relikt", reward: { epicRelic: true }, effect: "boss_fight", icon: "swords" },
          { label: "Zaproponuj sojusz", desc: "Rywale stają się sojusznikami na 10 pokoi", reward: { allyMercs: 2, duration: 10 }, icon: "recruit" },
          { label: "Przekup ich", desc: "Zapłać 2 złote — rywale odchodzą pokojowo", cost: { gold: 2 }, reward: { peace: true }, icon: "gold" },
        ],
      },
    ],
  },
  {
    id: "cursed_idol",
    name: "Przeklęty Idol",
    icon: "skull",
    themeColor: "#8a3030",
    desc: "Tajemniczy posążek — potężny, ale niebezpieczny",
    totalSteps: 3,
    stepChance: 0.18,
    steps: [
      { desc: "Znajdujesz dziwny posążek — emanuje mocą...", reward: { spellDmgBuff: 0.15, duration: 5 }, icon: "skull" },
      { desc: "Idol szepcze w nocy — statek traci HP, ale zyskujesz moc.", effect: "idol_drain", reward: { spellDmgBuff: 0.25, duration: 5 }, penalty: { caravanDmg: 20 }, icon: "skull" },
      {
        desc: "Idol żąda ofiary!",
        icon: "skull",
        choices: [
          { label: "Zniszcz idol", desc: "Klątwa przełamana — bonus obrażeń znika", reward: { copper: 50 }, effect: "remove_buff", icon: "shield" },
          { label: "Nakarm idol", desc: "Ofiaruj 50 HP statku — idol daje +40% obrażeń do końca gry", cost: { caravanHp: 50 }, reward: { permSpellDmgBuff: 0.40 }, icon: "skull" },
        ],
      },
    ],
  },
  {
    id: "lost_sailor",
    name: "Zagubiony Marynarz",
    icon: "recruit",
    themeColor: "#40a8b8",
    desc: "Rozbitek prosi o pomoc — może okazać się cennym sojusznikiem",
    totalSteps: 2,
    stepChance: 0.30,
    steps: [
      {
        desc: "Rozbitek błaga o ratunek!",
        icon: "recruit",
        choices: [
          { label: "Przyjmij na pokład", desc: "Dołącza do załogi — ale zjada zapasy", reward: { tempCrew: true }, penalty: { copperPerRoom: 5 }, icon: "recruit" },
          { label: "Daj mu łódź", desc: "Odchodzi wdzięczny — dostajesz nagrodę później", reward: { delayedReward: true }, icon: "gold" },
        ],
      },
      { desc: "Rozbitek okazał się byłym kartografem! Odkrywa ukryty pokój ze skarbem.", reward: { silver: 8, treasure: true }, icon: "scroll" },
    ],
  },
  {
    id: "kraken_hunt",
    name: "Polowanie na Krakena",
    icon: "kraken",
    themeColor: "#1a3060",
    desc: "Legendarny kraken terroryzuje szlaki handlowe — ktoś musi go powstrzymać",
    totalSteps: 4,
    stepChance: 0.20,
    steps: [
      { desc: "Rybacy opowiadają o potworze niszczącym statki. Oferują nagrodę za jego głowę.", reward: { copper: 20 }, icon: "anchor" },
      { desc: "Znajdujesz zniszczony statek — ślady macek na kadłubie. Kraken jest blisko.", reward: { harpoon: 3, dynamite: 2 }, icon: "skull" },
      {
        desc: "Widzisz cień pod wodą! Macka uderza w burtę!",
        icon: "kraken",
        choices: [
          { label: "Zaatakuj harpunami", desc: "Ranisz krakena — ucieka, ale zostawia łup", reward: { silver: 3, treasure: true }, icon: "harpoon" },
          { label: "Rzuć dynamit", desc: "Eksplozja ogłusza potwora — lepszy łup, ale statek oberwie", reward: { silver: 5 }, penalty: { caravanDmg: 25 }, icon: "dynamite" },
        ],
      },
      { desc: "Kraken pokonany! Rybacy świętują — jesteś legendą morza!", reward: { gold: 2, silver: 5, epicRelic: true }, icon: "star" },
    ],
  },
  {
    id: "sunken_city",
    name: "Zatopione Miasto",
    icon: "gem",
    themeColor: "#2a6080",
    desc: "Legenda mówi o mieście zatopionym przez bogów — pełnym złota i klątw",
    totalSteps: 3,
    stepChance: 0.22,
    steps: [
      { desc: "Stara mapa wskazuje ruiny pod wodą. Bąbelki powietrza wznoszą się z głębin.", reward: { copper: 15, knowledge: 10 }, icon: "scroll" },
      {
        desc: "Nurkowie odkrywają wejście do zatopionej świątyni!",
        icon: "gem",
        choices: [
          { label: "Wyślij ekspedycję", desc: "Kosztowne, ale bezpieczne — gwarantowany skarb", cost: { silver: 2 }, reward: { gold: 1, treasure: true, silver: 3 }, icon: "recruit" },
          { label: "Nurkuj sam", desc: "Ryzykowne, ale darmowe — może być pułapka", reward: { gamble: "sunken_temple" }, icon: "gem" },
        ],
      },
      { desc: "Wydobyto relikwię Zatopionego Miasta! Starożytna moc przepływa przez statek.", reward: { gold: 3, permSpellDmgBuff: 0.15, caravanArmorBuff: 2, duration: 10 }, icon: "star" },
    ],
  },
  {
    id: "sea_witch",
    name: "Morska Wiedźma",
    icon: "skull",
    themeColor: "#6a30a0",
    desc: "Wiedźma z morskiej groty oferuje potężne zaklęcia — za odpowiednią cenę",
    totalSteps: 3,
    stepChance: 0.25,
    steps: [
      { desc: "Słyszysz dziwny śpiew z morskiej groty. Zielone światło migocze w ciemności.", reward: { mana: 20 }, icon: "skull" },
      {
        desc: "Wiedźma proponuje wymianę — moc za cenę krwi.",
        icon: "skull",
        choices: [
          { label: "Przyjmij ofertę", desc: "Oddaj 40 HP statku — zyskaj potężne wzmocnienie na 8 pokoi", cost: { caravanHp: 40 }, reward: { spellDmgBuff: 0.30, mercDmgBuff: 0.20, duration: 8 }, icon: "skull" },
          { label: "Odmów", desc: "Wiedźma jest obrażona, ale daje mały dar na pocieszenie", reward: { mana: 15, copper: 10 }, icon: "shield" },
        ],
      },
      { desc: "Wiedźma zdradza sekret: 'Pod trzecią wyspą leży skarb bogów morza.'", reward: { gold: 2, silver: 4, treasure: true }, icon: "star" },
    ],
  },
  {
    id: "olympus_trial",
    name: "Próba Olimpu",
    icon: "lightning",
    themeColor: "#4080ff",
    desc: "Bogowie Olimpu wystawiają cię na próbę — czy jesteś godny ich darów?",
    totalSteps: 3,
    stepChance: 0.22,
    steps: [
      { desc: "Kamienna tablica z wyrytym wyzwaniem: 'Udowodnij swoją odwagę!'", reward: { copper: 25 }, icon: "rock" },
      { desc: "Piorun uderza tuż obok — to znak Zeusa! Moc przenika twoje oręż.", reward: { mana: 40, dynamite: 2 }, icon: "lightning" },
      {
        desc: "Stanąłeś przed Bramą Olimpu. Bóg wojny czeka.",
        icon: "swords",
        choices: [
          { label: "Walcz z Aresem", desc: "70% szans na boską broń (+20% dmg na 10 pokoi). 30%: -30 HP statku", reward: { gamble: "ares_fight" }, icon: "swords" },
          { label: "Złóż ofiarę", desc: "Oddaj 3 srebrne — bogowie błogosławią podwójnym łupem na 5 pokoi", cost: { silver: 3 }, reward: { lootBuff: 2.0, duration: 5 }, icon: "gem" },
          { label: "Pokłoń się i odejdź", desc: "Pokorna droga — +50 miedzi i szacunek bogów", reward: { copper: 50, initiative: 40 }, icon: "shield" },
        ],
      },
    ],
  },
  {
    id: "underworld_descent",
    name: "Zejście do Hadesu",
    icon: "skull",
    themeColor: "#6a2080",
    desc: "Brama do podziemnego królestwa otwiera się — czy odważysz się zejść?",
    totalSteps: 3,
    stepChance: 0.20,
    steps: [
      { desc: "Znaleziono obol — monetę na przeprawę przez Styks.", reward: { copper: 15, mana: 15 }, icon: "coin" },
      { desc: "Charon przeprowadza cię przez rzekę. Cienie szepcą tajemnice...", reward: { initiative: 60, copper: 20 }, icon: "water" },
      {
        desc: "Stanąłeś przed tronem Hadesa. Bóg umarłych daje ci wybór.",
        icon: "skull",
        choices: [
          { label: "Poproś o moc", desc: "Hades daje moc cieni — +25% obrażeń shadow na zawsze, ale -20 max HP statku", reward: { shadowDmgBuff: 0.25, permanent: true }, penalty: { maxHpLoss: 20 }, icon: "skull" },
          { label: "Poproś o skarby", desc: "Skarby podziemi — 5 złota i legendarny artefakt", reward: { gold: 5, treasure: true }, icon: "treasure" },
          { label: "Poproś o wiedzę", desc: "Hades ujawnia lokalizacje sekretnych pokoi na 10 pokoi", reward: { secretRoomBuff: true, duration: 10, copper: 30 }, icon: "eye" },
        ],
      },
    ],
  },
  {
    id: "phoenix_egg",
    name: "Jajo Feniksa",
    icon: "fire",
    themeColor: "#ff6030",
    desc: "Legenda mówi o jaju feniksa ukrytym na szczycie wulkanu",
    totalSteps: 3,
    stepChance: 0.18,
    steps: [
      { desc: "Pióro feniksa lśni ognistym blaskiem — wskazuje drogę!", reward: { copper: 20 }, icon: "feather" },
      { desc: "Wulkaniczne tunele prowadzą do gniazda — lawa płynie obok!", reward: { dynamite: 3, mana: 25 }, icon: "fire" },
      { desc: "Jajo feniksa! Ciepłe jak słońce, pulsuje wewnętrzną mocą.", reward: { gold: 3, silver: 3, mana: 50 }, icon: "star" },
    ],
  },
];

// Decyzje moralne — natychmiastowe rozgałęzienia w randomowych pokojach
export const MORAL_DILEMMAS = [
  {
    id: "merchant_robbery",
    name: "Kupiec w Potrzebie",
    icon: "shop",
    themeColor: "#d4a030",
    question: "Spotykasz obrabowanego kupca. Jego towary leżą rozrzucone.",
    choices: [
      { label: "Pomóż kupcowi", desc: "Kupiec oferuje zniżkę 50% w sklepie na 3 pokoje", reward: { shopDiscount: 0.50, duration: 3 }, icon: "shield" },
      { label: "Okradnij kupca", desc: "Zdobywasz 80 miedzi, ale przyszli kupcy mają wyższe ceny", reward: { copper: 80 }, penalty: { shopPriceMult: 1.30, duration: 10 }, icon: "gold" },
    ],
  },
  {
    id: "prisoner_ship",
    name: "Statek Niewolników",
    icon: "anchor",
    themeColor: "#40e060",
    question: "Napotykasz statek wiozący więźniów do kopalni.",
    choices: [
      { label: "Uwolnij więźniów", desc: "2 wdzięcznych więźniów dołącza jako tymczasowi najemnicy", reward: { tempMercs: 2, duration: 5 }, icon: "recruit" },
      { label: "Przejmij ładunek", desc: "Zdobywasz cenną rudę wartą 3 srebrne", reward: { silver: 3 }, penalty: { loyaltyLoss: 15 }, icon: "rock" },
      { label: "Miej się na baczności", desc: "Mijasz statek — brak ryzyka", reward: null, icon: "compass" },
    ],
  },
  {
    id: "sinking_ship",
    name: "Tonący Statek",
    icon: "anchor",
    themeColor: "#40c0ff",
    question: "Widzisz tonący galeon — wewnątrz mogą być skarby lub pułapka.",
    choices: [
      { label: "Nurkuj po skarb", desc: "50% szans na legendarne skarby, 50% na pułapkę", reward: { gamble: "legendary_or_trap" }, icon: "gem" },
      { label: "Wyślij łódź zwiadowczą", desc: "Bezpieczniej — gwarantowany rzadki skarb", reward: { guaranteedRare: true }, icon: "spyglass" },
    ],
  },
  {
    id: "stranded_crew",
    name: "Rozbitkowie na Rafie",
    icon: "recruit",
    themeColor: "#30a0a0",
    question: "Grupa marynarzy z rozbitego statku błaga o ratunek z rafy koralowej.",
    choices: [
      { label: "Uratuj wszystkich", desc: "Ryzykujesz kadłub (-15 HP), ale zyskujesz 2 tymczasowych najemników", reward: { tempMercs: 2, duration: 6 }, penalty: { caravanDmg: 15 }, icon: "recruit" },
      { label: "Zabierz jednego", desc: "Bezpieczna opcja — 1 najemnik i informacja o skarbie", reward: { tempMercs: 1, duration: 4, copper: 30 }, icon: "compass" },
      { label: "Rzuć im linę", desc: "Zostawiasz im zapasy — dostajesz błogosławieństwo (+20 inicjatywy)", reward: { initiativeBoost: 20, copper: 10 }, icon: "shield" },
    ],
  },
  {
    id: "pirate_duel",
    name: "Pojedynek Kapitanów",
    icon: "swords",
    themeColor: "#cc3030",
    question: "Piracki kapitan wyzwa cię na pojedynek. Stawka: statek przegrywającego.",
    choices: [
      { label: "Przyjmij wyzwanie", desc: "60% szans na wygraną: +100 Cu + epicki skarb. 40%: -50 Cu", reward: { gamble: "captain_duel" }, icon: "swords" },
      { label: "Zaproponuj zakład", desc: "Pokerowa gra — 80 miedzi na stół, wygrana podwaja", cost: { copper: 80 }, reward: { gamble: "poker_bet" }, icon: "gold" },
      { label: "Odmów z honorem", desc: "Pirat szanuje odwagę — mały upominek na drogę", reward: { copper: 20, mana: 10 }, icon: "shield" },
    ],
  },
  {
    id: "cursed_treasure",
    name: "Przeklęty Skarb",
    icon: "treasure",
    themeColor: "#8a3060",
    question: "Skrzynia pełna złota leży na plaży, otoczona kośćmi. Klątwa czy legenda?",
    choices: [
      { label: "Otwórz skrzynię", desc: "50%: 3 złote i epicki skarb. 50%: klątwa — wrogowie +40% HP na 5 pokoi", reward: { gamble: "cursed_gold" }, icon: "treasure" },
      { label: "Zniszcz skrzynię", desc: "Uwolnij dusze — zyskaj błogosławieństwo: +15% obrażeń na 5 pokoi", reward: { spellDmgBuff: 0.15, duration: 5 }, icon: "fire" },
      { label: "Zostaw skrzynię", desc: "Lepiej nie ryzykować — brak nagrody, brak ryzyka", reward: null, icon: "compass" },
    ],
  },
  {
    id: "sea_race",
    name: "Wyścig Morski",
    icon: "feather",
    themeColor: "#2080c0",
    question: "Szybki szkuner wyzwa cię na wyścig dookoła wyspy! Stawka jest wysoka.",
    choices: [
      { label: "Przyjmij wyścig", desc: "Wygrana: 5 srebrnych + szacunek portów. Przegrana: -30 miedzi", reward: { gamble: "sea_race" }, icon: "feather" },
      { label: "Zaproponuj sojusz", desc: "Zamiast ścigać się — razem polujesz na piratów (+1 srebrny)", reward: { silver: 1, tempMercs: 1, duration: 3 }, icon: "recruit" },
    ],
  },
  {
    id: "medusa_gaze",
    name: "Spojrzenie Meduzy",
    icon: "eye",
    themeColor: "#50a050",
    question: "Kamienny posąg wojownika blokuje drogę. Obok leży lusterko i miecz.",
    choices: [
      { label: "Użyj lusterka", desc: "Odbijesz wzrok Meduzy — kamień pęka, skarb za nim!", reward: { silver: 2, copper: 40 }, icon: "gem" },
      { label: "Zniszcz posąg mieczem", desc: "Wywalczysz drogę siłą, ale stracisz czas (-30 inicjatywy)", reward: { copper: 60 }, penalty: { initLoss: 30 }, icon: "swords" },
    ],
  },
  {
    id: "sirens_call",
    name: "Pieśń Syren",
    icon: "water",
    themeColor: "#6080c0",
    question: "Melodyjny śpiew dobiega z oddali. Twoi najemnicy zaczynają iść jak w transie.",
    choices: [
      { label: "Zatkaj uszy woskiem", desc: "Bezpieczne przejście — zachowujesz załogę i zyskujesz pewność siebie", reward: { mana: 30, initiative: 30 }, icon: "shield" },
      { label: "Słuchaj pieśni", desc: "Syreny ujawniają tajemnice morza — mapa do skarbu! Ale 1 najemnik odchodzi", reward: { gold: 2, treasure: true }, penalty: { mercLoss: 1 }, icon: "gem" },
      { label: "Zaatakuj syreny", desc: "Syreny bronią się magią — ale ich perły są warte fortunę", reward: { gamble: "siren_fight" }, icon: "swords" },
    ],
  },
  {
    id: "labyrinth_entrance",
    name: "Wejście do Labiryntu",
    icon: "rock",
    themeColor: "#8a6030",
    question: "Kamienna brama z wyrytym bykiem prowadzi w dół. Nici Ariadny leżą u wejścia.",
    choices: [
      { label: "Wejdź z nicią", desc: "Bezpieczna eksploracja — gwarantowany epicki skarb", reward: { guaranteedEpic: true }, icon: "scroll" },
      { label: "Wejdź bez nici", desc: "Ryzykowne ale zyskowne — 60%: legendarny skarb, 40%: pułapka i -25 HP", reward: { gamble: "labyrinth" }, icon: "skull" },
    ],
  },
];

export function rollStoryStep(activeStory, roomNum) {
  if (!activeStory) return null;
  const arc = STORY_ARCS.find(a => a.id === activeStory.id);
  if (!arc) return null;
  const currentStep = activeStory.currentStep || 0;
  if (currentStep >= arc.totalSteps) return null;
  if (Math.random() > arc.stepChance) return null;
  return { ...arc.steps[currentStep], arcId: arc.id, stepIndex: currentStep };
}

export function rollNewStoryArc(completedArcs) {
  const available = STORY_ARCS.filter(a => !completedArcs.includes(a.id));
  if (available.length === 0) return null;
  // 20% chance to start a new story arc per room
  if (Math.random() > 0.20) return null;
  const picked = available[Math.floor(Math.random() * available.length)];
  return { id: picked.id, currentStep: 0 };
}

export function rollMoralDilemma() {
  if (Math.random() > 0.12) return null; // 12% chance per room
  return MORAL_DILEMMAS[Math.floor(Math.random() * MORAL_DILEMMAS.length)];
}

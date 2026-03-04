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

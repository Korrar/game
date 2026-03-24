// System Poszukiwania Skarbów — wielobiomowe mapy skarbów prowadzące do legendarnych nagród
// Gracz znajduje mapę → odwiedza wymagane biomy → wykonuje zadania → zdobywa finalną nagrodę

// ─── TREASURE HUNT DEFINITIONS ────────────────────────────────────

export const TREASURE_HUNTS = [
  {
    id: "blackbeards_hoard",
    name: "Skarb Czarnobrodego",
    icon: "pirate",
    desc: "Legendarna mapa prowadzi do ukrytego skarbu najsłynniejszego pirata w historii.",
    themeColor: "#d4a030",
    difficulty: "hard",
    steps: [
      {
        biome: "island",
        task: "Znajdź kamienną tablicę na wyspie i odczytaj wskazówkę",
        taskType: "interact", // interact | kill_elite | find_secret | survive
        hint: "Szukaj starożytnej tablicy między palmami",
        reward: { copper: 30 },
        rewardDesc: "+30 Cu za odczytanie tablicy",
      },
      {
        biome: "desert",
        task: "Pokonaj strażnika pustyni — elitarnego skorpiona pilnującego następnej wskazówki",
        taskType: "kill_elite",
        hint: "Elitarny wróg pojawi się w fali",
        reward: { silver: 1, ammo: { dynamite: 3 } },
        rewardDesc: "+1 Ag, +3 dynamitu",
      },
      {
        biome: "volcano",
        task: "Przetrwaj 3 fale bez utraty więcej niż 20 HP karawany",
        taskType: "survive",
        surviveCondition: { maxCaravanDmg: 20, waves: 3 },
        hint: "Wulkan testuje twoją obronę",
        reward: { silver: 2 },
        rewardDesc: "+2 Ag za przetrwanie",
      },
    ],
    finalReward: {
      gold: 5,
      silver: 10,
      copper: 200,
      treasure: "legendary",
      artifact: "pk_sword", // Specific artifact piece
      desc: "Skarb Czarnobrodego: 5 Au, 10 Ag, 200 Cu, legendarny skarb + Miecz Krwawego Kapitana",
    },
  },
  {
    id: "poseidons_trident",
    name: "Trójząb Posejdona",
    icon: "harpoon",
    desc: "Fragmenty mapy morskiej wskazują lokalizację legendarnego trójzęba.",
    themeColor: "#4080c0",
    difficulty: "hard",
    steps: [
      {
        biome: "blue_lagoon",
        task: "Znajdź ukrytą grotę pod wodospadem — przeszukaj interaktywne obiekty",
        taskType: "interact",
        hint: "Szukaj perłowej muszli blisko wody",
        reward: { copper: 40, mana: 20 },
        rewardDesc: "+40 Cu, +20 prochu",
      },
      {
        biome: "swamp",
        task: "Odszukaj zatopiony ołtarz w bagnie — odkryj ukryty pokój",
        taskType: "find_secret",
        hint: "Bagno skrywa stare świątynie",
        reward: { silver: 2 },
        rewardDesc: "+2 Ag",
      },
      {
        biome: "olympus",
        task: "Złóż ofiarę Posejdonowi — pokonaj bossa bez używania pułapek",
        taskType: "kill_elite",
        hint: "Pokaż swoją siłę bogom",
        reward: { gold: 1, artifact: true },
        rewardDesc: "+1 Au + fragment artefaktu",
      },
    ],
    finalReward: {
      gold: 4,
      silver: 8,
      relic: "poseidon_trident", // Unique relic
      artifact: "sg_trident",
      desc: "Trójząb Posejdona: 4 Au, 8 Ag + Ząb Lewiatana (artefakt) + unikalne wzmocnienie harpunów",
    },
  },
  {
    id: "ghost_fleet",
    name: "Flota Widm",
    icon: "ghost",
    desc: "Mapa do zatopionej floty — mówi się, że duchy strzegą niewyobrażalnych bogactw.",
    themeColor: "#6080c0",
    difficulty: "medium",
    steps: [
      {
        biome: "sunset_beach",
        task: "Znajdź wrak na plaży i odczytaj dziennik kapitana",
        taskType: "interact",
        hint: "Wrak leży na plaży o zachodzie słońca",
        reward: { copper: 25 },
        rewardDesc: "+25 Cu",
      },
      {
        biome: "underworld",
        task: "Porozmawiaj z duchem kapitana w podziemiach",
        taskType: "find_secret",
        hint: "Duchy wiedzą, gdzie leży flota",
        reward: { silver: 1, tempMercs: 1, mercDuration: 5 },
        rewardDesc: "+1 Ag + widmowy najemnik na 5 pokoi",
      },
    ],
    finalReward: {
      gold: 3,
      silver: 6,
      copper: 150,
      treasure: "epic",
      desc: "Skarb Floty Widm: 3 Au, 6 Ag, 150 Cu + epicki skarb",
    },
  },
  {
    id: "olympian_arsenal",
    name: "Arsenał Olimpijski",
    icon: "lightning",
    desc: "Wykuta broń bogów — rozrzucona po świecie po upadku Olimpu.",
    themeColor: "#e0e040",
    difficulty: "legendary",
    steps: [
      {
        biome: "olympus",
        task: "Znajdź Kuźnię Hefajstosa i zdobądź kowadło",
        taskType: "find_secret",
        hint: "Starożytna kuźnia ukryta jest głęboko na Olimpie",
        reward: { silver: 2, permDmgBuff: 0.05 },
        rewardDesc: "+2 Ag, +5% obrażeń permanentnie",
      },
      {
        biome: "volcano",
        task: "Zanurz kowadło w magmie — przetrwaj erupcję (4 fale)",
        taskType: "survive",
        surviveCondition: { maxCaravanDmg: 30, waves: 4 },
        hint: "Magma ożywi kowadło, ale erupcja będzie gwałtowna",
        reward: { gold: 1 },
        rewardDesc: "+1 Au",
      },
      {
        biome: "underworld",
        task: "Zdobądź Wodę Styksu od Charona",
        taskType: "interact",
        hint: "Charon weźmie złoto za wodę",
        reward: { silver: 3 },
        rewardDesc: "+3 Ag",
      },
      {
        biome: "meteor",
        task: "Użyj kosmicznej energii do aktywacji broni — pokonaj elitę meteorytu",
        taskType: "kill_elite",
        hint: "Kosmiczna energia zakończy kucie",
        reward: { gold: 1, artifact: true },
        rewardDesc: "+1 Au + fragment artefaktu",
      },
    ],
    finalReward: {
      gold: 8,
      silver: 15,
      artifact: "ol_bolt", // Piorun Zeusa
      permDmgBuff: 0.15,
      permMaxMana: 30,
      desc: "Arsenał Olimpijski: 8 Au, 15 Ag + Piorun Zeusa + 15% obrażeń + 30 max prochu",
    },
  },
  {
    id: "sirens_pearl",
    name: "Perła Syren",
    icon: "gem",
    desc: "Legendarna perła ukryta w najgłębszej grocie oceanu.",
    themeColor: "#40c0b0",
    difficulty: "medium",
    steps: [
      {
        biome: "bamboo_falls",
        task: "Znajdź staw koi — medytuj aby usłyszeć pieśń syren",
        taskType: "interact",
        hint: "Koi pływające w stawie znają drogę",
        reward: { copper: 30, mana: 30 },
        rewardDesc: "+30 Cu, +30 prochu",
      },
      {
        biome: "blue_lagoon",
        task: "Nurkuj w lagunie — przetrwaj podwodne wyzwanie",
        taskType: "survive",
        surviveCondition: { maxCaravanDmg: 15, waves: 2 },
        hint: "Laguna skrywa głębiny pełne stworzeń",
        reward: { silver: 2 },
        rewardDesc: "+2 Ag",
      },
    ],
    finalReward: {
      gold: 2,
      silver: 5,
      copper: 100,
      artifact: "sg_pearl",
      desc: "Perła Syren: 2 Au, 5 Ag, 100 Cu + Perła Głębin (artefakt)",
    },
  },
  {
    id: "ancient_machine",
    name: "Maszyna Starożytnych",
    icon: "rock",
    desc: "Części pradawnej machiny rozrzucone po świecie — złożenie ich daje niezwykłą moc.",
    themeColor: "#e0e040",
    difficulty: "hard",
    steps: [
      {
        biome: "city",
        task: "Kup schemat od kontrabandystów na czarnym rynku",
        taskType: "interact",
        hint: "Handlarze w porcie mają dziwne plany",
        reward: { copper: 20 },
        rewardDesc: "+20 Cu",
      },
      {
        biome: "mushroom",
        task: "Zbierz fluorescencyjne zarodniki jako źródło energii",
        taskType: "interact",
        hint: "Grzyby świecą odpowiednim kolorem",
        reward: { silver: 1, mana: 40 },
        rewardDesc: "+1 Ag, +40 prochu",
      },
      {
        biome: "meteor",
        task: "Zdobądź kosmiczny rdzeń z krateru — pokonaj strażnika",
        taskType: "kill_elite",
        hint: "Zmutowany strażnik broni rdzenia",
        reward: { gold: 1, silver: 2 },
        rewardDesc: "+1 Au, +2 Ag",
      },
    ],
    finalReward: {
      gold: 4,
      silver: 8,
      artifact: "at_core",
      permCooldownMult: 0.90, // -10% cooldowns
      desc: "Maszyna Starożytnych: 4 Au, 8 Ag + Rdzeń Energetyczny + -10% cooldowny permanentnie",
    },
  },
];

// ─── HUNT STATE MANAGEMENT ────────────────────────────────────────

/**
 * Roll whether the player finds a treasure map (triggered from events, secret rooms, chests)
 * @param {number} roomNum - Current room number
 * @param {string[]} activeHuntIds - IDs of hunts already in progress
 * @param {string[]} completedHuntIds - IDs of hunts already completed
 * @returns {object|null} A treasure hunt to start, or null
 */
export function rollTreasureMap(roomNum, activeHuntIds = [], completedHuntIds = []) {
  // 8% base chance, increases with room number
  const chance = 0.08 + Math.min(0.07, roomNum * 0.002);
  if (Math.random() > chance) return null;

  const available = TREASURE_HUNTS.filter(
    h => !activeHuntIds.includes(h.id) && !completedHuntIds.includes(h.id)
  );
  if (available.length === 0) return null;

  // Weight by difficulty (easier hunts appear first)
  const weights = { medium: 40, hard: 30, legendary: 15 };
  const totalW = available.reduce((s, h) => s + (weights[h.difficulty] || 20), 0);
  let roll = Math.random() * totalW;
  for (const hunt of available) {
    roll -= weights[hunt.difficulty] || 20;
    if (roll <= 0) return hunt;
  }
  return available[0];
}

/**
 * Check if a hunt step can be completed in the current biome
 * @param {object} hunt - Active treasure hunt
 * @param {number} currentStep - Current step index (0-based)
 * @param {string} currentBiome - Current biome id
 * @returns {object|null} The step to complete, or null if wrong biome
 */
export function getActiveHuntStep(hunt, currentStep, currentBiome) {
  if (currentStep >= hunt.steps.length) return null;
  const step = hunt.steps[currentStep];
  if (step.biome !== currentBiome) return null;
  return step;
}

/**
 * Get description of what biome the player needs to visit next
 * @param {object} hunt - Active treasure hunt
 * @param {number} currentStep - Current step index
 * @returns {string} Description for the UI
 */
export function getNextHuntDestination(hunt, currentStep) {
  if (currentStep >= hunt.steps.length) return "Skarb czeka na odbiór!";
  const step = hunt.steps[currentStep];
  return `Następny krok: ${step.task} (biom: ${step.biome})`;
}

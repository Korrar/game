// Biome Interactive Terrain Elements — clickable/shootable objects unique to each biome
// Spawned per room, can be activated once for a reward or effect

const MAX_PER_ROOM = 3;

export const BIOME_INTERACTABLES = {
  jungle: [
    {
      id: "jungle_vine", name: "Gęste Pnącza", icon: "vine",
      desc: "Przecięcie sablem odsłania ukryty skarb",
      action: "saber", chance: 0.35,
      reward: { type: "loot", copper: 8, silverChance: 0.15 },
    },
    {
      id: "jungle_idol", name: "Starożytny Idol", icon: "totem",
      desc: "Strzel w idol, by uwolnić ducha — tymczasowy buff do obrażeń",
      action: "shoot", chance: 0.20,
      reward: { type: "buff", buffType: "damage", value: 1.15, duration: 30000 },
    },
    {
      id: "jungle_beehive", name: "Gniazdo Os", icon: "bug",
      desc: "Strzel aby pszczoły zaatakowały pobliskich wrogów",
      action: "shoot", chance: 0.25,
      reward: { type: "aoe_damage", damage: 12, radius: 20, element: "poison" },
    },
    {
      id: "jungle_dam", name: "Kamienna Zapora", icon: "rock",
      desc: "Kliknij aby usunąć zaporę — fala wody zmywa wrogów i odsłania strumyk",
      action: "click", chance: 0.20,
      reward: { type: "dam_break", damage: 15, radius: 22, element: null },
    },
  ],
  island: [
    {
      id: "island_barrel", name: "Pływająca Beczka", icon: "barrel",
      desc: "Strzel w beczkę — losowe zasoby lub eksplozja",
      action: "shoot", chance: 0.40,
      reward: { type: "random_loot", options: [
        { copper: 15 }, { ammo: "dynamite", amount: 2 }, { ammo: "harpoon", amount: 2 }, { explode: true, damage: 15 },
      ]},
    },
    {
      id: "island_bottle", name: "Butelka z Mapą", icon: "scroll",
      desc: "Kliknij aby odczytać mapę — ujawnia bonus w następnym pokoju",
      action: "click", chance: 0.20,
      reward: { type: "reveal_next", bonusCopper: 20 },
    },
    {
      id: "island_crab_nest", name: "Gniazdo Krabów", icon: "crab",
      desc: "Podejdź blisko — kraby bronią skarbu. Warto ryzykować?",
      action: "proximity", chance: 0.25,
      reward: { type: "risk_loot", loot: { copper: 25 }, damage: 5 },
    },
  ],
  desert: [
    {
      id: "desert_cactus_fruit", name: "Owoc Kaktusa", icon: "fruit",
      desc: "Kliknij aby zebrać — regeneruje 3 HP karawany",
      action: "click", chance: 0.30,
      reward: { type: "heal", amount: 3 },
    },
    {
      id: "desert_quicksand", name: "Ruchome Piaski", icon: "spiral",
      desc: "Strzel w ruchome piaski — wciągają pobliskich wrogów",
      action: "shoot", chance: 0.20,
      reward: { type: "trap_zone", slowMult: 0.3, duration: 8000, radius: 15 },
    },
    {
      id: "desert_fossil", name: "Skamieniałość", icon: "bone",
      desc: "Wytnij sablem — rzadki kryształ wart dużo miedziakow",
      action: "saber", chance: 0.15,
      reward: { type: "loot", copper: 20, silverChance: 0.30 },
    },
  ],
  winter: [
    {
      id: "winter_ice_crystal", name: "Kryształ Mrozu", icon: "diamond",
      desc: "Strzel aby eksplodował lodem — zamraża wrogów w okolicy na 3s",
      action: "shoot", chance: 0.30,
      reward: { type: "freeze_aoe", duration: 3000, radius: 18 },
    },
    {
      id: "winter_snow_pile", name: "Zaspa Śnieżna", icon: "snow",
      desc: "Kliknij aby odkopać — ukryty ekwipunek lub puste",
      action: "click", chance: 0.35,
      reward: { type: "random_loot", options: [
        { copper: 12 }, { ammo: "cannonball", amount: 1 }, { nothing: true }, { copper: 8 },
      ]},
    },
    {
      id: "winter_frozen_fish", name: "Zamarznięta Ryba", icon: "fish",
      desc: "Przecięcie sablem daje jedzenie — regeneruje HP",
      action: "saber", chance: 0.25,
      reward: { type: "heal", amount: 2 },
    },
    {
      id: "winter_hot_spring", name: "Zamarznięte Źródło", icon: "water",
      desc: "Przecięcie lodu sablem odsłania gorące źródło — leczy i spowalnia wrogów",
      action: "saber", chance: 0.18,
      reward: { type: "hot_spring", heal: 4, slowMult: 0.4, duration: 12000, radius: 18 },
    },
  ],
  city: [
    {
      id: "city_lockbox", name: "Zamknięta Skrzynia", icon: "lock",
      desc: "Kliknij aby otworzyć (trzeba mieć wytrych) — rzadki łup",
      action: "click", chance: 0.25,
      reward: { type: "locked_loot", requireTool: "lockpick", loot: { silver: 1 }, failLoot: { copper: 3 } },
    },
    {
      id: "city_lamp", name: "Latarnia Gazowa", icon: "lantern",
      desc: "Strzel w latarnię — eksplozja gazu pali pobliskich wrogów",
      action: "shoot", chance: 0.30,
      reward: { type: "aoe_damage", damage: 18, radius: 14, element: "fire" },
    },
    {
      id: "city_wanted_poster", name: "List Gończy", icon: "scroll",
      desc: "Kliknij aby przyjąć zlecenie — bonus za zabicie elity w pokoju",
      action: "click", chance: 0.20,
      reward: { type: "bounty", bonusCopper: 30 },
    },
  ],
  volcano: [
    {
      id: "volcano_obsidian", name: "Żyła Obsydianu", icon: "gem",
      desc: "Wytnij sablem — wzmocnienie broni na 2 pokoje (+15% obrażeń)",
      action: "saber", chance: 0.20,
      reward: { type: "buff", buffType: "damage", value: 1.15, duration: -2 }, // -2 = 2 rooms
    },
    {
      id: "volcano_steam_vent", name: "Otwór Parowy", icon: "cloud",
      desc: "Strzel aby uwolnić parę — oślepia wrogów na 5s",
      action: "shoot", chance: 0.30,
      reward: { type: "blind_aoe", duration: 5000, radius: 20 },
    },
    {
      id: "volcano_fire_fruit", name: "Ognisty Owoc", icon: "fire",
      desc: "Kliknij — tymczasowe pociski ognia (+ognisty DoT przez 20s)",
      action: "click", chance: 0.15,
      reward: { type: "buff", buffType: "fire_ammo", value: 5, duration: 20000 },
    },
  ],
  summer: [
    {
      id: "summer_haystack", name: "Stóg Siana", icon: "wheat",
      desc: "Przecięcie sablem — czasem ukrywa skarb, czasem mysz",
      action: "saber", chance: 0.35,
      reward: { type: "random_loot", options: [
        { copper: 10 }, { copper: 15 }, { nothing: true }, { ammo: "dynamite", amount: 1 },
      ]},
    },
    {
      id: "summer_well", name: "Stara Studnia", icon: "water",
      desc: "Kliknij aby zaczerpnąć wody — regeneruje 2 HP",
      action: "click", chance: 0.30,
      reward: { type: "heal", amount: 2 },
    },
    {
      id: "summer_scarecrow", name: "Strach na Wróble", icon: "ghost",
      desc: "Strzel — straszy wrogów, odpychając ich na 4s",
      action: "shoot", chance: 0.20,
      reward: { type: "fear_aoe", duration: 4000, radius: 22 },
    },
  ],
  autumn: [
    {
      id: "autumn_mushroom", name: "Dziki Grzyb", icon: "mushroom",
      desc: "Kliknij aby zebrać — losowy efekt: leczy lub truje",
      action: "click", chance: 0.35,
      reward: { type: "random_effect", options: [
        { heal: 4 }, { heal: 2 }, { damage: 3 }, { buff: "speed", duration: 15000 },
      ]},
    },
    {
      id: "autumn_trap", name: "Potrzask Łowcy", icon: "trap",
      desc: "Strzel aby aktywować — chwyta następnego wroga który wejdzie",
      action: "shoot", chance: 0.25,
      reward: { type: "trap_zone", holdDuration: 5000, radius: 8 },
    },
    {
      id: "autumn_hollow_log", name: "Puste Kłoda", icon: "log",
      desc: "Wytnij sablem — schowane zasoby albo zaskoczenie",
      action: "saber", chance: 0.25,
      reward: { type: "random_loot", options: [
        { copper: 12 }, { ammo: "harpoon", amount: 2 }, { nothing: true }, { copper: 18 },
      ]},
    },
  ],
  spring: [
    {
      id: "spring_flower", name: "Leczniczy Kwiat", icon: "flower",
      desc: "Kliknij aby zebrać — regeneruje 3 HP i daje tymczasową odporność",
      action: "click", chance: 0.30,
      reward: { type: "heal_and_buff", heal: 3, buffType: "resist", duration: 15000 },
    },
    {
      id: "spring_fairy_ring", name: "Pierścień Wróżek", icon: "sparkle",
      desc: "Wejdź w pierścień — losowy bonus lub klątwa",
      action: "proximity", chance: 0.20,
      reward: { type: "random_effect", options: [
        { heal: 5 }, { buff: "damage", duration: 20000 }, { damage: 4 }, { copper: 20 },
      ]},
    },
    {
      id: "spring_bird_nest", name: "Ptasie Gniazdo", icon: "feather",
      desc: "Kliknij delikatnie — złote jajko warte sporo miedzi",
      action: "click", chance: 0.15,
      reward: { type: "loot", copper: 22, silverChance: 0.20 },
    },
    {
      id: "spring_sapling", name: "Sadzonka Dębu", icon: "herb",
      desc: "Kliknij aby zasadzić — drzewo wyrasta i daje ochronę karawanie",
      action: "click", chance: 0.22,
      reward: { type: "grow_tree", heal: 3, buffType: "resist", duration: 25000 },
    },
  ],
  mushroom: [
    {
      id: "mushroom_glowing", name: "Świecący Grzyb", icon: "glow",
      desc: "Kliknij — eksploduje sporami, truje wrogów w okolicy",
      action: "click", chance: 0.35,
      reward: { type: "aoe_damage", damage: 8, radius: 16, element: "poison" },
    },
    {
      id: "mushroom_crystal_node", name: "Kryształowa Żyła", icon: "gem",
      desc: "Wytnij sablem — cenne kryształy",
      action: "saber", chance: 0.25,
      reward: { type: "loot", copper: 15, silverChance: 0.25 },
    },
    {
      id: "mushroom_web_sac", name: "Kokon Pajęczy", icon: "web",
      desc: "Strzel aby uwolnić — pająk atakuje wrogów przez 10s",
      action: "shoot", chance: 0.20,
      reward: { type: "summon_ally", allyType: "spider", duration: 10000, damage: 6 },
    },
  ],
  swamp: [
    {
      id: "swamp_herb", name: "Bagienne Zioło", icon: "herb",
      desc: "Kliknij aby zebrać — potężna mikstura lecznicza",
      action: "click", chance: 0.25,
      reward: { type: "heal", amount: 5 },
    },
    {
      id: "swamp_gas_bubble", name: "Bąbel Gazu", icon: "bubble",
      desc: "Strzel — eksplozja gazu paraliżuje wrogów na 3s",
      action: "shoot", chance: 0.30,
      reward: { type: "stun_aoe", duration: 3000, radius: 14 },
    },
    {
      id: "swamp_totem", name: "Totem Wiedźmy", icon: "skull",
      desc: "Wytnij sablem — przeklina wrogów (tracą 10% HP)",
      action: "saber", chance: 0.20,
      reward: { type: "curse_enemies", hpLossPct: 0.10 },
    },
    {
      id: "swamp_campfire", name: "Suche Drewno", icon: "wood",
      desc: "Kliknij aby rozpalić ognisko — rozgania mgłę i straszy wrogów",
      action: "click", chance: 0.22,
      reward: { type: "campfire", fearDuration: 5000, fearRadius: 20 },
    },
  ],
  sunset_beach: [
    {
      id: "beach_shell", name: "Wielka Muszla", icon: "shell",
      desc: "Kliknij — perła warta dużo miedziakow",
      action: "click", chance: 0.20,
      reward: { type: "loot", copper: 25, silverChance: 0.30 },
    },
    {
      id: "beach_coconut", name: "Kokos", icon: "fruit",
      desc: "Strzel aby strącić — regeneruje 2 HP i daje proch",
      action: "shoot", chance: 0.30,
      reward: { type: "heal_and_mana", heal: 2, mana: 10 },
    },
    {
      id: "beach_sand_castle", name: "Zamek z Piasku", icon: "castle",
      desc: "Magiczny zamek — kliknij aby wywołać piaskową burzę",
      action: "click", chance: 0.15,
      reward: { type: "aoe_damage", damage: 10, radius: 25, element: null },
    },
  ],
  bamboo_falls: [
    {
      id: "bamboo_stalk", name: "Łodyga Bambusa", icon: "bamboo",
      desc: "Wytnij sablem — bambus upada na wrogów (zadaje obrażenia)",
      action: "saber", chance: 0.35,
      reward: { type: "directional_damage", damage: 15, width: 8 },
    },
    {
      id: "bamboo_shrine", name: "Kamienna Kapliczka", icon: "shrine",
      desc: "Kliknij aby się pomodlić — tymczasowa tarcza na karawanę",
      action: "click", chance: 0.20,
      reward: { type: "buff", buffType: "shield", value: 10, duration: 20000 },
    },
    {
      id: "bamboo_koi", name: "Staw z Karpiami Koi", icon: "fish",
      desc: "Podejdź blisko — spokój koi regeneruje HP i proch",
      action: "proximity", chance: 0.25,
      reward: { type: "heal_and_mana", heal: 3, mana: 15 },
    },
  ],
  blue_lagoon: [
    {
      id: "lagoon_pearl", name: "Perłowa Muszla", icon: "gem",
      desc: "Kliknij szybko zanim zniknie — cenna perła",
      action: "click", chance: 0.25,
      reward: { type: "timed_loot", copper: 30, silverChance: 0.40, timeout: 10000 },
    },
    {
      id: "lagoon_coral", name: "Żywy Koral", icon: "coral",
      desc: "Strzel aby uwolnić jadowite meduzy na wrogów",
      action: "shoot", chance: 0.20,
      reward: { type: "aoe_damage", damage: 10, radius: 18, element: "poison" },
    },
    {
      id: "lagoon_anchor", name: "Zatopiona Kotwica", icon: "anchor",
      desc: "Wytnij sablem rdzę — ukryty skarb pirata",
      action: "saber", chance: 0.20,
      reward: { type: "loot", copper: 18, silverChance: 0.35 },
    },
  ],
  olympus: [
    {
      id: "olympus_ambrosia", name: "Ambrozja Bogów", icon: "star",
      desc: "Kliknij aby skosztować — potężne wzmocnienie na cały pokój",
      action: "click", chance: 0.15,
      reward: { type: "buff", buffType: "all_damage", value: 1.25, duration: 60000 },
    },
    {
      id: "olympus_lightning_rod", name: "Piorunochron Zeusa", icon: "lightning",
      desc: "Strzel aby aktywować — piorun uderza w najsilniejszego wroga",
      action: "shoot", chance: 0.25,
      reward: { type: "targeted_damage", damage: 40, targetType: "strongest", element: "lightning" },
    },
    {
      id: "olympus_olive_tree", name: "Drzewo Oliwne Ateny", icon: "tree",
      desc: "Kliknij aby zebrać oliwki — leczy karawanę i daje odporność",
      action: "click", chance: 0.20,
      reward: { type: "heal_and_buff", heal: 4, buffType: "resist", duration: 20000 },
    },
  ],
  underworld: [
    {
      id: "underworld_soul", name: "Uwięziona Dusza", icon: "ghost",
      desc: "Kliknij aby uwolnić — dusza walczy po twojej stronie przez 15s",
      action: "click", chance: 0.25,
      reward: { type: "summon_ally", allyType: "ghost", duration: 15000, damage: 8 },
    },
    {
      id: "underworld_bone_pile", name: "Stos Kości", icon: "bone",
      desc: "Wytnij sablem — kości eksplodują obrażając wrogów dookoła",
      action: "saber", chance: 0.30,
      reward: { type: "aoe_damage", damage: 14, radius: 16, element: "shadow" },
    },
    {
      id: "underworld_styx_pool", name: "Sadzawka Styksu", icon: "water",
      desc: "Podejdź blisko — ryzyko: albo wzmocnienie albo obrażenia",
      action: "proximity", chance: 0.20,
      reward: { type: "random_effect", options: [
        { buff: "damage", duration: 25000 }, { heal: 6 }, { damage: 8 }, { copper: 30 },
      ]},
    },
  ],
  meteor: [
    {
      id: "meteor_shard", name: "Odłamek Meteorytu", icon: "gem",
      desc: "Wytnij sablem — kosmiczny kryształ wart fortunę",
      action: "saber", chance: 0.20,
      reward: { type: "loot", copper: 30, silverChance: 0.40 },
    },
    {
      id: "meteor_crater", name: "Krater Uderzeniowy", icon: "rock",
      desc: "Strzel w niestabilny grunt — eksplozja kosmicznej energii",
      action: "shoot", chance: 0.25,
      reward: { type: "aoe_damage", damage: 20, radius: 18, element: "lightning" },
    },
    {
      id: "meteor_crystal", name: "Pulsujący Kryształ", icon: "lightning",
      desc: "Kliknij aby zaabsorbować — tymczasowe wzmocnienie piorunów",
      action: "click", chance: 0.20,
      reward: { type: "buff", buffType: "damage", value: 1.20, duration: 25000 },
    },
  ],
};

// ─── Defense POI definitions per biome ───
// These spawn in rooms eligible for defense (every 5th room).
// Player clicks them to start the defense encounter.
export const DEFENSE_POIS = {
  jungle:   { id: "jungle_camp",   name: "Obóz Bandytów",       icon: "skull",   desc: "Obóz pełen łupieżców — przygotuj obronę karawany!" },
  island:   { id: "island_cove",   name: "Zatoka Piratów",      icon: "anchor",  desc: "Piraci szykują atak z zatoki — chroń statek!" },
  desert:   { id: "desert_camp",   name: "Kryjówka Rabusiów",   icon: "skull",   desc: "Pustynni bandyci czają się za wydmami!" },
  winter:   { id: "winter_den",    name: "Jaskinia Bestii",     icon: "spider",  desc: "Mroźne bestie gromadzą się w jaskini!" },
  city:     { id: "city_ambush",   name: "Punkt Zasadzki",      icon: "swords",  desc: "Złodzieje planują atak na konwój!" },
  volcano:  { id: "volcano_nest",  name: "Gniazdo Ognia",       icon: "fire",    desc: "Ogniste stworzenia wyruszają z krateru!" },
  summer:   { id: "summer_camp",   name: "Obóz Zbójców",        icon: "skull",   desc: "Leśni rozbójnicy blokują szlak!" },
  autumn:   { id: "autumn_hollow", name: "Mroczna Kotlina",     icon: "moon",    desc: "Cienie zbierają się w opuszczonej kotlinie!" },
  spring:   { id: "spring_grove",  name: "Skalany Gaj",         icon: "poison",  desc: "Zatruty gaj pełen wrogich stworzeń!" },
  mushroom: { id: "shroom_ring",   name: "Pierścień Grzybów",   icon: "mushroom",desc: "Toksyczne stworzenia wylęgają z kręgu!" },
  swamp:    { id: "swamp_mound",   name: "Bagienne Legowisko",  icon: "bug",     desc: "Bagienne bestie bronią swojego terytorium!" },
  sunset_beach:  { id: "beach_wreck",  name: "Wrak Statku",     icon: "anchor",  desc: "Duchy marynarzy strzegą wraku!" },
  bamboo_falls:  { id: "bamboo_fort",  name: "Bambusowy Fort",   icon: "wood",    desc: "Wrogowie okopali się w bambusowej twierdzy!" },
  blue_lagoon:   { id: "lagoon_reef",  name: "Rafa Morska",      icon: "water",   desc: "Morskie potwory wychodzą z rafy!" },
  olympus:       { id: "olympus_gate",  name: "Brama Olimpu",    icon: "lightning",desc: "Strażnicy blokują przejście!" },
  underworld:    { id: "under_portal", name: "Portal Otchłani",  icon: "skull",   desc: "Z portalu wyłaniają się nieumarli!" },
  meteor:        { id: "meteor_crater", name: "Krater Uderzenia", icon: "fire",   desc: "Zmutowane stworzenia bronią krateru!" },
};

/**
 * Roll which interactable objects spawn in a room for the given biome.
 * @param {string} biomeId
 * @returns {Array<object>} spawned interactables with x position and used flag
 */
export function rollInteractables(biomeId) {
  const defs = BIOME_INTERACTABLES[biomeId];
  if (!defs) return [];

  const spawned = [];
  for (const def of defs) {
    if (spawned.length >= MAX_PER_ROOM) break;
    if (Math.random() < def.chance) {
      spawned.push({
        ...def,
        x: 5 + Math.random() * 90, // 5-95% of viewport
        y: 15 + Math.random() * 50, // 15-65% from bottom
        used: false,
      });
    }
  }
  return spawned;
}

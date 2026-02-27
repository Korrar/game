// Random event definitions for caravan travel
// 30% chance per travel to trigger one of 5 event types

export const EVENT_CHANCE = 0.30;

export const EVENT_TYPES = [
  { id: "merchant", name: "Wędrowny Kupiec",    emoji: "🧳", weight: 25, themeColor: "#d4a030", themeBorder: "#8a6a20", themeGlow: "rgba(212,160,48,0.3)" },
  { id: "ambush",   name: "Zasadzka Bandytów",  emoji: "⚔️", weight: 20, themeColor: "#cc3030", themeBorder: "#6a1a1a", themeGlow: "rgba(200,40,40,0.3)" },
  { id: "riddle",   name: "Zagadka Sfinksa",    emoji: "🗿", weight: 20, themeColor: "#60a0ff", themeBorder: "#2a4a80", themeGlow: "rgba(80,140,255,0.3)" },
  { id: "altar",    name: "Ołtarz Bogów",       emoji: "⛩️", weight: 20, themeColor: "#a050e0", themeBorder: "#4a2060", themeGlow: "rgba(160,80,224,0.3)" },
  { id: "wounded",  name: "Ranny Najemnik",     emoji: "🩹", weight: 15, themeColor: "#40e060", themeBorder: "#1a6a2a", themeGlow: "rgba(60,200,80,0.3)" },
];

export const RIDDLES = [
  {
    question: "Mam miasta, ale nie mam domów. Mam lasy, ale nie mam drzew. Mam wodę, ale nie mam ryb. Czym jestem?",
    answers: ["Mapa", "Globus", "Obraz", "Książka"], correct: 0,
  },
  {
    question: "Im więcej z tego zabierasz, tym większe się staje. Co to jest?",
    answers: ["Dziura", "Głód", "Ciemność", "Cisza"], correct: 0,
  },
  {
    question: "Chodzi bez nóg, pluje bez ust, bije bez rąk. Co to?",
    answers: ["Zegar", "Wiatr", "Deszcz", "Fala"], correct: 0,
  },
  {
    question: "Kto ją robi, nie potrzebuje. Kto ją kupuje, nie używa. Kto ją używa, nie wie o tym. Co to?",
    answers: ["Trumna", "Lekarstwo", "Klucz", "Pieniądze"], correct: 0,
  },
  {
    question: "Znika, gdy wymówisz jego imię. Co to?",
    answers: ["Cisza", "Ciemność", "Sen", "Cień"], correct: 0,
  },
  {
    question: "Ma klucz, ale nie otwiera zamka. Ma spację, ale nie ma pokoju. Co to?",
    answers: ["Klawiatura", "Nuty", "Mapa", "Księga"], correct: 0,
  },
  {
    question: "Jest lżejsze od piórka, ale nawet najsilniejszy człowiek nie utrzyma go dłużej niż minutę. Co to?",
    answers: ["Oddech", "Myśl", "Śmiech", "Pył"], correct: 0,
  },
  {
    question: "Widzisz mnie raz w roku, dwa razy w tygodniu, ale nigdy w ciągu dnia. Co to?",
    answers: ["Litera N", "Gwiazda", "Księżyc", "Sowa"], correct: 0,
  },
];

export const MERCHANT_ITEMS = [
  { icon: "🗡️", name: "Miecz Pielgrzyma",   desc: "+5 do obrażeń najemników (ten pokój)", cost: { copper: 40 }, effect: "dmgBuff",    value: 5 },
  { icon: "🛡️", name: "Tarcza Wędrowca",     desc: "+20 HP najemników (ten pokój)",        cost: { copper: 35 }, effect: "hpBuff",     value: 20 },
  { icon: "🧪", name: "Eliksir Siły",         desc: "Pełna mana natychmiast",              cost: { copper: 30 }, effect: "fullMana",    value: 100 },
  { icon: "💰", name: "Sakiewka Złota",       desc: "Natychmiastowy bonus 50 miedzi",       cost: { copper: 15 }, effect: "moneyBack",   value: { copper: 50 } },
  { icon: "📜", name: "Zwój Teleportacji",    desc: "+100 inicjatywy",                      cost: { copper: 25 }, effect: "initiative",  value: 100 },
  { icon: "💎", name: "Kamień Duszy",         desc: "Pełna mana + 30 miedzi",               cost: { copper: 45 }, effect: "soulstone",   value: 30 },
];

export const ALTAR_EFFECTS = [
  { type: "buff",   emoji: "✨", text: "Bogowie są łaskawi!",             effect: "manaBoost",  value: 30,  desc: "+30 many" },
  { type: "buff",   emoji: "💰", text: "Ofiary zostały przyjęte!",        effect: "moneyGift",  value: { copper: 30 }, desc: "+30 miedzi" },
  { type: "buff",   emoji: "⚡", text: "Moc przeszywa twoje ciało!",      effect: "initBoost",  value: 50,  desc: "+50 inicjatywy" },
  { type: "debuff", emoji: "💀", text: "Bogowie są niezadowoleni...",     effect: "moneyLoss",  value: { copper: 20 }, desc: "-20 miedzi" },
  { type: "debuff", emoji: "😵", text: "Mroczna energia osłabia cię...", effect: "manaLoss",   value: 20,  desc: "-20 many" },
  { type: "buff",   emoji: "🌟", text: "Błogosławieństwo rycerzy!",      effect: "freeMerc",   value: null, desc: "Darmowy najemnik" },
];

export function rollRandomEvent(roomNum) {
  if (Math.random() > EVENT_CHANCE) return null;

  const totalWeight = EVENT_TYPES.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = EVENT_TYPES[0];
  for (const et of EVENT_TYPES) {
    roll -= et.weight;
    if (roll <= 0) { selected = et; break; }
  }

  const event = { ...selected, roomNum };

  switch (selected.id) {
    case "merchant": {
      const count = 2 + (Math.random() < 0.4 ? 1 : 0);
      const shuffled = [...MERCHANT_ITEMS].sort(() => Math.random() - 0.5);
      event.items = shuffled.slice(0, count);
      break;
    }
    case "ambush": {
      const baseLoss = Math.min(50, 10 + roomNum * 2);
      event.moneyLoss = { copper: baseLoss };
      event.requiredClicks = 8 + Math.min(12, roomNum);
      break;
    }
    case "riddle": {
      const riddle = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      event.question = riddle.question;
      event.answers = indices.map(i => riddle.answers[i]);
      event.correctIndex = indices.indexOf(riddle.correct);
      event.reward = { copper: 15 + roomNum * 3 };
      event.penalty = { copper: Math.min(30, 5 + roomNum) };
      break;
    }
    case "altar": {
      event.altarEffect = ALTAR_EFFECTS[Math.floor(Math.random() * ALTAR_EFFECTS.length)];
      break;
    }
    case "wounded": {
      event.mercIndex = Math.floor(Math.random() * 4);
      break;
    }
  }

  return event;
}

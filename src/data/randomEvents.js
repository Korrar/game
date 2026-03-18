// Random event definitions for convoy travel
// 30% chance per travel to trigger one of 5 event types

export const EVENT_CHANCE = 0.30;

export const EVENT_TYPES = [
  { id: "merchant",      name: "Wędrowny Handlarz",     icon: "shop",    weight: 30, themeColor: "#d4a030", themeBorder: "#8a6a20", themeGlow: "rgba(212,160,48,0.3)" },
  { id: "altar",         name: "Kamienny Totem",         icon: "rock",    weight: 28, themeColor: "#a050e0", themeBorder: "#4a2060", themeGlow: "rgba(160,80,224,0.3)" },
  { id: "wounded",       name: "Ranny Rewolwerowiec",    icon: "bandage", weight: 22, themeColor: "#40e060", themeBorder: "#1a6a2a", themeGlow: "rgba(60,200,80,0.3)" },
  { id: "cursed_chest",  name: "Przeklęta Skrzynia",     icon: "treasure",weight: 20, themeColor: "#9040c0", themeBorder: "#4a1860", themeGlow: "rgba(144,64,192,0.3)" },
  { id: "shipwreck",     name: "Wrak na Mieliźnie",      icon: "anchor",  weight: 18, themeColor: "#3080a0", themeBorder: "#1a4060", themeGlow: "rgba(48,128,160,0.3)" },
  { id: "oracle",        name: "Wędrowna Wyrocznia",     icon: "eye",     weight: 15, themeColor: "#d0a0ff", themeBorder: "#6040a0", themeGlow: "rgba(180,140,255,0.3)" },
];

export const MERCHANT_ITEMS = [
  { icon: "swords", name: "Szabla Korsarza",      desc: "+5 do obrażeń najemników (ten pokój)", cost: { copper: 40 }, effect: "dmgBuff",    value: 5 },
  { icon: "shield", name: "Pancerz Abordażowy",    desc: "+20 HP najemników (ten pokój)",        cost: { copper: 35 }, effect: "hpBuff",     value: 20 },
  { icon: "gunpowder", name: "Beczka Prochu",          desc: "Pełny zapas prochu natychmiast",       cost: { copper: 30 }, effect: "fullMana",    value: 100 },
  { icon: "gold", name: "Sakwa Złota",            desc: "Natychmiastowy bonus 50 miedzi",       cost: { copper: 15 }, effect: "moneyBack",   value: { copper: 50 } },
  { icon: "scroll", name: "Zwój Nawigacji",         desc: "+100 inicjatywy",                      cost: { copper: 25 }, effect: "initiative",  value: 100 },
  { icon: "gem", name: "Kamień Fortuny",         desc: "Pełny proch + 30 miedzi",              cost: { copper: 45 }, effect: "soulstone",   value: 30 },
  { icon: "harpoon", name: "Ostrze z Meteortu",     desc: "+10 obrażeń harpunem na 3 pokoje",     cost: { copper: 50 }, effect: "harpoonBuff", value: 10 },
  { icon: "shield", name: "Amuleto Posejdona",      desc: "Odporność na lód na 3 pokoje",          cost: { silver: 1 },  effect: "iceResist",   value: 3 },
  { icon: "lightning", name: "Błogosławieństwo Zeusa", desc: "Pioruny zadają +30% obrażeń na 3 pokoje", cost: { copper: 55 }, effect: "lightBuff", value: 0.3 },
];

export const ALTAR_EFFECTS = [
  { type: "buff",   icon: "star", text: "Duchy morza są łaskawe!",            effect: "manaBoost",  value: 30,  desc: "+30 prochu" },
  { type: "buff",   icon: "gold", text: "Ofiary zostały przyjęte!",           effect: "moneyGift",  value: { copper: 30 }, desc: "+30 miedzi" },
  { type: "buff",   icon: "lightning", text: "Moc przeszywa twoje ciało!",         effect: "initBoost",  value: 50,  desc: "+50 inicjatywy" },
  { type: "debuff", icon: "skull", text: "Duchy morza są niezadowolone...",    effect: "moneyLoss",  value: { copper: 20 }, desc: "-20 miedzi" },
  { type: "debuff", icon: "skull", text: "Mroczna klątwa osłabia cię...",     effect: "manaLoss",   value: 20,  desc: "-20 prochu" },
  { type: "buff",   icon: "star", text: "Błogosławieństwo kapitanów!",       effect: "freeMerc",   value: null, desc: "Darmowy najemnik" },
  // Risk vs reward altar effects
  { type: "risky",  icon: "skull", text: "Ofiara z statku...",               effect: "caravanSacrifice", value: null, desc: "Utrata 50% HP statku za 3 skarby" },
  { type: "risky",  icon: "fire",  text: "Podwójna moc, podwójne ryzyko!",   effect: "doubleDamage",    value: null, desc: "x2 obrażenia obu stron na 2 pokoje" },
  { type: "buff",   icon: "gem",   text: "Kamienne posągi ożywają!",          effect: "trapBuff",       value: 0.25, desc: "+25% obrażeń pułapek na 3 pokoje" },
  { type: "buff",   icon: "shield", text: "Ochrona starożytnych!",             effect: "armorBuff",      value: 2,    desc: "+2 pancerza karawany na 3 pokoje" },
  { type: "debuff", icon: "skull", text: "Totem pochłania energię...",        effect: "cooldownDebuff", value: 1.3,  desc: "+30% cooldowny na 2 pokoje" },
];

// Cursed chest rewards/penalties
export const CURSED_CHEST_OUTCOMES = [
  { type: "good", text: "Skrzynia skrywa bogactwa!", reward: { copper: 80, silver: 2 }, desc: "+80 Cu, +2 Ag" },
  { type: "good", text: "Magiczny proch!", reward: { mana: 50 }, desc: "+50 prochu" },
  { type: "good", text: "Rzadki skarb!", reward: { treasure: true }, desc: "Rzadki skarb" },
  { type: "bad",  text: "Klątwa! Wrogowie wzmocnieni!", penalty: { enemyBuff: 3 }, desc: "Wrogowie +50% HP na 3 pokoje" },
  { type: "bad",  text: "Pułapka! Tracisz monety!", penalty: { moneyLoss: 40 }, desc: "-40 Cu" },
  { type: "bad",  text: "Mroczna energia osłabia cię...", penalty: { manaLoss: 30 }, desc: "-30 prochu" },
  { type: "good", text: "Starożytna broń!", reward: { dynamite: 4, harpoon: 3 }, desc: "+4 dynamitu, +3 harpuny" },
  { type: "good", text: "Mapa do tajemnego przejścia!", reward: { initiative: 150, copper: 40 }, desc: "+150 inicjatywy, +40 Cu" },
  { type: "bad",  text: "Duch kapitana jest wściekły!", penalty: { mercDeath: 1 }, desc: "Tracisz najsłabszego najemnika" },
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
    case "altar": {
      event.altarEffect = ALTAR_EFFECTS[Math.floor(Math.random() * ALTAR_EFFECTS.length)];
      break;
    }
    case "wounded": {
      event.mercIndex = Math.floor(Math.random() * 4);
      break;
    }
    case "cursed_chest": {
      const outcome = CURSED_CHEST_OUTCOMES[Math.floor(Math.random() * CURSED_CHEST_OUTCOMES.length)];
      event.chestOutcome = outcome;
      break;
    }
    case "shipwreck": {
      const salvage = [
        { text: "Znaleziono skrzynię z amunicją!", reward: { dynamite: 3, cannonball: 2, harpoon: 2 } },
        { text: "Kadłub pełen skarbów!", reward: { copper: 60, silver: 1 } },
        { text: "Ocaleli marynarze dołączają!", reward: { tempMercs: 1, duration: 4 } },
        { text: "Wrak jest pusty... ale znaleziono mapę.", reward: { initiative: 80, copper: 20 } },
      ];
      event.salvageResult = salvage[Math.floor(Math.random() * salvage.length)];
      break;
    }
    case "oracle": {
      const prophecies = [
        { text: "Wyrocznia widzi ogień w twojej przyszłości...", effect: "fireResist", desc: "Odporność na ogień na 3 pokoje", value: 3 },
        { text: "Gwiazdy sprzyjają odważnym!", effect: "critBuff", desc: "+20% szans na krytyk na 3 pokoje", value: 0.2 },
        { text: "Widzę złoto na twojej drodze...", effect: "lootBuff", desc: "+50% loot na 3 pokoje", value: 0.5 },
        { text: "Nadchodzi burza — bądź czujny.", effect: "dodgeBuff", desc: "Wrogowie mają -20% unik na 3 pokoje", value: -0.2 },
      ];
      event.prophecy = prophecies[Math.floor(Math.random() * prophecies.length)];
      break;
    }
  }

  return event;
}

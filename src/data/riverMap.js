// River Map — procedural river path with forks, turns, and node types
// Generates a Slay-the-Spire-style branching map for the sailing segment

// Node types with their visual/gameplay properties
export const RIVER_NODE_TYPES = {
  start:     { id: "start",     name: "Start",               icon: "anchor",    color: "#4080c0", desc: "Początek rejsu" },
  calm:      { id: "calm",      name: "Spokojne Wody",       icon: "water",     color: "#3090b0", desc: "Łatwy odcinek z niewieloma przeszkodami" },
  danger:    { id: "danger",    name: "Niebezpieczne Wody",  icon: "skull",     color: "#cc4040", desc: "Gęste przeszkody i wrogowie, ale lepszy łup" },
  treasure:  { id: "treasure",  name: "Zatopiony Skarb",     icon: "treasure",  color: "#d4a030", desc: "Beczki i wraki pełne skarbów" },
  combat:    { id: "combat",    name: "Piracka Blokada",     icon: "swords",    color: "#cc3030", desc: "Wrogowie blokują przejście — walcz lub giń!" },
  rest:      { id: "rest",      name: "Spokojna Zatoczka",   icon: "heart",     color: "#40a060", desc: "Odpoczynek — regeneracja HP statku" },
  shop:      { id: "shop",      name: "Handlarz na Tratwie", icon: "shop",      color: "#a08030", desc: "Pływający handlarz oferuje towary" },
  event:     { id: "event",     name: "Tajemnicze Miejsce",  icon: "compass",   color: "#8060a0", desc: "Losowe wydarzenie — ryzyko lub nagroda" },
  current:   { id: "current",   name: "Silne Prądy",         icon: "wind",      color: "#2080c0", desc: "Prądy rzucają statkiem — trudne sterowanie" },
  whirlpool: { id: "whirlpool", name: "Pole Wirów",          icon: "vortex",    color: "#1a5080", desc: "Wiry morskie ciągną statek — unikaj centrum!" },
  narrows:   { id: "narrows",   name: "Cieśnina",            icon: "rock",      color: "#6a5a4a", desc: "Wąskie przejście ze skałami — precyzyjne sterowanie" },
  boss:      { id: "boss",      name: "Kraken!",             icon: "kraken",    color: "#4a2060", desc: "Morski potwór blokuje drogę!" },
  end:       { id: "end",       name: "Przystań",            icon: "flag",      color: "#40cc60", desc: "Cel podróży" },
};

// Turn/bend types for visual variety during segments
export const RIVER_TURN_TYPES = {
  straight:   { id: "straight",   name: "Prosto",           bankShift: 0,   difficulty: 0 },
  gentle_l:   { id: "gentle_l",   name: "Łagodny zakręt ←", bankShift: -80, difficulty: 0.1 },
  gentle_r:   { id: "gentle_r",   name: "Łagodny zakręt →", bankShift: 80,  difficulty: 0.1 },
  sharp_l:    { id: "sharp_l",    name: "Ostry zakręt ←",   bankShift: -160, difficulty: 0.3 },
  sharp_r:    { id: "sharp_r",    name: "Ostry zakręt →",   bankShift: 160, difficulty: 0.3 },
  s_curve:    { id: "s_curve",    name: "Esówka",           bankShift: 0,   difficulty: 0.4, oscillate: true },
  waterfall:  { id: "waterfall",  name: "Wodospad",          bankShift: 0,   difficulty: 0.2, speedBoost: 1.5 },
  delta:      { id: "delta",      name: "Rozlewisko",        bankShift: 0,   difficulty: 0.15, widen: true },
};

// Fork hint icons for scouting
export const FORK_HINT_ICONS = {
  calm:      { icon: "water",    label: "Spokojnie",   color: "#3090b0" },
  danger:    { icon: "skull",    label: "Niebezpiecznie", color: "#cc4040" },
  treasure:  { icon: "treasure", label: "Skarby",      color: "#d4a030" },
  combat:    { icon: "swords",   label: "Walka",       color: "#cc3030" },
  rest:      { icon: "heart",    label: "Odpoczynek",  color: "#40a060" },
  shop:      { icon: "shop",     label: "Handel",      color: "#a08030" },
  event:     { icon: "compass",  label: "Tajemnica",   color: "#8060a0" },
  current:   { icon: "wind",     label: "Prądy",       color: "#2080c0" },
  whirlpool: { icon: "vortex",   label: "Wiry",        color: "#1a5080" },
  narrows:   { icon: "rock",     label: "Cieśnina",    color: "#6a5a4a" },
  boss:      { icon: "kraken",   label: "Potwór!",     color: "#4a2060" },
};

// Node pool weights by difficulty
const NODE_POOL_EASY = [
  { type: "calm", weight: 35 },
  { type: "treasure", weight: 25 },
  { type: "rest", weight: 15 },
  { type: "event", weight: 15 },
  { type: "shop", weight: 10 },
];

const NODE_POOL_MEDIUM = [
  { type: "calm", weight: 15 },
  { type: "danger", weight: 25 },
  { type: "treasure", weight: 15 },
  { type: "combat", weight: 15 },
  { type: "current", weight: 10 },
  { type: "event", weight: 10 },
  { type: "shop", weight: 5 },
  { type: "rest", weight: 5 },
];

const NODE_POOL_HARD = [
  { type: "danger", weight: 25 },
  { type: "combat", weight: 20 },
  { type: "whirlpool", weight: 15 },
  { type: "narrows", weight: 15 },
  { type: "current", weight: 10 },
  { type: "treasure", weight: 10 },
  { type: "event", weight: 5 },
];

function pickFromPool(pool, rng) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let roll = rng() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return pool[0].type;
}

function getPoolForRow(row, totalRows) {
  const pct = row / totalRows;
  if (pct < 0.3) return NODE_POOL_EASY;
  if (pct < 0.7) return NODE_POOL_MEDIUM;
  return NODE_POOL_HARD;
}

// Turn assignment for segments
function pickTurn(rng, row, totalRows) {
  const pct = row / totalRows;
  const turns = Object.values(RIVER_TURN_TYPES);

  // Early: mostly straight/gentle, later: sharper turns
  const weights = turns.map(t => {
    if (t.id === "straight") return pct < 0.3 ? 40 : 20;
    if (t.id.startsWith("gentle")) return 25;
    if (t.id.startsWith("sharp")) return pct < 0.3 ? 5 : 20;
    if (t.id === "s_curve") return pct < 0.4 ? 3 : 15;
    if (t.id === "waterfall") return pct > 0.3 && pct < 0.8 ? 8 : 2;
    if (t.id === "delta") return 10;
    return 5;
  });

  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < turns.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return turns[i].id;
  }
  return "straight";
}

// Segment-specific modifiers per node type
export const NODE_SEGMENT_MODIFIERS = {
  calm:      { obstacleMult: 0.5, enemyMult: 0,    lootMult: 0.5,  speedMult: 1.0, hpRegenPerSec: 0 },
  danger:    { obstacleMult: 1.5, enemyMult: 1.5,  lootMult: 2.0,  speedMult: 1.1, hpRegenPerSec: 0 },
  treasure:  { obstacleMult: 0.7, enemyMult: 0.3,  lootMult: 3.0,  speedMult: 0.9, hpRegenPerSec: 0 },
  combat:    { obstacleMult: 0.6, enemyMult: 3.0,  lootMult: 1.5,  speedMult: 1.0, hpRegenPerSec: 0 },
  rest:      { obstacleMult: 0.2, enemyMult: 0,    lootMult: 0,    speedMult: 0.7, hpRegenPerSec: 3 },
  shop:      { obstacleMult: 0.4, enemyMult: 0,    lootMult: 0.3,  speedMult: 0.8, hpRegenPerSec: 0 },
  event:     { obstacleMult: 0.8, enemyMult: 0.5,  lootMult: 1.0,  speedMult: 1.0, hpRegenPerSec: 0 },
  current:   { obstacleMult: 0.8, enemyMult: 0.3,  lootMult: 0.8,  speedMult: 1.3, hpRegenPerSec: 0 },
  whirlpool: { obstacleMult: 1.2, enemyMult: 0.5,  lootMult: 1.0,  speedMult: 1.0, hpRegenPerSec: 0 },
  narrows:   { obstacleMult: 1.8, enemyMult: 0.2,  lootMult: 1.0,  speedMult: 0.9, hpRegenPerSec: 0 },
  boss:      { obstacleMult: 1.0, enemyMult: 2.5,  lootMult: 2.5,  speedMult: 1.0, hpRegenPerSec: 0 },
  start:     { obstacleMult: 0.3, enemyMult: 0,    lootMult: 0,    speedMult: 1.0, hpRegenPerSec: 0 },
  end:       { obstacleMult: 0,   enemyMult: 0,    lootMult: 0,    speedMult: 0.8, hpRegenPerSec: 0 },
};

// Shop items available on river shop nodes
export const RIVER_SHOP_ITEMS = [
  { icon: "dynamite", name: "Beczka Dynamitu",    desc: "+5 dynamitu",          cost: { copper: 25 }, reward: { dynamite: 5 } },
  { icon: "harpoon",  name: "Skrzynia Harpunów",  desc: "+5 harpunów",          cost: { copper: 20 }, reward: { harpoon: 5 } },
  { icon: "cannon",   name: "Kule Armatnie",      desc: "+3 kule armatnie",     cost: { copper: 30 }, reward: { cannonball: 3 } },
  { icon: "shield",   name: "Łata na Kadłub",     desc: "+20 HP statku",        cost: { copper: 35 }, reward: { shipHeal: 20 } },
  { icon: "heart",    name: "Apteczka Pokładowa",  desc: "+30 HP statku",        cost: { copper: 50 }, reward: { shipHeal: 30 } },
  { icon: "feather",  name: "Oliwa do Żagli",     desc: "+15% prędkość na 1 odcinek", cost: { copper: 20 }, reward: { tempSpeedBuff: 0.15 } },
];

// Events that can trigger on event nodes
export const RIVER_NODE_EVENTS = [
  {
    id: "shipwreck_survivor",
    name: "Rozbitek!",
    icon: "recruit",
    desc: "Rozbitek woła o pomoc z tonącego wraku!",
    choices: [
      { label: "Uratuj rozbitka", desc: "Traci czas, ale rozbitek pomoże: +1 tymczasowy najemnik", icon: "heart", reward: { tempMerc: true, timePenalty: 2 } },
      { label: "Płyń dalej", desc: "Bezpiecznie, ale rozbitek tonie...", icon: "compass", reward: null },
    ],
  },
  {
    id: "floating_chest",
    name: "Dryfująca Skrzynia",
    icon: "treasure",
    desc: "Bogato zdobiona skrzynia dryfuje na falach.",
    choices: [
      { label: "Otwórz skrzynię", desc: "70% skarb, 30% pułapka (miny!)", icon: "treasure", reward: { gamble: "chest" } },
      { label: "Zostaw", desc: "Kto wie, co tam jest...", icon: "compass", reward: null },
    ],
  },
  {
    id: "siren_song",
    name: "Syreni Śpiew",
    icon: "water",
    desc: "Melodyjny śpiew niesie się znad skał...",
    choices: [
      { label: "Podpłyń do syren", desc: "Syreny leczą statek +25 HP, ale następny odcinek trudniejszy", icon: "heart", reward: { shipHeal: 25, nextHarder: true } },
      { label: "Zatkaj uszy woskiem", desc: "Bezpiecznie omijasz syreny", icon: "shield", reward: { tempShield: 10 } },
    ],
  },
  {
    id: "ghost_ship",
    name: "Widmowy Statek",
    icon: "ghost",
    desc: "Przezroczysty galeon płynie obok w ciszy...",
    choices: [
      { label: "Wejdź na pokład", desc: "50% legendarne znalezisko, 50% klątwa (-15 HP)", icon: "ghost", reward: { gamble: "ghost" } },
      { label: "Zapal pochodnie", desc: "Duchy znikają, zostawiając +40 miedzi", icon: "fire", reward: { copper: 40 } },
      { label: "Uciekaj!", desc: "Bezpiecznie, ale bez nagrody", icon: "feather", reward: null },
    ],
  },
  {
    id: "toll_bridge",
    name: "Most z Mytem",
    icon: "rock",
    desc: "Zbrojni wartownicy żądają opłaty za przejazd!",
    choices: [
      { label: "Zapłać myto", desc: "Wydaj 30 miedzi — spokojne przejście", icon: "coin", reward: null, cost: { copper: 30 } },
      { label: "Przebij się siłą", desc: "Stracisz -20 HP, ale zaoszczędzisz miedź", icon: "swords", reward: { damage: 20 } },
      { label: "Szukaj obejścia", desc: "Dłuższa droga — dodatkowy segment", icon: "compass", reward: { extraSegment: true } },
    ],
  },
  {
    id: "sea_turtle",
    name: "Żółw Morski",
    icon: "shield",
    desc: "Ogromny żółw morski płynie obok statku.",
    choices: [
      { label: "Podążaj za żółwiem", desc: "Żółw prowadzi bezpieczną trasą — następny odcinek łatwiejszy", icon: "compass", reward: { nextEasier: true } },
      { label: "Zbadaj muszlę", desc: "Na grzbiecie żółwia rosną perły — +2 srebra", icon: "gem", reward: { silver: 2 } },
    ],
  },
];

// ── RIVER MAP GENERATOR ──

export function generateRiverMap(roomNumber) {
  // Deterministic seed based on room number
  let seed = roomNumber * 7919 + 1337;
  const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

  const difficultyLevel = Math.min(3, Math.floor(roomNumber / 10) + 1);
  const totalRows = 4 + Math.min(3, Math.floor(difficultyLevel)); // 4-7 rows

  // Generate rows of nodes
  const rows = [];

  // Row 0: Start node (always 1)
  rows.push([{
    id: `node_0_0`,
    row: 0, col: 0,
    type: "start",
    turn: "straight",
    connections: [], // filled later
    x: 0.5, // normalized position 0-1
    visited: false,
    selected: false,
  }]);

  // Middle rows: 1-2 or 1-3 nodes each, with branching
  for (let r = 1; r < totalRows; r++) {
    const prevRow = rows[r - 1];
    const pool = getPoolForRow(r, totalRows);

    // How many nodes in this row?
    // More likely to branch (2 paths) than converge (1 path) or triple (3 paths)
    let nodeCount;
    if (prevRow.length === 1) {
      // From 1 node: likely fork into 2, sometimes stay at 1
      nodeCount = rng() < 0.7 ? 2 : (rng() < 0.5 ? 3 : 1);
    } else if (prevRow.length === 2) {
      // From 2 nodes: sometimes merge to 1, stay at 2, or expand to 3
      nodeCount = rng() < 0.3 ? 1 : (rng() < 0.7 ? 2 : 3);
    } else {
      // From 3 nodes: likely converge
      nodeCount = rng() < 0.4 ? 2 : (rng() < 0.7 ? 1 : 3);
    }

    // Last row before end should converge toward 1-2
    if (r === totalRows - 1) {
      nodeCount = Math.min(nodeCount, 2);
      if (rng() < 0.5) nodeCount = 1;
    }

    nodeCount = Math.max(1, Math.min(3, nodeCount));

    const row = [];
    for (let c = 0; c < nodeCount; c++) {
      let type = pickFromPool(pool, rng);

      // Avoid same type as parent if possible
      if (prevRow.length > 0) {
        const parentType = prevRow[Math.min(c, prevRow.length - 1)].type;
        if (type === parentType && rng() < 0.6) {
          type = pickFromPool(pool, rng);
        }
      }

      // Boss chance on last row before end (if high difficulty)
      if (r === totalRows - 1 && difficultyLevel >= 2 && rng() < 0.3) {
        type = "boss";
      }

      // Ensure at least one rest/shop appears across the map
      if (r === Math.floor(totalRows / 2) && c === 0 && rng() < 0.4) {
        type = rng() < 0.5 ? "rest" : "shop";
      }

      const x = nodeCount === 1 ? 0.5 : (c / (nodeCount - 1));

      row.push({
        id: `node_${r}_${c}`,
        row: r, col: c,
        type,
        turn: pickTurn(rng, r, totalRows),
        connections: [],
        x,
        visited: false,
        selected: false,
      });
    }
    rows.push(row);
  }

  // Final row: End node (always 1)
  rows.push([{
    id: `node_${totalRows}_0`,
    row: totalRows, col: 0,
    type: "end",
    turn: "straight",
    connections: [],
    x: 0.5,
    visited: false,
    selected: false,
  }]);

  // Generate connections (edges between rows)
  for (let r = 0; r < rows.length - 1; r++) {
    const currentRow = rows[r];
    const nextRow = rows[r + 1];

    // Every node in current row must connect to at least one in next row
    // Every node in next row must be connected from at least one in current row

    // Initialize connection tracking
    const nextConnected = new Set();

    for (let c = 0; c < currentRow.length; c++) {
      const node = currentRow[c];

      if (nextRow.length === 1) {
        // All converge to single node
        node.connections.push(nextRow[0].id);
        nextConnected.add(0);
      } else if (currentRow.length === 1) {
        // Single node fans out to all
        for (let nc = 0; nc < nextRow.length; nc++) {
          node.connections.push(nextRow[nc].id);
          nextConnected.add(nc);
        }
      } else {
        // Multi to multi: connect to nearest, sometimes cross-connect
        const nearestCol = Math.min(c, nextRow.length - 1);
        node.connections.push(nextRow[nearestCol].id);
        nextConnected.add(nearestCol);

        // Chance for extra connection to adjacent node
        if (rng() < 0.35) {
          const altCol = nearestCol + (rng() < 0.5 ? -1 : 1);
          if (altCol >= 0 && altCol < nextRow.length && altCol !== nearestCol) {
            node.connections.push(nextRow[altCol].id);
            nextConnected.add(altCol);
          }
        }
      }
    }

    // Ensure all next row nodes are connected
    for (let nc = 0; nc < nextRow.length; nc++) {
      if (!nextConnected.has(nc)) {
        // Connect from nearest current row node
        const nearestC = Math.min(nc, currentRow.length - 1);
        currentRow[nearestC].connections.push(nextRow[nc].id);
      }
    }
  }

  return {
    rows,
    totalRows: rows.length,
    difficulty: difficultyLevel,
    seed: roomNumber,
  };
}

// Get a flat list of all nodes
export function getAllNodes(riverMap) {
  return riverMap.rows.flat();
}

// Find node by ID
export function findNode(riverMap, nodeId) {
  for (const row of riverMap.rows) {
    for (const node of row) {
      if (node.id === nodeId) return node;
    }
  }
  return null;
}

// Get available next nodes from a given node
export function getNextNodes(riverMap, nodeId) {
  const node = findNode(riverMap, nodeId);
  if (!node) return [];
  return node.connections.map(id => findNode(riverMap, id)).filter(Boolean);
}

// Calculate total path rewards/risk for a path
export function getPathSummary(path) {
  let dangerScore = 0;
  let lootScore = 0;
  let healScore = 0;

  for (const node of path) {
    const mod = NODE_SEGMENT_MODIFIERS[node.type] || NODE_SEGMENT_MODIFIERS.calm;
    dangerScore += mod.obstacleMult + mod.enemyMult;
    lootScore += mod.lootMult;
    healScore += mod.hpRegenPerSec;
  }

  return { dangerScore, lootScore, healScore, length: path.length };
}

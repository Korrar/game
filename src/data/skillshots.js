// Skillshot configuration — defines projectile behavior for each spell type
// Each spell gets a skillshot type that determines how the projectile travels

export const SKILLSHOT_TYPES = {
  // Dynamit — arc trajectory (parabola), leci lobem ze statku do celu, splash damage
  fireball: {
    type: "arc",
    speed: 6,
    gravity: 0.10,
    size: 12,          // projectile visual radius
    hitRadius: 22,     // collision radius (pixels)
    splashRadius: 50,  // AoE splash radius (pixels)
    splashDamageMult: 0.5, // splash damage = 50% of direct hit
    trail: "fire",
  },
  // Strzał — fast straight line, narrow hitbox
  lightning: {
    type: "linear",
    speed: 14,
    gravity: 0,
    size: 4,
    hitRadius: 10,
    splashRadius: 0,
    trail: "spark",
    pierce: false,
  },
  // Harpun — medium speed, pierces first enemy
  icelance: {
    type: "linear",
    speed: 8,
    gravity: 0,
    size: 8,
    hitRadius: 14,
    splashRadius: 0,
    trail: "ice",
    pierce: true,
    maxPierce: 1,
  },
  // Strzał z Armaty — wolny lob ze statku, duży splash damage
  holybeam: {
    type: "arc",
    speed: 5,
    gravity: 0.08,
    size: 16,
    hitRadius: 26,
    splashRadius: 60,
    splashDamageMult: 0.6,
    trail: "fire",
  },
  // Salwa Armatnia — arc cannonballs from caravan to cursor (hold-to-cast)
  meteor: {
    type: "arc",
    speed: 8,
    gravity: 0.12,
    size: 12,
    hitRadius: 24,
    splashRadius: 55,
    splashDamageMult: 0.5,
    trail: "fire",
  },
  // Grad Kul — rain of bullets in targeted area
  blizzard: {
    type: "area",
    delay: 800,
    splashRadius: 70,
    indicatorColor: "#80d0ff",
  },
  // Piracki Haracz — medium speed shadow bolt
  drain: {
    type: "linear",
    speed: 7,
    gravity: 0,
    size: 10,
    hitRadius: 16,
    splashRadius: 0,
    trail: "shadow",
    pierce: false,
  },
  // Rykoszet — bouncing projectile (hits first, then chains)
  chainlightning: {
    type: "linear",
    speed: 10,
    gravity: 0,
    size: 6,
    hitRadius: 14,
    splashRadius: 0,
    trail: "spark",
    pierce: false,
    chainOnHit: true,
    maxChains: 3,
    chainDamageMult: 0.6,
  },
  // Mina Wybuchowa — player places mine, explodes when enemy steps on it
  earthquake: {
    type: "mine",
    triggerRadius: 30,  // pixels proximity to trigger
    splashRadius: 70,
    armDelay: 500,      // ms before mine is armed
  },
};

// Accuracy tracking constants
export const ACCURACY_COMBO_THRESHOLD = 3;    // hits without miss for combo
export const ACCURACY_COMBO_BONUS = 0.25;     // +25% damage bonus on accuracy combo
export const HEADSHOT_BONUS = 0.5;            // +50% damage for center hits
export const HEADSHOT_RADIUS_MULT = 0.3;      // headshot = within 30% of body center

// Dodge roll constants
export const DODGE_ROLL_COOLDOWN = 3000;   // ms
export const DODGE_ROLL_DURATION = 400;    // ms of invulnerability
export const DODGE_ROLL_SPEED = 6;         // pixels per frame during roll

// Enemy dodge constants
export const ENEMY_DODGE_CHANCE = 0.15;    // base chance to dodge incoming projectile
export const ENEMY_DODGE_SPEED = 3;        // pixels offset when dodging
export const ENEMY_DODGE_REACT_DIST = 80;  // pixel distance at which enemies react

// Interactive environment
export const BARREL_HP = 1;
export const BARREL_SPLASH_RADIUS = 60;
export const BARREL_DAMAGE = 30;

// Player-placeable defense traps (during setup phase)
export const DEFENSE_TRAPS = [
  {
    id: "caltrops",
    name: "Kolczatki",
    desc: "Spowalnia wrogów o 40% w obszarze",
    icon: "spike",
    cost: { harpoon: 1 },
    slowMult: 0.6,
    radius: 8,        // % of screen width
    duration: 0,       // permanent until wave ends
    maxCount: 3,
  },
  {
    id: "powder_barrel",
    name: "Beczka Prochu",
    desc: "Eksploduje przy kontakcie wroga — 35 obrażeń AoE",
    icon: "fire",
    cost: { dynamite: 1 },
    damage: 35,
    splashRadius: 8,   // % of screen width
    triggerRadius: 4,
    maxCount: 3,
  },
  {
    id: "net_trap",
    name: "Sieć",
    desc: "Łapie pierwszego wroga na 3s — zatrzymuje ruch",
    icon: "anchor",
    cost: { harpoon: 1 },
    stunDuration: 3000,
    triggerRadius: 4,
    maxCount: 2,
  },
  {
    id: "barricade",
    name: "Barykada",
    desc: "Blokuje wrogów — muszą ją zniszczyć (60 HP)",
    icon: "wood",
    cost: { cannonball: 1 },
    hp: 60,
    blockRadius: 5,    // % — enemies in this radius are blocked
    maxCount: 3,
  },
  {
    id: "fire_pit",
    name: "Ognisko",
    desc: "Pali wrogów w zasięgu — 5 obrażeń/s",
    icon: "fire",
    cost: { dynamite: 1 },
    dps: 5,
    radius: 6,
    maxCount: 2,
  },
];
export const MAX_PLAYER_TRAPS = 8;

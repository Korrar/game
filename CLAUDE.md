# Wrota Przeznaczenia - Game Development Guide

## Project Overview

Pirate-themed roguelike deck builder with real-time tower defense elements. Players progress through procedurally-generated rooms across diverse biomes, using skill-shot combat, traps, and mercenaries to defend their caravan.

## Tech Stack

- **UI**: React 19 + JSX (no TypeScript)
- **Build**: Vite 7 (base path: `/game/`, dev: `npm run dev`, build: `npm run build`)
- **Rendering**: PixiJS 8 (WebGL characters/projectiles/particles) + Canvas2D (biome backgrounds)
- **Physics**: Rapier2D (`@dimforge/rapier2d-compat`) - rigid bodies, collisions, projectiles
- **Audio**: Web Audio API - procedural synthesis, per-biome adaptive music
- **State**: React hooks (useState, useRef) - no external state library

## Architecture

```
src/
├── App.jsx              # Core game logic (~7k LOC) - state machine, combat loop, room transitions
├── components/          # React UI (SpellBar, TopBar, EventModal, RelicPicker, Door, Chest...)
├── data/                # Game content as JS objects (npcs, biomes, bosses, relics, spells...)
├── physics/             # Rapier2D wrapper, NPC bodies, combat effects
├── rendering/           # PixiJS renderer, sprites, projectiles, particles, damage numbers
├── renderers/           # Canvas2D biome backgrounds and animations
├── audio/               # Procedural sound engine
└── utils/               # Helpers (money formatting, etc.)
```

## Key Conventions

- All game data lives in `src/data/*.js` as exported arrays/objects - NO JSON files
- Polish names for in-game content (spell names, NPC names, descriptions, UI text)
- Code comments and variable names in English
- Spells use ammo system (`ammoCost: { type: "dynamite", amount: 1 }`) - NOT mana
- NPC definitions include `bodyType` for physics (humanoid, quadruped, floating, serpent, spider, scorpion, frog)
- Biomes define enemy rosters, visual themes, weather, music profiles
- Currencies: copper (common), silver (medium), gold (rare)
- Game resolution: 1280x720 desktop, responsive portrait mobile

## Data Format Examples

### NPC (src/data/npcs.js)
```js
{
  icon: "skull", name: "Nazwa Wroga", hp: 35, resist: "fire",
  loot: { copper: 12 }, rarity: "uncommon",
  bodyColor: "#8B7355", armorColor: "#2d5a1e", bodyType: "humanoid",
  ability: { type: "charge", damage: 8, cooldown: 5000, element: null, range: 20 }
}
```

### Spell (src/data/ in App.jsx SPELLS array)
```js
{
  id: "fireball", icon: "dynamite", name: "Dynamit",
  color: "#ff6020", desc: "Opis umiejętności",
  manaCost: 0, cooldown: 3000, damage: 25, element: "fire",
  learned: false, skillshot: true,
  ammoCost: { type: "dynamite", amount: 1 }
}
```

### Skillshot (src/data/skillshots.js)
```js
{
  type: "arc",        // arc | linear | area
  speed: 6, gravity: 0.10, size: 12,
  hitRadius: 22, splashRadius: 50, splashDamageMult: 0.5,
  trail: "fire"
}
```

### Biome (src/data/biomes.js)
```js
{
  id: "jungle", name: "Dżungla", icon: "palm",
  bg: "#1a3a1a", weather: "rain",
  scatter: [...], enemies: [...],
  terrain: "forest",
  music: { root: 220, scale: "minor", bpm: 90, ... }
}
```

### Relic (src/data/relics.js)
```js
{
  id: "blood_weapon", name: "Krwawa Broń", icon: "droplet",
  desc: "Opis efektu", rarity: "rare",
  effect: { type: "lifesteal", value: 0.1 }
}
```

---

## Agent Roles for Game Development

When working on this project, adopt the appropriate role based on the task:

### 1. Game Designer (Projektant Gry)
**When**: Adding new game mechanics, balancing stats, designing progression systems
**Rules**:
- Always consider impact on existing systems (combos, relics, synergies)
- Balance new content against existing power curves
- Check `src/data/` files for current stat ranges before setting new values
- Enemy HP scales: common (15-40), uncommon (30-60), rare (50-100), elite (80-150)
- Spell damage scales: weak (10-15), medium (20-30), strong (35-50), ultimate (60+)
- Cooldowns: fast (1-2s), medium (3-5s), slow (6-10s), ultimate (15s+)
- New mechanics must work on both desktop (mouse aim) and mobile (touch aim)
- Preserve the roguelike feel: meaningful choices, risk/reward tradeoffs, run variety

### 2. Content Creator (Twórca Treści)
**When**: Adding NPCs, biomes, items, events, bosses, relics, spells
**Rules**:
- All in-game text in Polish (names, descriptions, dialogue)
- Follow existing data structures exactly - read the target file before adding content
- Each biome needs: enemies (4-6 types), visual theme, weather, scatter elements, music profile
- Each boss needs: phases (2-3), minion spawns, unique abilities, scaling stats
- Each relic needs: unique effect, synergy potential with at least 1 other relic
- NPCs need valid `bodyType` for physics - match creature anatomy
- Test that new IDs don't conflict with existing ones
- Rarity distribution: common (50%), uncommon (30%), rare (15%), legendary (5%)

### 3. Combat Engineer (Inżynier Walki)
**When**: Working on projectile physics, hit detection, damage calculations, spell mechanics
**Rules**:
- Physics runs in `src/physics/RapierPhysicsWorld.js` - all body creation goes through here
- Skillshot types: `arc` (gravity-affected), `linear` (straight), `area` (ground-targeted)
- Damage pipeline: base damage → element multiplier → combo bonus → crit → resist → armor
- Headshot zone: center 30% of body = +50% damage
- Accuracy streak: 3 consecutive hits = +25% damage bonus
- Knockback calculated from projectile mass and speed
- Enemy dodge: 15% base chance (modified by relic/perk effects)
- Always test projectile behavior with both mouse and touch input

### 4. UI/UX Developer (Developer UI)
**When**: Building or modifying React components, HUD elements, menus, overlays
**Rules**:
- Components live in `src/components/` - one component per file
- Mobile-first: ensure touch targets are minimum 44px, use safe-area insets
- SpellBar is docked at bottom - don't overlap with it
- Use inline styles or App.css - no CSS modules or styled-components
- Modal/overlay pattern: conditional render with backdrop + centered panel
- Animations: CSS transitions preferred over JS animation for UI
- Color palette follows pirate theme: dark woods (#2a1a0a), gold (#ffd700), parchment (#f4e4c1)
- Always show resource costs before confirming actions (shop, upgrades, crafting)

### 5. Rendering Artist (Artysta Renderingu)
**When**: Working on PixiJS sprites, particle effects, biome visuals, animations
**Rules**:
- PixiJS renderer in `src/rendering/PixiRenderer.js` - WebGL layer for dynamic elements
- Canvas2D backgrounds in `src/renderers/` - static/slow-animated biome scenery
- Character sprites use `CharacterSprite.js` - procedural body parts, not sprite sheets
- Particle system in `CombatParticles.js` - fire, ice, lightning, poison, shadow elements
- Damage numbers float up and fade - `DamageNumbers.js`
- Keep draw calls minimal - batch similar sprites
- Mobile: render at 1x device pixel ratio (not native) to save GPU
- Biome animations: parallax layers, weather particles, ambient scatter objects
- Color-code elements: fire (#ff6020), ice (#4488ff), lightning (#ffee00), poison (#44ff44), shadow (#8844cc)

### 6. Audio Engineer (Inżynier Dźwięku)
**When**: Adding sound effects, music, ambient audio
**Rules**:
- All audio is procedural via Web Audio API - NO audio files
- Sound engine in `src/audio/soundEngine.js`
- Per-biome music profiles define root note, scale, BPM, drone/pad/chime settings
- SFX categories: combat (spell cast, hit, crit), UI (click, open, close), ambient (weather)
- Keep audio lightweight - mobile devices have limited AudioContext voices
- Sounds must have volume controls and mute support

### 7. Systems Architect (Architekt Systemów)
**When**: Refactoring, optimizing performance, restructuring code, adding major features
**Rules**:
- `App.jsx` is the monolith - be careful modifying it, changes cascade
- State lives in App.jsx hooks - pass down via props to components
- Game loop: room selection → combat waves → loot → shop/events → next room
- Room counter determines boss fights (every 5 rooms) and difficulty scaling
- Consider extracting logic from App.jsx into custom hooks when it grows
- Physics step and render loop are decoupled - physics at fixed timestep
- Lazy-load Rapier2D WASM to avoid blocking initial render
- Keep bundle size small - no heavy dependencies, tree-shake aggressively

---

## Common Tasks Quick Reference

| Task | Files to modify | Agent role |
|------|----------------|------------|
| Add new enemy | `src/data/npcs.js` | Content Creator |
| Add new biome | `src/data/biomes.js`, `src/renderers/biomeRenderers.js`, `src/renderers/biomeAnimator.js` | Content Creator + Rendering Artist |
| Add new spell | `App.jsx` (SPELLS array), `src/data/skillshots.js` | Game Designer + Combat Engineer |
| Add new boss | `src/data/bosses.js` | Content Creator + Combat Engineer |
| Add new relic | `src/data/relics.js` | Game Designer |
| Add new trap | `src/data/advancedTraps.js` | Game Designer |
| Add UI screen | `src/components/NewScreen.jsx`, `App.jsx` | UI/UX Developer |
| Add particle effect | `src/rendering/CombatParticles.js` | Rendering Artist |
| Balance combat | `src/data/npcs.js`, `src/data/bosses.js`, `App.jsx` (SPELLS) | Game Designer |
| Add random event | `src/data/randomEvents.js` or `src/data/storyEvents.js` | Content Creator |
| Add shop item | `src/data/shopItems.js` | Content Creator |
| Fix physics bug | `src/physics/RapierPhysicsWorld.js`, `src/physics/combatEffects.js` | Combat Engineer |
| Optimize rendering | `src/rendering/PixiRenderer.js` | Rendering Artist + Systems Architect |

## Development Commands

```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run lint     # ESLint check
```

## Important Warnings

- `App.jsx` is ~7000 lines - read relevant sections before editing, don't load the whole file blindly
- Rapier2D is WASM-based - async initialization required before physics calls
- Never add external audio files - all sound is procedurally generated
- Mobile support is critical - test touch interactions for any UI change
- Game is in Polish - all player-facing text must be in Polish
- No TypeScript - this is a pure JS/JSX project, don't add .ts files
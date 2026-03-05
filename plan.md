# Plan: Ship Control & World Map Navigation

## Overview
Replace the random biome selection with an interactive world map where the player controls their ship, sails across an ocean, and chooses which biome island to dock at.

## Components to Create/Modify

### 1. NEW: `src/components/WorldMap.jsx`
- Full-screen Canvas2D ocean map with procedurally drawn islands
- Each island represents a biome from BIOMES array
- Islands placed in a spread-out layout on the ocean
- Ship rendered at current position, player controls with:
  - **Desktop**: WASD/Arrow keys for movement, mouse click to set waypoint
  - **Mobile**: Touch joystick or tap-to-move
- Ship has momentum/drift physics (pirate feel)
- When ship is near an island, show "Cumuj" (Dock) button
- Docking triggers `enterRoom()` with that biome
- Visual: ocean waves, wind particles, fog of war (optional), island labels
- Mini compass rose, current biome name on hover

### 2. MODIFY: `src/App.jsx`
- Add `worldMap` state (boolean or object with ship position)
- Add `shipPos` state `{x, y}` persisted between map opens
- Modify `travelCaravan()`: instead of random biome → open world map
- Add `handleDockAtIsland(biome)` callback: closes map, runs river segment or enters room
- Keep river segment as transition AFTER choosing destination (sail to island → river segment → enter room)
- Wire world map into render (full-screen overlay like river segment)

### 3. MODIFY: `src/data/biomes.js`
- Add `mapPos: {x, y}` to each biome for island placement on world map
- Add `difficulty` tier (1-3) so harder biomes are further from start
- Add `dockCost` (initiative cost varies by distance)

## Implementation Steps

1. Add `mapPos` and `difficulty` to biomes.js
2. Create WorldMap.jsx component with:
   - Ocean rendering (waves, gradient)
   - Island rendering (colored circles/shapes per biome)
   - Ship rendering and movement
   - Dock interaction
3. Add states to App.jsx (`worldMap`, `shipPos`)
4. Modify `travelCaravan()` to open world map
5. Add dock handler that transitions to river segment → room
6. Wire into JSX render tree

## Key Design Decisions
- Ship position persists across the run (player moves around the map)
- Islands are always visible (no fog of war for simplicity)
- Each island shows biome name + difficulty indicator
- Initiative cost to travel stays the same (paid when opening map)
- River segment still plays as transition after docking
- Boss rooms still trigger every 5th room regardless of biome choice

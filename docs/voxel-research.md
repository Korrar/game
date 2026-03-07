# Analiza: Voxele w Wrota Przeznaczenia

## Obecny stack renderingu

Gra używa warstwowego systemu 2D:
1. **Canvas2D** - statyczne tła biomów (`src/renderers/biomeRenderers.js`)
2. **Canvas2D** - animacje pogody/ambient (`src/renderers/biomeAnimator.js`)
3. **PixiJS 8 (WebGL)** - NPC, pociski, cząsteczki (`src/rendering/PixiRenderer.js`)
4. **React DOM** - UI (komponenty w `src/components/`)

Fizyka: **Rapier2D** (WASM). Brak jakiejkolwiek biblioteki 3D.

---

## Przebadane opcje

### 1. Three.js + InstancedMesh ⭐ REKOMENDOWANE dla pełnego 3D

| Aspekt | Szczegół |
|--------|----------|
| Bundle size | ~500-700 KB minified, ~150-200 KB gzipped |
| Integracja z PixiJS 8 | Oficjalnie wspierane - shared WebGL context |
| Wydajność voxeli | InstancedMesh = 1 draw call na tysiące kostek |
| Niszczenie | Usuwanie instancji + particle debris |
| Budowanie | Dodawanie instancji do InstancedMesh |
| Dokumentacja | Ogromna community, mnóstwo tutoriali |

**Integracja z PixiJS 8:**
```js
// Three.js renderer tworzy WebGL context
const threeRenderer = new THREE.WebGLRenderer({ stencil: true });
// PixiJS używa tego samego contextu
await pixiRenderer.init({ context: threeRenderer.getContext() });

// Render loop:
threeRenderer.resetState();
threeRenderer.render(scene, camera);
pixiRenderer.resetState();
pixiRenderer.render({ container: stage, clear: false });
```

**Zalety:** Oficjalny guide PixiJS 8 na mieszanie z Three.js, WebGPU support od r171.
**Wady:** +500KB bundle, tree-shaking problematyczny, tekstury NIE współdzielone.

---

### 2. noa-engine (Minecraft-like full engine)

| Aspekt | Szczegół |
|--------|----------|
| Bundle size | Babylon.js core ~800KB+ minified |
| Zależność | Babylon.js (peer dependency) |
| Niszczenie/budowanie | Wbudowane - to silnik voxelowy |
| Projekty | bloxd.io, Minecraft Classic (Mojang!), CityCraft.io |

**Zalety:** Gotowy chunking, meshing, fizyka voxelowa, kolizje, raycasting.
**Wady:** Wymaga Babylon.js (nie Three.js), overkill jako element gry, conflict z PixiJS.

---

### 3. Izometryczne pseudo-voxele (2.5D) w PixiJS ⭐ REKOMENDOWANE dla lekkiego rozwiązania

| Aspekt | Szczegół |
|--------|----------|
| Bundle size | 0 KB - już mamy PixiJS |
| Złożoność | Niska |
| Niszczenie | Usunięcie sprite'a + particle effect |
| Budowanie | Dodanie sprite'a na grid |

```js
function drawVoxel(x, y, z, color) {
  const isoX = (x - y) * TILE_W / 2;
  const isoY = (x + y) * TILE_H / 2 - z * TILE_H;
  // Rysuj top + left + right face jako PixiJS Graphics
}
```

**Zalety:** Zero zależności, pasuje do 2D stacku, łatwe niszczenie/budowanie.
**Wady:** Nie jest prawdziwe 3D, brak rotacji kamery, fixed isometric perspective.

---

### 4. Voxelize (Rust + Three.js)

Full-stack multiplayer voxel engine z Rust backend.

**Odrzucone:** Wymaga Rust serwera, pnpm, protobuf. Własna fizyka (conflict z Rapier2D). Overkill.

---

### 5. Divine Voxel Engine (Babylon.js)

Multi-threaded TypeScript voxel engine z chunk meshing, lighting, AO.

**Odrzucone:** npm package deprecated, TypeScript only, Babylon.js ~800KB+, zbyt złożony.

---

### 6. VoxelJS-Next (Three.js)

Modernizacja oryginalnego Voxel.js (ES6, latest Three.js).

**Odrzucone:** Mało aktywny, zaprojektowany jako standalone engine, nie komponent.

---

### 7. Pixi3D

**NIE DZIAŁA.** Wspiera PixiJS v5/v6/v7 - NIE v8. Brak wsparcia voxeli.

---

### 8. Traviso.js (PixiJS isometric)

Isometric tile engine na PixiJS.

**Odrzucone:** Brak true voxeli, brak niszczenia, zaprojektowane dla strategy/city-builder.

---

### 9. IsoEngine (2.5D Voxel Engine)

Dedykowany 2.5D isometric voxel engine z culling i chunk optimization.

**Ciekawe ale problematyczne:** Nie na PixiJS, mały projekt, wymaga adaptacji.

---

### 10. Custom WebGL Voxel Renderer

Minimalistyczny renderer od zera.

| Aspekt | Szczegół |
|--------|----------|
| Bundle size | ~5-20 KB (custom code) |
| Wydajność | Optymalna |
| Złożoność | Bardzo wysoka |

**Odrzucone:** Ogrom pracy (meshing, culling, lighting, chunking od zera), ryzyko bugów.

---

## Tabela porównawcza

| Opcja | Realność | Bundle | Wysiłek | Efekt | Ocena |
|-------|----------|--------|---------|-------|-------|
| Three.js + InstancedMesh | ✅ Wysoka | +500KB | Średni | Pełne 3D voxele | ⭐⭐⭐⭐⭐ |
| Izo 2.5D w PixiJS | ✅ Wysoka | +0KB | Niski | Fake voxele | ⭐⭐⭐⭐ |
| noa-engine | ⚠️ Średnia | +800KB+ | Niski | Full Minecraft | ⭐⭐⭐ |
| IsoEngine | ⚠️ Średnia | +? | Średni | 2.5D z culling | ⭐⭐⭐ |
| VoxelJS-Next | ⚠️ Niska | +500KB | Średni | Voxel world | ⭐⭐ |
| Custom WebGL | ⚠️ Niska | +10KB | Bardzo wysoki | Wszystko custom | ⭐⭐ |
| Pixi3D | ❌ Brak | N/A | N/A | NIE DZIAŁA | ❌ |

---

## Rekomendacja końcowa

### Dla pełnych 3D voxeli (niszczenie budynków, budowanie fortyfikacji):
→ **Three.js + InstancedMesh** na shared WebGL context z PixiJS 8. Lazy-load Three.js tylko gdy potrzebny (np. scena z voxelami). Koszt: +~200KB gzipped.

### Dla lekkiego gameplayu voxelowego (niszczalne ściany, barykady, pułapki):
→ **Izometryczne 2.5D w PixiJS** - zero nowych zależności, integruje się z istniejącym `CombatParticles.js` i `RapierPhysicsWorld.js`.

### Wniosek: TAK, jest to możliwe.
Voxele w tej grze są w pełni wykonalne. Wybór podejścia zależy od tego jak centralne mają być voxele w gameplayu.

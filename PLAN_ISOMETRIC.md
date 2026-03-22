# Plan Refaktoru: Widok Izometryczny

## Obecny Stan

Gra używa systemu **2.5D panoramicznego**:
- Świat 3× szerokości ekranu (1280×3 = 3840px) z panoramicznym zawijaniem
- Oś Y symuluje głębię: Y=25% (horyzont/daleko) → Y=90% (blisko kamery)
- Skala NPC: 0.7× (daleko) → 1.3× (blisko)
- Canvas2D tła + PixiJS dla dynamicznych elementów
- Pozycje NPC w procentach (X: 0-300%, Y: 25-90%)

## Docelowy Widok Izometryczny

Klasyczna projekcja izometryczna 2:1 (kąt ~30°):
- Współrzędne świata (wx, wy) → ekran via transformata izometryczna
- Kamera z możliwością przesuwania w 4 kierunkach
- Podłoże jako kafelki izometryczne (diamond tiles)
- Sortowanie głębi po sumie wx+wy (painter's algorithm)

## Architektura Zmian

### Faza 1: System Współrzędnych Izometrycznych
**Nowy plik: `src/utils/isometricUtils.js`**

```js
// Stałe
const TILE_W = 64;  // szerokość kafelka iso
const TILE_H = 32;  // wysokość kafelka iso (2:1 ratio)
const MAP_COLS = 40; // rozmiar mapy w kafelkach
const MAP_ROWS = 40;

// Świat → Ekran
function worldToScreen(wx, wy, cameraX, cameraY) {
  const sx = (wx - wy) * (TILE_W / 2) - cameraX + SCREEN_CX;
  const sy = (wx + wy) * (TILE_H / 2) - cameraY + SCREEN_CY;
  return { x: sx, y: sy };
}

// Ekran → Świat
function screenToWorld(sx, sy, cameraX, cameraY) {
  const adjX = sx - SCREEN_CX + cameraX;
  const adjY = sy - SCREEN_CY + cameraY;
  const wx = (adjX / (TILE_W/2) + adjY / (TILE_H/2)) / 2;
  const wy = (adjY / (TILE_H/2) - adjX / (TILE_W/2)) / 2;
  return { x: wx, y: wy };
}

// Głębia sortowania (painter's algorithm)
function isoDepth(wx, wy) {
  return wx + wy; // wyższy = rysowany później (bliżej kamery)
}
```

**Pliki do zmiany:**
- Nowy: `src/utils/isometricUtils.js`
- Usuń zależność od: `src/utils/panoramaWrap.js` (zachowaj plik, stopniowo migruj)

---

### Faza 2: System Kamery Izometrycznej
**Nowy plik: `src/rendering/IsoCamera.js`**

Zastąpi panoramiczny panOffset:
- Pozycja kamery (cameraX, cameraY) w świecie iso
- Przesuwanie myszą/dotyk w 4 kierunkach (nie tylko horyzontalnie)
- Opcjonalnie: śledzenie gracza / centrum areny
- Granice kamery (nie wyjdzie poza mapę)

**Pliki do zmiany:**
- `App.jsx`: Zastąpić `panOffset` / `panOffsetRef` nowym systemem kamery
- `App.jsx`: Zaktualizować `handlePanStart/Move/End` dla ruchu 2D
- Usunąć panoramiczne zawijanie (modulo wrapping)

---

### Faza 3: Renderowanie Podłoża Izometrycznego
**Zmiany w: `src/renderers/biomeRenderers.js`**

Zastąpić panoramiczne tła kafelkowym podłożem iso:
- Siatka diamentowych kafelków (40×40 lub konfigurowalna)
- Każdy biom definiuje teksturę/kolor kafelków
- Warianty kafelków dla różnorodności wizualnej
- Elementy dekoracyjne (scatter) pozycjonowane na kafelkach
- Krawędzie mapy: woda/przepaść/mgła

**Warstwy renderowania:**
1. Kafelki podłoża (Canvas2D, buforowane)
2. Elementy dekoracyjne na podłożu (skały, rośliny)
3. Elementy na kafelkach (budynki, drzewa) - sortowane po głębi

**Pliki do zmiany:**
- `src/renderers/biomeRenderers.js` - kompletna przepisanie
- `src/renderers/biomeAnimator.js` - animacje adaptowane do iso
- `src/data/biomes.js` - dodać definicje kafelków iso per biom

---

### Faza 4: Pozycjonowanie i Renderowanie NPC
**Zmiany w wielu plikach**

NPC przechodzą z pozycji procentowych na współrzędne świata iso:

**Spawning (App.jsx):**
```js
// Zamiast: spawnX = 5 + Math.random() * 290 (%)
// Teraz:   spawnX = 2 + Math.random() * 36  (world tile coords)
spawnWX = 2 + Math.random() * (MAP_COLS - 4);
spawnWY = 2 + Math.random() * (MAP_ROWS - 4);
```

**Ruch NPC:**
- Patrol bounds w współrzędnych świata iso
- Ruch w 8 kierunkach (nie tylko lewo-prawo + góra-dół)
- Konwersja pozycji świata → ekran w każdej klatce

**CharacterSprite:**
- Pozycja sprite = worldToScreen(npc.wx, npc.wy)
- Skala stała (nie zależy od Y) lub lekka perspektywa
- Sortowanie zIndex = isoDepth(wx, wy)
- Cienie pod postaciami adaptowane do iso

**Pliki do zmiany:**
- `App.jsx` - spawning, movement, patrol logic (~500 linii zmian)
- `src/rendering/CharacterSprite.js` - pozycjonowanie, skala, cień
- `src/rendering/PixiRenderer.js` - sortowanie warstw, aktualizacja
- `src/rendering/DepthSystem.js` - kompletna przepisanie dla iso

---

### Faza 5: System Fizyki i Projektylie
**Zmiany w: `src/physics/RapierPhysicsWorld.js`**

Mapowanie fizyki na iso:
- Ciała Rapier2D nadal w 2D, ale mapowane do płaszczyzny iso
- Projektylie: lot w przestrzeni iso (wx, wy) + wysokość (wz) dla łuków
- Kolizje: sprawdzanie w współrzędnych świata, nie ekranu
- Ragdoll: konwersja pozycji kończyn przez worldToScreen()

**Skillshoty:**
- Gracz celuje na mapie iso (klik → screenToWorld → cel)
- Lot pocisku: interpolacja po współrzędnych świata
- Wyświetlanie: worldToScreen() dla pozycji pocisku

**Pliki do zmiany:**
- `src/physics/RapierPhysicsWorld.js` - mapowanie koordynatów
- `src/rendering/ProjectileRenderer.js` - renderowanie iso
- `App.jsx` - castSkillshot, celowanie

---

### Faza 6: Efekty Wizualne (Cząstki, Dmg Numbers)
**Zmiany w:**

- `src/rendering/CombatParticles.js`:
  - Cząstki spawują w współrzędnych świata → worldToScreen()
  - Ruch cząstek w 2D ekranowym (lub opcjonalnie w iso)
  - Usunąć panoramiczne zawijanie

- `src/rendering/DamageNumbers.js`:
  - Pozycja = worldToScreen(npc.wx, npc.wy) + offset Y w górę
  - Usunąć wrapPxToScreen()

---

### Faza 7: System Wejścia (Input)
**Zmiany w: `App.jsx`**

- Klik myszą/dotyk → screenToWorld() → pozycja celu w świecie iso
- Przesuwanie kamery: drag w dowolnym kierunku
- Hover nad NPC: hit-test w współrzędnych iso
- Celownik: rysowany na pozycji iso kursora

---

### Faza 8: UI i Komponenty React
**Minimalne zmiany:**

Komponenty UI (SpellBar, TopBar, modalne) pozostają bez zmian - są overlayami.
Jedyne zmiany:
- Minimap może pokazywać widok iso
- Wskaźniki pozycji NPC (off-screen indicators) muszą używać nowych koordynatów

---

## Migracja Danych

### walkDataRef format:
```js
// PRZED:
{ x: 150.5, y: 45.2, minX: 100, maxX: 200, minY: 30, maxY: 60 }  // procenty

// PO:
{ wx: 20.5, wy: 15.2, minWX: 10, maxWX: 30, minWY: 8, maxWY: 22 }  // world iso
```

### biomes.js rozszerzenie:
```js
{
  id: "jungle",
  // ... istniejące dane ...
  isoTiles: {
    ground: ["#2d5a1e", "#1a4a12", "#3d6a2e"],  // warianty kolorów
    border: "#0a2a08",
    decorations: ["tree", "bush", "rock", "flower"],
    decorDensity: 0.15
  }
}
```

## Kolejność Implementacji

1. **isometricUtils.js** - fundament (transformaty, stałe)
2. **IsoCamera.js** - system kamery
3. **DepthSystem.js** - nowy sorting iso
4. **biomeRenderers.js** - podłoże kafelkowe
5. **PixiRenderer.js** - integracja kamery iso
6. **CharacterSprite.js** - pozycjonowanie NPC
7. **App.jsx (spawning)** - nowe współrzędne spawn
8. **App.jsx (movement)** - ruch NPC w iso
9. **App.jsx (input/targeting)** - celowanie iso
10. **RapierPhysicsWorld.js** - mapowanie fizyki
11. **ProjectileRenderer.js** - renderowanie pocisków
12. **CombatParticles.js** - cząstki w iso
13. **DamageNumbers.js** - numery obrażeń
14. **Finalne testy i polish**

## Ryzyka i Uwagi

1. **App.jsx ma ~7000 linii** - zmiany muszą być chirurgiczne, sekcja po sekcji
2. **Panoramiczne zawijanie** - trzeba usunąć ze WSZYSTKICH systemów (render, fizyka, input, cząstki)
3. **Mobile** - dotykowe sterowanie musi działać z nową kamerą 2D
4. **Wydajność** - kafelki iso mogą być cięższe niż Canvas2D tła; buforować renderowane kafelki
5. **Rapier2D** - fizyka 2D nadal działa, ale trzeba mapować oś Y/Z dla łuków pocisków
6. **Testy wizualne** - każdą fazę trzeba wizualnie sprawdzić przed następną

## Szacowany zakres zmian

| Plik | Rozmiar zmian |
|------|---------------|
| `src/utils/isometricUtils.js` | **NOWY** (~120 linii) |
| `src/rendering/IsoCamera.js` | **NOWY** (~80 linii) |
| `src/rendering/DepthSystem.js` | Przepisanie (~60 linii) |
| `src/renderers/biomeRenderers.js` | Duże zmiany (~500 linii) |
| `src/rendering/PixiRenderer.js` | Średnie zmiany (~200 linii) |
| `src/rendering/CharacterSprite.js` | Średnie zmiany (~150 linii) |
| `src/rendering/ProjectileRenderer.js` | Średnie zmiany (~100 linii) |
| `src/rendering/CombatParticles.js` | Małe zmiany (~50 linii) |
| `src/rendering/DamageNumbers.js` | Małe zmiany (~30 linii) |
| `src/physics/RapierPhysicsWorld.js` | Średnie zmiany (~150 linii) |
| `src/data/biomes.js` | Małe zmiany (~50 linii) |
| `src/App.jsx` | Duże zmiany (~500+ linii) |
| `src/utils/panoramaWrap.js` | Stopniowe wycofanie |

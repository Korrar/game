# Plan: Usprawnienie modeli i fizyki NPC

## Analiza obecnego stanu

Aktualnie gra ma **7 bodyType** dla NPC (humanoid, quadruped, floating, scorpion, spider, frog, serpent).
Wiele NPC używa nieodpowiednich typów ciała — np. kraby używają `spider`, krokodyle `serpent`, małpy `quadruped`, minotaur `quadruped` (a jest dwunożny), meduzy `floating`, ośmiornice `spider`.

System wymaga zmian w 4 warstwach: **dane NPC → ikony → fizyka/ragdoll → animacje**.

---

## FAZA 1: Nowe typy ciał (bodyType)

### 1.1 `bird` — Stworzenia latające ze skrzydłami
**Dotyczy NPC:** Orzeł Łowca, Gryfon Olimpijski, Harpia, Nietoperz Jaskiniowy
**Model:** Głowa + tułów + 2 skrzydła (rozkładane) + ogon + 2 szpony
**Ragdoll (7 limbs):** head, torso, lWing, rWing, tail, lClaw, rClaw
**Animacja:** Machanie skrzydłami (sinusoidalny ruch góra-dół), szpony podkulone w locie
**Ikona:** Ptasi kształt z rozłożonymi skrzydłami, ostre szpony na dole
**Śmierć:** Skrzydła składają się, ciało spada po spirali

### 1.2 `crab` — Skorupiaki z kleszczami
**Dotyczy NPC:** Krab Kokosowy, Krab Plażowy, Turkusowy Krab, Krab Pustelnik
**Model:** Pancerz (szeroki owal) + 6 nóg (3/stronę) + 2 kleszcze + oczka na patyczkach
**Ragdoll (11 limbs):** torso, head, l1-l3, r1-r3, lPincer, rPincer
**Animacja:** Ruch bokiem (jak prawdziwy krab), kleszcze otwierają/zamykają się
**Ikona:** Szeroki pancerz, wyraźne kleszcze, oczka na szypułkach
**Śmierć:** Pancerz pęka, nogi odpadają na boki, kleszcze lecą w górę

### 1.3 `lizard` — Czworonożne gady (jaszczurki, krokodyle, warany)
**Dotyczy NPC:** Krokodyl Rzeczny, Waran Wyspowy, Jaszczurka Szmaragdowa, Aligator, Ognisty Salamander
**Model:** Długi tułów + duża głowa z paszczą + 4 krótkie nogi rozstawione na boki + gruby ogon
**Ragdoll (8 limbs):** head, torso, fl, fr, bl, br, tail, jaw (żuchwa)
**Animacja:** Nisko przy ziemi, kołysanie bokami przy chodzeniu, ogon się wije
**Ikona:** Niski profil, rozstawione nogi, wyraźna paszcza z zębami, łuski
**Śmierć:** Obrót na plecy, ogon odłamuje się, paszcza otwiera się

### 1.4 `tentacle` — Stworzenia z mackami (ośmiornice, meduzy, kraken)
**Dotyczy NPC:** Ośmiornica, Meduza Brzegowa, Morska Bestia, Morski Jeż
**Model:** Głowa/dzwon + 6 macek (elastyczne, wijące się)
**Ragdoll (8 limbs):** head, torso, t1-t6 (macki)
**Animacja:** Macki falują niezależnie (fazy przesunięte), pulsujący dzwon
**Ikona:** Okrągła głowa, falujące macki poniżej, duże oczy
**Śmierć:** Macki zwijają się spiralnie, głowa odpływa w górę

### 1.5 `primate` — Naczelne (małpy, gibony)
**Dotyczy NPC:** Dzika Małpa, Małpa Gibbon
**Model:** Głowa + tułów + 2 długie ręce (dłuższe niż humanoid) + 2 krótkie nogi + ogon chwytny
**Ragdoll (8 limbs):** head, torso, lArm, rArm, lLeg, rLeg, tail, jaw
**Animacja:** Kołyszący chód na rękach i nogach, okazjonalne bicie się w klatkę
**Ikona:** Przygarbiona sylwetka, długie ręce, mała głowa, ogon
**Śmierć:** Dramatyczna poza — ręce rozłożone, ogon zwiotczały

### 1.6 `fish` — Stworzenia wodne (ryby, płaszczki, węgorze)
**Dotyczy NPC:** Jadowita Ryba, Płaszczka Plażowa
**Model:** Opływowe ciało + płetwa grzbietowa + płetwa ogonowa + 2 płetwy boczne
**Ragdoll (6 limbs):** head, torso, dorsalFin, tailFin, lFin, rFin
**Animacja:** Falujący ruch ciała, machanie ogonem do przodu
**Ikona:** Rybi kształt z wyraźnymi płetwami, oko z boku
**Śmierć:** Obrót na bok (jak zdechła ryba), płetwy sztywnieją

---

## FAZA 2: Korekta istniejących typów ciał

### 2.1 `humanoid` — Dodanie wariantów głów
- Minotaur: zmiana z `quadruped` → `humanoid` (jest dwunożny!) + rogi w modelu głowy
- Kamienny Gargulec: zmiana z `quadruped` → `humanoid` + małe skrzydła dekoracyjne
- Dodanie opcjonalnego pola `headVariant` w danych NPC: `"normal"`, `"horned"`, `"hooded"`, `"helmeted"`, `"skull"`
- Dodanie opcji `weaponType`: `"sword"`, `"gun"`, `"staff"`, `"claws"` — widoczna broń w ręce

### 2.2 `quadruped` — Poprawa proporcji
- Dodanie opcji `bodyScale`: `"small"` (szczury), `"medium"` (wilki), `"large"` (niedźwiedzie, byki)
- Proporcje ciała skalują się z rozmiarem
- Dodanie opcji `hasHorns` dla Byka Prerii

### 2.3 `frog` — Wariant z muszlą
- Trujący Ślimak → `frog` z nowym polem `hasShell: true` (muszla na grzbiecie)

### 2.4 `serpent` — Wzory na ciele
- Dodanie opcji `pattern`: `"striped"`, `"spotted"`, `"plain"` dla wzorów

---

## FAZA 3: Usprawnienie ragdolli

### 3.1 Uproszczony system — tiery złożoności
- **Tier 1 (3-4 limbs):** frog, fish — minimalne ragdoll
- **Tier 2 (5-7 limbs):** bird, primate, serpent — średni rozkład
- **Tier 3 (8-12 limbs):** humanoid, scorpion, spider, tentacle, lizard, crab — pełny

### 3.2 Impulsy śmierci per bodyType
- **bird:** Spiralny upadek, skrzydła trzepoczą
- **crab:** Pancerz ląduje płasko, nogi rozrzucone radialnie
- **lizard:** Obrót 180° (na plecy), ogon łamie się
- **tentacle:** Macki zwijają się do środka spiralnie
- **primate:** Ręce rozkładają się w "T"
- **fish:** Boczny obrót, sztywne płetwy

### 3.3 Masa ciała wpływa na ragdoll
Obliczanie z HP: `bodyMass = hp * 0.5`
- Lekkie (masa < 15): dalej lecą, szybciej wirują
- Średnie (15-30): standardowy ragdoll
- Ciężkie (> 30): krótki lot, uderzenie o ziemię

### 3.4 Efekty cząsteczkowe per bodyType
- **crab:** Fragmenty pancerza
- **tentacle:** Atrament/śluz
- **bird:** Pióra (wolne opadanie)
- **lizard:** Łuski (małe trójkąty)
- **fish:** Pluski wody

---

## FAZA 4: Mapa zmian bodyType w npcs.js

| NPC | Biome | Obecny | Nowy | Powód |
|-----|-------|--------|------|-------|
| Krokodyl Rzeczny | jungle | serpent | **lizard** | Krokodyl ma 4 nogi |
| Dzika Małpa | jungle | quadruped | **primate** | Małpa ≠ czworonóg |
| Ośmiornica | island | spider | **tentacle** | 8 macek ≠ 8 nóg pająka |
| Krab Kokosowy | island | spider | **crab** | Krab z kleszczami |
| Waran Wyspowy | island | serpent | **lizard** | Waran ma 4 nogi |
| Orzeł Łowca | summer | floating | **bird** | Ptak ze skrzydłami |
| Nietoperz Jaskiniowy | mushroom | floating | **bird** | Skrzydła, nie unoszenie |
| Trujący Ślimak | mushroom | frog | frog + **hasShell** | Muszla na grzbiecie |
| Aligator | swamp | serpent | **lizard** | 4 nogi, nie wąż |
| Krab Plażowy | sunset_beach | spider | **crab** | Krab |
| Meduza Brzegowa | sunset_beach | floating | **tentacle** | Macki, nie duch |
| Żółw Morski | sunset_beach | quadruped | quadruped + **hasShell** | Pancerz |
| Krab Pustelnik | sunset_beach | spider | **crab** | Krab |
| Płaszczka Plażowa | sunset_beach | serpent | **fish** | Ryba, nie wąż |
| Małpa Gibbon | bamboo_falls | quadruped | **primate** | Naczelny |
| Jaszczurka Szmaragdowa | bamboo_falls | serpent | **lizard** | Jaszczurka ma nogi |
| Turkusowy Krab | blue_lagoon | spider | **crab** | Krab |
| Jadowita Ryba | blue_lagoon | frog | **fish** | Ryba ≠ żaba |
| Morski Jeż | blue_lagoon | spider | **tentacle** | Kolce + macki |
| Gryfon Olimpijski | olympus | floating | **bird** | Ma skrzydła |
| Kamienny Gargulec | olympus | quadruped | **humanoid** | Dwunożny |
| Minotaur | olympus | quadruped | **humanoid** | Dwunożny z rogami |
| Harpia | underworld | floating | **bird** | Skrzydlata |
| Ognisty Salamander | volcano | frog | **lizard** | Salamander = gad 4-nożny |
| Morska Bestia | meteor | serpent | **tentacle** | Kraken z mackami |

---

## FAZA 5: Pliki do modyfikacji

| Plik | Zmiany |
|------|--------|
| `src/data/npcs.js` | Zmiana bodyType + dodanie nowych pól (headVariant, bodyScale, hasShell) |
| `src/rendering/icons.js` | Dodanie NPC_BODY_DRAW dla: bird, crab, lizard, tentacle, primate, fish |
| `src/rendering/CharacterSprite.js` | Dodanie LIMB_DEFS + ICON_SIZES dla nowych typów |
| `src/physics/RapierPhysicsWorld.js` | Dodanie _buildLimbs, _buildJoints, _update* dla nowych typów |
| `src/physics/bodies/constants.js` | Dodanie HALF_HEIGHTS dla nowych typów |
| `src/physics/bodies/animOffsets.js` | Dodanie funkcji animacji chodu dla nowych typów |

---

## FAZA 6: Kolejność implementacji (priorytet)

1. **lizard** — 5 NPC, duży wpływ (krokodyle, warany, aligatory wyglądają jak gady)
2. **crab** — 5 NPC, kraby wreszcie z kleszczami zamiast 8 nóg pająka
3. **bird** — 5 NPC, latanie ze skrzydłami (orły, gryfony, harpie, nietoperze)
4. **tentacle** — 4 NPC, unikalne macki (ośmiornice, meduzy, kraken)
5. **primate** — 2 NPC, małpy z długimi rękami
6. **fish** — 2 NPC, dedykowane ryby/płaszczki
7. **Korekty istniejących** — Minotaur→humanoid, warianty głów, pancerze żółwi/ślimaków
8. **Ragdoll tuning** — Impulsy śmierci per typ, efekty cząsteczkowe, masa ciała

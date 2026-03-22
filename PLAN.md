# Plan: Ulepszenie biomów - animacje, interaktywne POI, immersja

## Faza 1: Interaktywne elementy środowiskowe (nowe interactables z animacjami)

### 1.1 Dżungla - "Zapora na rzece" (click → animacja strumyka)
- Nowy interactable: `jungle_dam` - "Kamienna Zapora"
- Kliknięcie usuwa zaporę, uruchamia animację gwałtownego strumienia
- Efekt: fala wody zadaje 15 dmg wrogom na drodze, potem strumyk zostaje jako element scenerii
- Pliki: `biomeInteractables.js`, `biomeAnimator.js` (nowa animacja `_drawDamBreak`), `App.jsx` (obsługa)

### 1.2 Wiosna - "Zasadź drzewo" (click → drzewo wyrasta)
- Nowy interactable: `spring_sapling` - "Sadzonka Dębu"
- Kliknięcie uruchamia animację wyrastania drzewa (od sadzonki do pełnego drzewa)
- Efekt: drzewo daje buff odporności + zostaje jako dekoracja
- Pliki: `biomeInteractables.js`, `biomeAnimator.js` (`_animateTreeGrow`)

### 1.3 Zima - "Odblokuj gorące źródło" (saber → animacja pary)
- Nowy interactable: `winter_hot_spring` - "Zamarznięte Źródło"
- Tniesz lód sablem, odsłaniasz gorące źródło z parą
- Efekt: heal 4 HP + ciepła para spowalnia wrogów, źródło zostaje jako animacja
- Pliki: `biomeInteractables.js`, `biomeAnimator.js` (`_drawHotSpring`)

### 1.4 Bagno - "Zapal ognisko" (click → rozgania mgłę)
- Nowy interactable: `swamp_campfire` - "Suche Drewno"
- Kliknięcie rozpala ognisko, mgła się cofa, widoczność rośnie
- Efekt: strach na wrogów w promieniu + ognisko zostaje z animacją płomienia
- Pliki: `biomeInteractables.js`, `biomeAnimator.js` (`_drawCampfire`)

## Faza 2: Ulepszenia wizualne biomów (statyczne + animowane)

### 2.1 Lato (Summer) - brakuje życia
- Dodaj: motyle animowane (latają między kwiatami), pszczoły bzyczące
- Dodaj: leniwe chmury na niebie, promienie słoneczne przebijające
- Dodaj statyczny staw z liliami wodnymi (w rendererze)
- Biome fx: `butterflies: true, sunRays: true`

### 2.2 Zima (Winter) - brakuje dynamiki
- Dodaj: zamieć śnieżna (intensywniejszy śnieg przy silnym wietrze)
- Dodaj: pęknięcia lodu na podłożu z poświatą
- Dodaj: lodowe formacje (sople zwisające z góry ekranu)
- Biome fx: `icicles: true`

### 2.3 Wiosna (Spring) - brakuje wody
- Dodaj: mały strumyk z kamieniami (podobny do river w dżungli ale mniejszy)
- Dodaj: motyle wiosenne (pastelowe kolory)
- Dodaj: tęcza na niebie (po deszczu)
- Biome fx: `rainbow: true, springStream: true`

### 2.4 Bagno (Swamp) - brakuje grozy
- Dodaj: oczy świecące w ciemności (pary świecących punktów)
- Dodaj: bąble z bagna (bulgoczące animowane)
- Dodaj: korzenie drzew wychodzące z wody
- Biome fx: `swampEyes: true, swampBubbles: true`

### 2.5 Jaskinia grzybów (Mushroom) - brakuje atmosfery
- Dodaj: pulsujące światło z grzybów (synchronizowane)
- Dodaj: echo krople wody spadające z sufitu
- Dodaj: pajęczyny w rogach z iskrzącą rosą
- Biome fx: `caveDrops: true`

## Faza 3: Nowe POI panoramiczne (wizualne punkty)

### 3.1 Nowe POI per biom (po 1-2 dodatkowe)
- **Summer**: "Wiatrak" (windmill icon), "Pastwisko" (bull icon)
- **Island**: "Koralowa Jaskinia" (coral icon), "Latarnia" (lantern icon)
- **Mushroom**: "Podziemne Jezioro" (water icon)
- **Swamp**: "Wieża Strażnicza" (shield icon)
- **City**: "Port" (anchor icon), "Fontanna" (water icon)
- **Volcano**: "Obsydianowy Most" (rock icon)

## Faza 4: Ulepszenie istniejących animacji

### 4.1 Wzmocnij istniejące efekty
- Delfiny: dodaj splash efekty wody za nimi
- Meduzy: dodaj bioluminescencyjny ślad
- Zorza polarna: dodaj zmianę kolorów (nie tylko zielona)
- Tumbleweeds: dodaj cień pod nimi
- Latarnie miejskie: dodaj migoczący płomień

## Kolejność implementacji (TDD)

1. **Faza 2** (wizualne) - najpierw bo nie zmieniają mechanik, łatwe do weryfikacji
2. **Faza 3** (POI) - rozszerzenie istniejącego systemu
3. **Faza 1** (interaktywne) - wymaga nowych mechanik + animacji, najbardziej złożone
4. **Faza 4** (ulepszenia) - polerowanie istniejących efektów

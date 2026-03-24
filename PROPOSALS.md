# Propozycje Rozwoju Gry - Wrota Przeznaczenia

## Stan Aktualny

Gra posiada rozbudowane systemy: 17 biomów, 80+ wrogów, 5 bossów, 110+ przeszkód,
system zniszczeń (TerrainDestruction, ChainReactions, DebrisSystem, ShockwaveSystem,
DestructionCombo, StructuralCollapse, EnvironmentalHazards) - wszystko podpięte do App.jsx.

---

## 1. WIDOCZNOŚĆ SYSTEMU ZNISZCZEŃ (Priorytet: WYSOKI)

System zniszczeń istnieje w kodzie, ale gracze mogą go nie zauważać.

### 1.1 Tutorial zniszczeń
- Pierwsza walka z wyraźną beczką prochu obok grupy wrogów
- Podpowiedź: "Strzel w beczkę!" z animowaną strzałką
- Nagroda za pierwsze zniszczenie łańcuchowe

### 1.2 Wizualne wyróżnienie niszczalnych obiektów
- Subtilny puls/glow na niszczalnych obiektach (np. lekki złoty obrys)
- Ikona "pęknięcia" nad obiektami z HP < 100%
- Wyraźniejsze kolory dla eksplodujących beczek (pomarańczowy glow)
- Cząsteczki "iskier" przy beczce prochu, "kapiąca ciecz" przy beczce oleju

### 1.3 Feedback zniszczenia
- Większe, bardziej spektakularne eksplozje z screen shake
- Dźwięk proceduralny przy niszczeniu (trzask drewna, kruszenie kamienia)
- Slowmo (0.3s) przy dużych reakcjach łańcuchowych
- Tekst combo ("DEMOLKA!", "KATAKLIZM!") większy i z efektem zoom
- Licznik zniszczonych obiektów na ekranie końcowym rundy

### 1.4 Rozmieszczenie przeszkód
- Gwarantowane eksplodujące obiekty blisko ścieżek wrogów
- Klastry niszczalnych obiektów zachęcające do chain reactions
- "Puzzle zniszczeń" - strzel w beczkę → zapali drewno → zablokuje przejście

---

## 2. NOWE MECHANIKI WALKI

### 2.1 System pogody wpływający na walkę
- Deszcz: gasi pożary, wzmacnia pioruny (+30% dmg), osłabia ogień (-30%)
- Burza piaskowa: zmniejsza zasięg widzenia, pociski spowalniają
- Mgła: wrogowie tracą LOS szybciej, pułapki niewidoczne
- Śnieżyca: spowalnia wszystkich, zamraża kałuże wody

### 2.2 Interakcje elementalne z terenem
- Ogień na trawie = ściana ognia (blokada)
- Lód na wodzie = most (nowa ścieżka)
- Piorun na metalu = area stun
- Trucizna w studni = zatrute źródło leczenia

### 2.3 System fortyfikacji 2.0
- Budowanie barykad z debris po zniszczeniach
- Wzmacnianie pułapek zebranymi materiałami
- Interaktywne otoczenie: strzelanie w podpory mostu = most spada na wrogów

---

## 3. PROGRESJA I META-GRA

### 3.1 Dziennik odkrywcy
- Kolekcja zniszczonych typów obiektów
- Odblokowane synergie elementalne (fire+ice = Steam Blast itd.)
- Statystyki: łączne zniszczenia, najdłuższy chain, max combo level
- Nagrody za kamienie milowe (co 100 zniszczeń = nowy relic)

### 3.2 System reputacji frakcji
- Piracka Gwardia: bonus za zniszczenia i chaos
- Handlarze: bonus za ochronę towarów
- Alchemicy: bonus za reakcje łańcuchowe
- Wybór frakcji wpływa na dostępne reliki i najemnicy

### 3.3 Drzewo umiejętności karawany
- Gałąź ofensywna: mocniejsze pułapki, większe eksplozje
- Gałąź defensywna: silniejsze barykady, pancerz karawany
- Gałąź handlowa: lepszy loot, tańszy sklep

### 3.4 Wyzwania dzienne
- "Zniszcz 20 obiektów drewnianych jednym ogniem"
- "Osiągnij combo poziomu 7"
- "Pokonaj bossa bez niszczenia przeszkód"

---

## 4. NOWA ZAWARTOŚĆ

### 4.1 Nowe biomy
- **Wrak Latającego Statku** - pionowa mapa, grawitacja wpływa na pociski
- **Podwodne Ruiny** - spowolniony ruch, bąbelkowe pociski, koralowe przeszkody
- **Cmentarz Statków** - pełen eksplodujących beczek i łańcuchów kotwicznych

### 4.2 Nowi bossowie
- **Kapitan Demolka** - boss niszczący otoczenie, gracz musi unikać spadających gruzów
- **Duch Kuźni** - przywołuje metalowe przeszkody, odporny gdy blisko metalu
- **Kraken Portowy** - macki niszczą teren, tworząc nowe ścieżki

### 4.3 Nowe zaklęcia
- **Łańcuch Kotwiczny** - przyciąga obiekty/wrogów do punktu
- **Bomba Baryłkowa** - zamienia niszczalne obiekty w pociski
- **Trzęsienie** - niszczy wszystkie przeszkody w radius, AoE dmg z debris
- **Mur Ognia** - podpala linię obiektów organicznych

### 4.4 Nowe reliki
- **Serce Wulkanu** - zniszczone obiekty mają 20% szans na eksplozję ognia
- **Oko Burzy** - łańcuchy piorunowe +2 cele
- **Mapa Skarbów** - niszczone obiekty mają 2x szansę na loot
- **Butelka Chaosu** - losowy element przy każdym zniszczeniu

---

## 5. ULEPSZENIA TECHNICZNE

### 5.1 Optymalizacja renderingu zniszczeń
- Object pooling dla debris particles
- Batch rendering zniszczonych obiektów
- LOD (Level of Detail) - mniejsze efekty na mobile

### 5.2 Proceduralny dźwięk zniszczeń
- Unikalne dźwięki per materiał (drewno, kamień, metal, lód, kryształ)
- Crescendo dźwięku przy combo chain
- Basowy "boom" przy dużych eksplozjach z screen shake

### 5.3 Particle system 2.0
- Dym utrzymujący się po pożarach
- Iskry odbijające się od podłoża
- Kurz przy zawaleniu konstrukcji
- Efekty wodne (rozprysk, para przy ogniu+wodzie)

---

## 6. UX I CZYTELNOŚĆ

### 6.1 Minimap z niszczonymi obiektami
- Czerwone kropki = eksplodujące obiekty
- Szare = zwykłe przeszkody
- Animacja przy zniszczeniu

### 6.2 System podpowiedzi taktycznych
- "Ta beczka eksploduje!" gdy gracz celuje blisko
- Podświetlenie chain targets przy najechaniu na eksplozywny obiekt
- Preview blast radius na hover

### 6.3 Ekran podsumowania rundy
- Sekcja "Zniszczenia": obiekty, combo max, chain reactions
- Bonus XP/gold za styl zniszczeń
- Replay najlepszej reakcji łańcuchowej

---

## PRIORYTETY IMPLEMENTACJI

| Faza | Zadania | Wpływ |
|------|---------|-------|
| **Faza 1** | 1.1-1.4 (widoczność zniszczeń) | Gracze odkrywają istniejący system |
| **Faza 2** | 2.1-2.3 (nowe mechaniki walki) | Głębsza taktyka |
| **Faza 3** | 3.1-3.4 (progresja) | Długoterminowa motywacja |
| **Faza 4** | 4.1-4.4 (nowa zawartość) | Świeżość rozgrywki |
| **Faza 5** | 5.1-5.3 + 6.1-6.3 (polish) | Dopracowanie doświadczenia |

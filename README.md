# Polska Wieś — Żniwa

Przeglądarkowa gra pixel-art o pracy kombajnem na polskiej wsi. **Wersja 0.4.0** to techniczny podział dotychczasowej gry 0.3.1 na moduły JavaScript. Koszenie, sterowanie i grafika pozostały bez zamierzonych zmian.

## Uruchamianie

### Przez GitHub Pages

1. Prześlij **zawartość tego folderu** (nie sam plik ZIP) do głównego katalogu repozytorium.
2. Ustaw `Settings → Pages → Build and deployment → Deploy from a branch`, gałąź `main`, folder `/ (root)`.
3. Otwórz adres Pages pokazany w ustawieniach repozytorium.

**Ważne:** nie otwieraj `index.html` przez `file://` (dwuklik). Moduły JavaScript mogą wtedy nie zostać załadowane z powodu zabezpieczeń przeglądarki.

### Lokalnie na komputerze

W katalogu projektu uruchom prosty serwer, np.:

```bash
python -m http.server 8000
```

Potem otwórz `http://localhost:8000/`. Alternatywnie użyj rozszerzenia Live Server w VS Code.

## Sterowanie

- **W / S** — jazda do przodu / cofanie
- **A / D** — skręcanie
- **Spacja** — włączanie / wyłączanie hedera
- **T** — tempo zegara (1×, 5×, 20×)
- **M** — włączanie / wyłączanie dźwięku
- **P** — pauza
- Na telefonie dostępne są przyciski dotykowe.

## Pliki

| Plik | Odpowiedzialność |
|---|---|
| `index.html` | Canvas, elementy interfejsu, punkty zaczepienia JS |
| `style.css` | Wygląd interfejsu oraz układ mobilny |
| `src/core.js` | Wspólne dane, jednostki, stan, liczniki czasu |
| `src/map.js` | **Mapa jako dane**: graf dróg, pola, lasy, budynki, drzewa, krzewy, kolizje |
| `src/geometry.js` | Kolizje OBB / koła z wektorem wypchnięcia |
| `src/world.js` | Malowanie warstw z danych mapy (`buildWorld()`) |
| `src/vehicles.js` | Sprite kombajnu, renderer maszyn, obrys kolizji gracza |
| `src/harvest.js` | Ścinanie pszenicy, ślady i cząsteczki |
| `src/life.js` | Pojazdy NPC na grafie dróg, piesi, zwierzęta |
| `src/render.js` | Kompozycja klatek, warstwy, nakładka debug |
| `src/sound.js` | Dźwięki WebAudio |
| `src/ui.js` | HUD i ekran zakończenia |
| `src/controls.js` | Klawiatura, dotyk, pauza |
| `src/main.js` | Stały krok symulacji, kolizje, kamera, restart, diagnostyka |

## Zmiany w 0.4.0

- **Mapa jako dane (`map.js`).** Rysowanie, kolizje i trasy NPC korzystają z tych samych list. Roślinność jest rozmieszczana z regułami: nic nie rośnie na drodze, w budynku ani w polu.
- **Graf dróg.** Drogi malowane z jednego grafu (skrzyżowania bez łat), pojazdy NPC jeżdżą po nim prawą stroną i skręcają na skrzyżowaniach.
- **Kolizje.** Kombajn to trzy obrócone prostokąty (kabina, tył, heder). Zderza się z budynkami, drzewami, płotami, słupami, stawem i pojazdami, i **ześlizguje się** po przeszkodach. NPC hamują przed kombajnem, piesi go przepuszczają.
- **Warstwy.** Dachy i korony drzew rysowane są nad pojazdami; cienie pod nimi.
- **Podwórze** jest ortogonalne; brama w płocie leży na podjeździe.
- **Poprawki z 0.3.3:** brakujący import `MAXSPEED` (dźwięk zawieszał grę), pauza tylko w trakcie gry + auto-pauza przy utracie fokusu, kamera ograniczona do mapy, skalowanie całkowite (ostre piksele), stały krok czasowy 60 Hz, liczniki zamiast `RT.frame%n`, rysowanie tylko widocznego wycinka warstw.
- **F3** — nakładka debug: collidery, graf dróg, FPS.

## Znane problemy / dalej

0.4.1: skala drzew i zwierząt, jednolity rzut i wektor światła, pszenica. Zbiornik (3 t) nie zapełnia się przy polu 0,28 ha — do rozwiązania razem z rozładunkiem (0.5).

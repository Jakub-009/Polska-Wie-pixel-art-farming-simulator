# Polska Wieś — Żniwa

Przeglądarkowa gra pixel-art o pracy kombajnem na polskiej wsi. **Wersja 0.3.2** to techniczny podział dotychczasowej gry 0.3.1 na moduły JavaScript. Koszenie, sterowanie i grafika pozostały bez zamierzonych zmian.

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
| `src/core.js` | Wspólne dane, jednostki, stan i funkcje pomocnicze |
| `src/world.js` | Statyczny teren, gospodarstwo, pola, dekoracje |
| `src/vehicles.js` | Sprite kombajnu i rysowanie pojazdu |
| `src/harvest.js` | Ścinanie pszenicy, ślady i cząsteczki |
| `src/life.js` | Animowane życie wsi i pojazdy NPC |
| `src/render.js` | Kompozycja klatek i kolejność rysowania |
| `src/sound.js` | Dźwięki WebAudio |
| `src/ui.js` | HUD i ekran zakończenia |
| `src/controls.js` | Klawiatura i dotyk |
| `src/main.js` | Pętla gry, aktualizacja ruchu, restart i diagnostyka |

## Stan projektu i znane problemy

0.3.2 **nie** naprawia jeszcze zauważonych błędów mapy. To celowe: najpierw migracja działającej wersji, później poprawki na uporządkowanym kodzie.

Do naprawienia w następnej wersji: kolizje NPC z kombajnem i innymi autami, nawierzchnie i skrzyżowania, spójny dojazd do gospodarstwa, granice i obiekty świata, geometria pastwiska, rozmieszczenie dekoracji i ścieżki pieszych.

## Zasada dalszych zmian

Najpierw odtwarzalny test, potem pojedyncza poprawka i commit Git. Unikamy mieszania przebudowy architektury z przebudową mapy w jednej zmianie.

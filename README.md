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
| `src/header.js` | Zdejmowanie i zakładanie hedera (klawisz H) |
| `src/trailer.js` | Przyczepa, rura wysypowa kombajnu, rozładunek i wysyp |
| `src/life.js` | Pojazdy NPC na grafie dróg, piesi, zwierzęta |
| `src/render.js` | Kompozycja klatek, warstwy, nakładka debug |
| `src/sound.js` | Dźwięki WebAudio |
| `src/ui.js` | HUD i ekran zakończenia |
| `src/controls.js` | Klawiatura, dotyk, pauza |
| `src/main.js` | Stały krok symulacji, kolizje, kamera, restart, diagnostyka |

## Zmiany w 0.5.0 — zboże
- Kombajn: rozkładana rura wysypowa (U) sięgająca 73 px w bok, poza heder; rozładunek (J). Zbiornik jest teraz realny (0,8 t) — gdy się zapełni, koszenie staje się niemożliwe do czasu rozładunku. Z rozłożoną rurą kombajn jedzie wolniej.
- Traktor z przyczepą (2,0 t): przyczepa holowana za zaczepem, zaczep/odczep na R, wysyp na E (licznik „MAG.” w HUD). Rozładunek działa tylko, gdy koniec rury jest nad skrzynią przyczepy.
- Przesiadka V: kombajn z rozładunkiem stoi, gdy jedziesz traktorem (i odwrotnie).
- Traktor NPC na drodze wygląda tak samo jak grywalny. Drzewa poza lasem nie mają już koron nad polami.

## Zmiany w 0.4.4
- Usunięte stare rekwizyty z podwórza (palety, beczki, poidło, stojący traktor).
- Kury i ludzie uciekają przed pojazdem i nie wchodzą pod heder; ludzie nie przesuwają już maszyn.
- Jelenie i lisy wędrują po całej mapie, omijając gospodarstwo, pastwisko i drogi.
- Traktor testowy (V — przesiadka): ta sama fizyka i animacje co kombajn, szybszy, przednie koła skręcają. Drugi pojazd stoi w miejscu jako przeszkoda.
- Zoom kamery: Z, +/−, kółko myszy (całkowite skale pikseli, obraz zostaje ostry).

## Zmiany w 0.4.3
- Gospodarstwo przebudowane według szkicu: brązowy płot, wjazd od zachodu (między ogrodem a wiatą), brama północna z drogą na „drugie pole” (wkrótce), podwórze z błotem, kałużami i kurami, ogródek z domem, psem i budą, stajnia, stodoła, wiata.
- Kombajn (także z hederem) przejeżdża wszędzie po podwórzu — sprawdzone testem przejezdności.
- Nowy start: podwórze gospodarstwa. Rura rozładunkowa schowana.
- H: zdejmij/załóż heder (stań, podnieś heder SPACJĄ; zakładanie: podjedź przodem równolegle do odstawionego hedera). Bez hedera nie kosi.
- Krowy korzystają z całego pastwiska, lisy biegają przy lesie, kury i pies na gospodarstwie.

## Zmiany w 0.4.2

- **Proporcje pojazdów:** kombajn węższy (nadwozie 3,4 m, z kołami ~4 m, heder 7,3 m), auto 4,5 m, traktor 2,8×5 m; obrysy kolizji dopasowane.
- **Bieżnik** kręci się zgodnie z kierunkiem jazdy, z prędkością maszyny; skręt tylnych kół zgodny z modelem jazdy (0,6 rad).
- **Ostre obracanie sprite'ów:** pojazdy i zwierzęta rysowane „głową do góry” na płótnie roboczym, potem obracane bez wygładzania.
- **Słupy** co ~150 px wzdłuż całej drogi głównej, z przewodami (warstwa nadziemna) i kolizjami.
- **Stado 9 krów** (pasie się / idzie, płynny obrót, trzymanie się razem, omijanie).
- **Jelenie:** 3 grupy (7 sztuk) wędrują przez otwarte pola, żerują i uciekają przed maszyną.

## Zmiany w 0.4.1

- **Skala:** kombajn w skali 1:1 (12 px/m, bez `scale()`, więc bez „mixeli”); drzewa większe (`TREE_SCALE` w `map.js`, rysowane w docelowym rozmiarze), krzewy ×1,4; drogi szersze (5 m).
- **Jeden rzut:** krowy, jeleń i piesi rysowani z góry.
- **Jeden wektor światła** `LIGHT` (core.js): cienie budynków, drzew, słupów, aut i kombajnu padają w tę samą stronę; cienie pojazdów liczone w układzie świata, nie obracają się z maszyną.
- **Pszenica i ściernisko:** gładki szum barwy zamiast kwadratów, poziome rzędy z kłosami zamiast pionowych kresek.

## Zmiany w 0.4.0

- **Mapa jako dane (`map.js`).** Rysowanie, kolizje i trasy NPC korzystają z tych samych list. Roślinność jest rozmieszczana z regułami: nic nie rośnie na drodze, w budynku ani w polu.
- **Graf dróg.** Drogi malowane z jednego grafu (skrzyżowania bez łat), pojazdy NPC jeżdżą po nim prawą stroną i skręcają na skrzyżowaniach.
- **Kolizje.** Kombajn to trzy obrócone prostokąty (kabina, tył, heder). Zderza się z budynkami, drzewami, płotami, słupami, stawem i pojazdami, i **ześlizguje się** po przeszkodach. NPC hamują przed kombajnem, piesi go przepuszczają.
- **Warstwy.** Dachy i korony drzew rysowane są nad pojazdami; cienie pod nimi.
- **Podwórze** jest ortogonalne; brama w płocie leży na podjeździe.
- **Poprawki z 0.3.3:** brakujący import `MAXSPEED` (dźwięk zawieszał grę), pauza tylko w trakcie gry + auto-pauza przy utracie fokusu, kamera ograniczona do mapy, skalowanie całkowite (ostre piksele), stały krok czasowy 60 Hz, liczniki zamiast `RT.frame%n`, rysowanie tylko widocznego wycinka warstw.
- **F3** — nakładka debug: collidery, graf dróg, FPS.

## Znane problemy / dalej

0.4.3: przebudowa gospodarstwa (obwodnica, plac manewrowy, test przejezdności). Zbiornik (3 t) nie zapełnia się przy polu 0,28 ha — do rozwiązania razem z rozładunkiem (0.5).

## 0.6.1
- Droga dolna jest główną (największy ruch: auta, radiowóz, autobus PKS, rowerzysta): chodnik po północnej stronie, przystanek PKS przy skrzyżowaniu (wiata na chodniku, słupek i ławka po drugiej stronie), przejście dla pieszych, wiejskie latarnie na drewnianych słupach, tylko przerywana oś, łaty i pęknięcia na asfalcie, rów po południowej stronie.
- Droga pionowa jest wiejska: asfalt bez oznakowania, pobocza z żwiru, rowy z przepustami, rzadkie latarnie, mały ruch, piesi na poboczu. Bez pętli i przystanku — wychodzi za mapę.
- Wszystkie słupy energetyczne są drewniane (zastrzały, izolatory); linie wzdłuż obu dróg, bocian na gnieździe przy drodze bocznej.
- Dodatki: kapliczka przydrożna, tablica „LIPY” na wjazdach, znaki ostrzegawcze „zwierzyna”, gęsi na trawie, rowerzyści, autobus kursuje z przerwami.

## 0.6.0
- Mapa powiększona do 2300×1840 (wschodni pas z polami i drogą polną, południowy pas z drogą główną).
- Nowy układ dróg: główna dwupasmowa asfaltowa na dole (przerywana linia, linie krawędziowe), pionowa boczna asfaltowa z chodnikiem, latarniami, przejściem dla pieszych i pętlą z przystankiem PKS; drogi polne z kolejami, znaki STOP na dojazdach, utwardzony wjazd na podwórze.
- Ruch: główna — samochody, radiowóz POLICJA i autobus PKS; boczna — pojedyncze auta i piesi na chodniku; polne — traktory i kombajn.
- Agregat uprawowy i siewnik (zaczep R, SPACJA opuszcza/podnosi). Stany pola: 0 zboże, 1 ściernisko, 2 zaorane, 3 obsiane, 4 wschody, 5 młode zboże. Klawisz G przyspiesza wzrost (test).
- Chlewik z wybiegiem i trzema świniami przy północno-wschodnim narożniku gospodarstwa; betonowy plac przy silosach; więcej kałuż.
- Nowe słupy energetyczne, gniazdo i bocian, latarnie, krzaki przeniesione na górną krawędź pola.
- Zapisy z 0.5.x są wczytywane (agregat i siewnik dodawane automatycznie).

## 0.5.3
- Ostrość: linie 1 px (płoty, szlaki, rzędy) wyrównane do piksela, utwardzone krawędzie obiektów na warstwie dolnej (gospodarstwo, pastwisko, płoty).

## 0.5.2
- Silosy zbożowe typu BIN (blacha falista, stożkowy dach, drabina, właz, wywietrznik), kosz zasypowy i przenośnik ślimakowy. Zboże wysypane poza koszem przepada.
- Wózek z hederem (H), przyczepa zbożowa z odczepianiem (R), holowanie przez traktor i kombajn, NPC holują przyczepy/wózki.
- Sarny zamiast jeleni (grupy 1–3, A*, wykrywanie zacięć), zwierzęta i ludzie omijają stojące pojazdy.
- Zapis gry (autozapis co 20 s, Kontynuuj), panel ustawień (Esc), panel podpowiedzi, B = odblokuj, F1 = pomoc.
- Ślady kolein, plusk w kałużach, wyostrzony obraz (obrys sprite'ów), mniejsze samochody.
- Nowe pliki: tow.js, obstacles.js, nav.js, silo.js, markers.js, save.js.
- Klawisze: R zaczep, E wysyp, K sprzedaż, B odblokuj, U/J ślimak, V pojazd.
- Na później (0.6.0): pora dnia, agregat uprawowy.

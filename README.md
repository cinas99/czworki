# Czwórki

Codzienna polska łamigłówka słowna w stylu Connections: 16 słów, 4 ukryte grupy, 4 błędy.

Czysty HTML/CSS/JS, bez backendu i bez budowania. Działa na GitHub Pages.

## Pliki
- `index.html`, `style.css`, `app.js`: gra
- `zagadki.csv`: **baza zagadek** (otwórz na GitHubie, żeby zobaczyć ją jako tabelę; edytuj ołówkiem)
- `jak-grac.html`, `polityka-prywatnosci.html`: podstrony wymagane przez AdSense (uzupełnij pola w [nawiasach])
- `ads.txt`: wpisz swój identyfikator wydawcy po akceptacji AdSense
- `CNAME`: Twoja domena

## Uruchomienie lokalne
```
python3 -m http.server 8000
```
i otwórz http://localhost:8000

## Publikacja na GitHub Pages z własną domeną
1. Settings → Pages → Source: „Deploy from a branch”, branch `main`, folder `/ (root)`.
2. W Settings → Pages wpisz domenę w polu „Custom domain” (GitHub sam utworzy plik `CNAME`).
3. U rejestratora domeny ustaw rekordy DNS:
   - `A` dla `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - `CNAME` dla `www`: `TWOJ-LOGIN.github.io`
4. Po kilku minutach–godzinach zaznacz w Settings → Pages „Enforce HTTPS”.

## Dodawanie zagadek
Każda zagadka to 4 wiersze w `zagadki.csv` z tą samą datą:

| kolumna | co wpisać |
|---|---|
| `data` | dzień publikacji, np. `2026-12-24` (pierwsza data w pliku = zagadka #1) |
| `kolor` | `zielony` (łatwa), `zolty`, `pomaranczowy`, `czerwony` (podchwytliwa) |
| `kategoria` | nazwa grupy pokazywana po odgadnięciu |
| `slowo1`–`slowo4` | słowa (wielkość liter bez znaczenia) |
| `zdjecie` | tytuł artykułu z polskiej Wikipedii (np. `Sroka zwyczajna`) albo pełny adres URL zdjęcia; puste = gra spróbuje znaleźć zdjęcie po słowach z grupy |

Zasady: każde słowo w danym dniu musi należeć do dokładnie jednej grupy; nie używaj przecinków w polach. Jeśli na dany dzień nie ma zagadki, gra powtarza starsze, więc trzymaj zapas.

## Reklamy (AdSense)
Po akceptacji wklej skrypt AdSense w `<head>` w `index.html`, a kod jednostki reklamowej w `#ad-slot` (pokazuje się dopiero po zakończeniu gry). W UE wymagany jest baner zgody z certyfikowanej platformy CMP (np. „Prywatność i wiadomości” w panelu AdSense).

## Tryb admina (testowanie)
- `?admin`: włącza w tej przeglądarce przycisk „Zagraj od nowa” po zakończeniu gry (zapamiętywane)
- `?admin=off`: wyłącza go
- `?reset`: czyści dzisiejszą grę; `?reset=all` czyści też statystyki

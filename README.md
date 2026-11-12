# Czwórki

Codzienna polska łamigłówka słowna w stylu Connections: 16 słów, 4 ukryte grupy, 4 błędy.

Czysty HTML/CSS/JS, bez backendu i bez budowania. Działa na GitHub Pages.

## Pliki
- `index.html`, `style.css`, `app.js`: gra
- `puzzles.js`: zagadki i data startu (`START_DATE`); zagadka #1 = ten dzień
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
2. W pliku `CNAME` wpisz domenę (np. `czworki.pl`).
3. U rejestratora domeny ustaw rekordy DNS:
   - `A` dla `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - `CNAME` dla `www`: `TWOJ-LOGIN.github.io`
4. Po kilku minutach–godzinach zaznacz w Settings → Pages „Enforce HTTPS”.

## Dodawanie zagadek
Dopisz kolejne pozycje do tablicy `PUZZLES` w `puzzles.js`. Kolejność grup = trudność (żółta, zielona, niebieska, fioletowa). Każde słowo musi należeć do dokładnie jednej grupy. Gdy zagadki się skończą, gra zaczyna je powtarzać od początku, więc trzymaj zapas.

## Reklamy (AdSense)
Po akceptacji wklej skrypt AdSense w `<head>` w `index.html`, a kod jednostki reklamowej w `#ad-slot` (pokazuje się dopiero po zakończeniu gry). W UE wymagany jest baner zgody z certyfikowanej platformy CMP (np. „Prywatność i wiadomości” w panelu AdSense).

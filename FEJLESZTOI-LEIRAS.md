# Fejlesztői leírás — HÖK Naptár Kezelő

Ez a belső szerkesztő, amivel a HÖK eseménynaptárát kezeljük. Két különálló dolog
dolgozik együtt: maga a szerkesztő (statikus oldal, ez a repo), és a publikus HÖK
weblap, ami ugyanazt az adatot olvassa. Köztük a **Firebase** az összekötő.

## Hogyan áll össze

Az adat a Firebase Realtime Database-ben él. A szerkesztőben minden mentés egyből a
felhőbe ír (nincs külön „feltöltés" gomb), és aki épp nyitva tartja az oldalt, az
élőben látja a változást. A weblap pedig oldalbetöltéskor lehúzza a Firebase-ből az
aktív félév eseményeit, és kirajzolja.

A lényeg, amiért az egész így épül: több területi felelős dolgozhat egyszerre, mert
minden esemény külön rekord a Firebase-ben — senki nem írja felül a másikét.

Adatáramlás: szerkesztő → (írás eseményenként) → Firebase → (olvasás) → weblap.

## Fájlok (szerkesztő)

Belépőpont az `index.html`. Ez tölti be CDN-ről a FullCalendart és a Flatpickrt, majd
a `js/app.js`-t ES-modulként. Build nincs, minden natív ES-modul.

`js/`

- `app.js` — a fő vezérlő (`TimelineApp`). Itt fut össze minden: indítás, az összes
  gomb/mező kötése, a Firebase-belépés és az élő figyelő, a csúszópanel nyitása/zárása,
  a félévkezelő és a varázsló. Ez a legnagyobb fájl.
- `firebase.js` — a Firebase-réteg. Belépés (közös jelszó), élő figyelő (`onValue`),
  eseményenkénti írás (`set`/`remove`), az új esemény id-ja atomi számlálóból
  (`runTransaction`). Itt van a fa ↔ `{semester, categories, events}` oda-vissza
  alakítás is.
- `firebase-config.js` — a Firebase projekt nyilvános configja + a közös szerkesztő-fiók
  e-mailje. (Nyilvános érték, nem titok — a védelmet a jelszó és a DB-szabályok adják.)
- `state.js` — az alkalmazásállapot (`AppState`), observer mintával. A mutátorok
  (esemény/kategória/félév hozzáad–módosít–töröl) innen szólnak ki a Firebase-rétegnek
  a `setSyncHandler`-en keresztül.
- `ui.js` — minden HTML-renderelés: fejléc, csúszópanel, űrlap, kategóriakártyák,
  félévkezelő, modálisok.
- `calendar-view.js` — a havi naptár (FullCalendar), kattintás és drag-drop.
- `timeline-view.js` — az idővonal (hónapokra bontott kártyák).
- `event-manager.js` — esemény mentés/törlés validációval.
- `file-handler.js` — a JSON-letöltés (Letöltés gomb) és a kimeneti formátum
  összeállítása.
- `semester-config.js` — a félév-státusz (kézi: tárolt érték) és a dátum-segédek.
- `icons.js` — SVG ikonok.
- `utils.js` — dátumformázás, naptár-konverzió.

`css/`

- `main.css` — dizájn-tokenek (színek, Inter betű), gombok, modálisok, belépőképernyő,
  toast, mobil-alaplayout.
- `header.css` — a fejléc.
- `sidebar.css` — a csúszópanel, az űrlap, a kategóriakártyák.
- `calendar.css` — FullCalendar testreszabás.
- `timeline.css` — az idővonal kártyák.

## A Firebase adatfa

```
semesters/
  2026-tavasz/
    meta/        név, nameEn, startDate, endDate, status, statusOverride
    categories/  <id>: { name, nameEn, color, hungarianOnly?, englishOnly? }
    events/      <id>: { title, titleEn, date, endDate?, category, location, link, ... }
    _counter     az utolsó kiosztott esemény-id
```

Minden félév külön ág. Egy esemény = egy rekord az `events` alatt, ahol az id a kulcs.
Új id-t a `_counter` tranzakció ad, így két egyszerre felvitt esemény sem ütközik.

## A weblap oldala

A weblap repójában (`HOK_weboldal`) az `assets/js/events-calendar.js` a lényeg. A
`loadEventsData()` a Firebase REST-jéről (`.../semesters.json`) húzza le az adatot, a
`pickActiveSemester()` kiválasztja a kézzel aktívnak jelölt félevet, a `treeToPayload()`
pedig visszaalakítja arra a `{semester, categories, events}` formára, amit a weblap eddig
is várt. Ha a felhő nem elérhető, visszaesik a régi statikus
`assets/data/events-calendar.json`-ra, hogy az oldal sose maradjon üres.

## Amit jó tudni

- Belépés: közös jelszó (Firebase Email/Password, egyetlen fiók). A jelszó a csapat
  megosztott fájljában van, a kódba nem kerül.
- A félév-státusz kézi: a Félévek ablakban Aktiválás/Archiválás állítja. Egyszerre egy
  aktív van, és a weblap mindig az aktívat mutatja. A dátumok csak információ, nem
  váltanak státuszt maguktól.
- A weblap statikus tartalék-fájlja (`events-calendar.json`) csak vészhelyzetre van;
  idővel elavul, érdemes néha felülírni egy friss exporttal (a szerkesztő Letöltés gombja).
- Nincs build/CI: statikus oldal, GitHub Pages-ről megy. A `.nojekyll` azért kell, hogy
  a Pages ne nyúljon a fájlokhoz.

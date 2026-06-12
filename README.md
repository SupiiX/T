# HÖK Naptár Kezelő

Belső eszköz a HÖK eseménynaptárának szerkesztéséhez. Az adatok a **Firebase**-ben
élnek, a **HÖK weblap pedig élőben onnan olvassa** az aktív félév eseményeit —
nincs külön „feltöltés", amit beírsz és mentesz, az hamarosan megjelenik a weblapon is.

## Belépés

Az eszköz egy **közös jelszóval** védett (csak bejelentkezve lehet szerkeszteni,
olvasni bárki tudja a weblapon). A jelszó a csapat **megosztott jelszó-fájljában**
van — írd be a belépőképernyőn.

## Esemény felvitele / szerkesztése

- **Új esemény**: a fejléc jobb felső **„Új esemény"** gombja, vagy kattints egy
  napra a naptárban → jobbról bejön a szerkesztő panel.
- **Meglévő szerkesztése**: kattints az eseményre a naptárban vagy az idővonalon.
- Add meg a címet, válassz **kategóriát** (= terület), dátumot, helyszínt stb.,
  majd **Mentés**. A mentés azonnal a felhőbe ír.
- A **„Csak magyar oldal"** kapcsolóval elrejted az angol mezőket (ha az esemény
  csak a magyar oldalra való).

## Kategóriák (területek)

A kategóriák a területeket jelölik (pl. Tanulmányi, Rendezvények, HÖK, ISC), külön
színnel. A fejléc **fogaskerék** gombjával éred el: **Félév és kategóriák**.

## Félévek kezelése (fejléc → „Félévek")

A státuszt **te vezérled** (nem a dátumokból számolódik – azok csak információ):

- **Aktív**: ezt mutatja a weblap. Mindig pontosan egy aktív van, és addig marad
  aktív, amíg át nem váltasz.
- **Tervezett**: előkészítés alatt, a weblap még nem mutatja.
- **Archivált**: lezárt, korábbi félév (megőrizve).

Új félév létrehozása → **Tervezett**. Amikor kész, kattints **„Aktiválás"** →
élővé válik, a korábbi aktív automatikusan **archiválttá** válik.
A **„Betölt"** egy másik félévet nyit meg szerkesztésre. A **„Szerkesztés alatt"**
felirat azt jelzi, melyik félév van épp megnyitva.

## Biztonsági mentés

A fejléc **letöltés** ikonjával bármikor lementhetsz egy JSON-pillanatképet.
Érdemes időnként megtenni (a közös fiók miatt egy véletlen törlés végleges).

## Technikai megjegyzések

- Firebase projekt: `timeline-d447b` (Realtime Database + Email/jelszó hitelesítés).
- A webes Firebase-config (`js/firebase-config.js`) nyilvános azonosítókat tartalmaz,
  ez rendben van – a védelmet a Realtime Database „rules" + a közös jelszó adja.
- A weblap (`HOK_weboldal/assets/js/events-calendar.js`) a Firebase REST-en keresztül
  olvassa az aktív félevet; ha a felhő nem elérhető, visszaesik a statikus
  `assets/data/events-calendar.json`-ra.

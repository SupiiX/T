# Egyetemi Naptár Kezelő

Egyszerű, böngésző-alapú naptár alkalmazás egyetemi események kezeléséhez.

## ⚠️ FONTOS - Hogyan használd

Ez az alkalmazás **helyi web szervert igényel**! NE nyisd meg közvetlenül az `index.html` fájlt (file:// protokoll), mert nem fog működni!

### Módszer 1: Python (ajánlott)

```bash
# A projekt mappájában futtasd:
python3 -m http.server 8000

# Vagy Python 2-vel:
python -m SimpleHTTPServer 8000
```

Majd nyisd meg a böngészőben: **http://localhost:8000**

### Módszer 2: VS Code Live Server

1. Telepítsd a "Live Server" extension-t VS Code-ban
2. Jobb klikk az `index.html` fájlon
3. Válaszd: "Open with Live Server"

### Módszer 3: Node.js http-server

```bash
npx http-server -p 8000
```

Majd nyisd meg a böngészőben: **http://localhost:8000**

## 🚀 Funkciók

- 📅 **Naptár nézet** - FullCalendar alapú, interaktív havi nézet
- 📋 **Idővonal nézet** - Kronológikus lista az eseményekről
- 🎨 **Kategóriák** - Színkódolt események (Tanulmányi, Bulik, Sport, Adminisztratív)
- 📝 **Események szerkesztése** - Hozzáadás, módosítás, törlés
- 🌍 **Kétnyelvű** - Magyar és angol mezők támogatása
- 💾 **Import/Export** - JSON fájl betöltés és mentés

## 📁 Projekt struktúra

```
T/
├── index.html          # Fő HTML fájl
├── data.json          # Alapértelmezett esemény adatok
├── css/               # Stíluslapok
│   ├── main.css
│   ├── header.css
│   ├── sidebar.css
│   ├── calendar.css
│   └── timeline.css
└── js/                # JavaScript modulok
    ├── app.js         # Fő alkalmazás vezérlő
    ├── state.js       # Állapot kezelés
    ├── ui.js          # UI renderelés
    ├── calendar-view.js
    ├── timeline-view.js
    ├── file-handler.js
    ├── event-manager.js
    ├── icons.js
    └── utils.js
```

## 🐛 Hibaelhárítás

### "undefined undefined" hiba
- Ellenőrizd, hogy **helyi web szervert** használsz-e (ne file:// protokoll!)
- Nyisd meg a böngésző Developer Tools-t (F12) és nézd meg a Console-t
- Keress hibákat a fetch kérésnél vagy a data.json betöltésénél

### Az adatok nem töltődnek be
- Ellenőrizd a böngésző console-t (F12)
- Nézd meg, hogy a `data.json` fájl létezik-e
- Győződj meg róla, hogy a JSON fájl valid (nincs szintaxis hiba)

### FullCalendar hibák
- Ellenőrizd, hogy van-e internet kapcsolat (a FullCalendar CDN-ről töltődik be)
- Nézd meg a Network tabot a Developer Tools-ban

## 📝 Adatformátum

A `data.json` fájl szerkezete:

```json
{
  "semester": {
    "id": "2025-tavasz",
    "name": "2025 Tavaszi félév",
    "startDate": "2025-02-01",
    "endDate": "2025-06-30"
  },
  "categories": [
    {
      "id": "tanulmanyi",
      "name": "Tanulmányi",
      "color": "#55282e"
    }
  ],
  "events": [
    {
      "id": 1,
      "title": "Esemény neve",
      "date": "2025-02-03",
      "category": "tanulmanyi",
      "description": "Esemény leírása",
      "location": "Helyszín"
    }
  ]
}
```

## 💡 Tippek

- Kattints egy napra a naptárban új esemény hozzáadásához
- Kattints egy eseményre a szerkesztéséhez
- Húzd az eseményeket a naptárban új dátumra helyezéshez
- Használd a "JSON Letöltés" gombot az adatok mentéséhez
- Használd a "JSON Betöltés" gombot új adatok importálásához

## 🔧 Technológiák

- Vanilla JavaScript (ES6 modulok)
- FullCalendar 6.1.20
- CSS3
- HTML5

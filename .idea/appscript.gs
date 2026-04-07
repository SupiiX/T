// ============================================================
// Google Apps Script – Naptár Kezelő – Backend Translator
// ============================================================
// Az adatok strukturált Google Sheets tabokban tárolódnak:
//   [sheetName]              → Events táblázat
//   [sheetName]_Categories  → Categories táblázat
//   [sheetName]_Meta        → Szemeszter metadata (1 sor)
//   _index                  → Szemeszter lista (JSON, változatlan)
//
// Beállítás:
//   1. Nyisd meg: script.google.com → Új projekt
//   2. Illeszd be ezt a kódot
//   3. Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone
//   4. Az így kapott URL-t add meg az alkalmazásban (⚙ gomb)
// ============================================================

var INDEX_SHEET = '_index';

// ── Oszlopdefiníciók ───────────────────────────────────────

var EVENT_HEADERS = [
  'id', 'title', 'titleEn', 'category', 'date', 'endDate',
  'location', 'locationEn', 'description', 'descriptionEn',
  'link', 'hungarianOnly'
];

var CATEGORY_HEADERS = [
  'id', 'name', 'nameEn', 'color', 'hungarianOnly', 'englishOnly'
];

var META_HEADERS = [
  'id', 'name', 'nameEn', 'startDate', 'endDate', 'status'
];

// ── _index segédfüggvények ─────────────────────────────────

function getIndexData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(INDEX_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(INDEX_SHEET);
    sheet.getRange(1, 1).setValue('[]');
  }
  var raw = sheet.getRange(1, 1).getValue();
  try { return JSON.parse(raw || '[]'); } catch (e) { return []; }
}

function saveIndexData(indexData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(INDEX_SHEET);
  if (!sheet) sheet = ss.insertSheet(INDEX_SHEET);
  sheet.getRange(1, 1).setValue(JSON.stringify(indexData));
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Strukturált tab segédfüggvények ───────────────────────

/**
 * Visszaadja (és szükség esetén létrehozza) a 3 strukturált tabot.
 * A fejlécsorokat is inicializálja ha új a sheet.
 */
function getOrCreateStructuredSheets(ss, sheetName) {
  var evName  = sheetName;
  var catName = sheetName + '_Categories';
  var metName = sheetName + '_Meta';

  var evSheet  = ss.getSheetByName(evName);
  var catSheet = ss.getSheetByName(catName);
  var metSheet = ss.getSheetByName(metName);

  if (!evSheet) {
    evSheet = ss.insertSheet(evName);
    evSheet.getRange(1, 1, 1, EVENT_HEADERS.length).setValues([EVENT_HEADERS]);
    evSheet.getRange(1, 1, 1, EVENT_HEADERS.length).setFontWeight('bold');
  }
  if (!catSheet) {
    catSheet = ss.insertSheet(catName);
    catSheet.getRange(1, 1, 1, CATEGORY_HEADERS.length).setValues([CATEGORY_HEADERS]);
    catSheet.getRange(1, 1, 1, CATEGORY_HEADERS.length).setFontWeight('bold');
  }
  if (!metSheet) {
    metSheet = ss.insertSheet(metName);
    metSheet.getRange(1, 1, 1, META_HEADERS.length).setValues([META_HEADERS]);
    metSheet.getRange(1, 1, 1, META_HEADERS.length).setFontWeight('bold');
  }

  return { evSheet: evSheet, catSheet: catSheet, metSheet: metSheet };
}

/**
 * Törli a 2. sortól az összes adatsort, majd batch-írja az új sorokat.
 * Ha az 1. sor nem tartalmazza a helyes fejléceket (pl. régi JSON-blob formátum),
 * törli a sheet teljes tartalmát és újraírja a fejlécsort.
 * @param {Sheet} sheet
 * @param {string[]} headers - oszlopnevek (sorrendben)
 * @param {Object[]} items   - objektum tömb
 */
function writeRows(sheet, headers, items) {
  // Fejlécsor ellenőrzése – ha hiányzik vagy eltér (pl. régi JSON blob az A1-ben)
  var existingHeader = sheet.getRange(1, 1).getValue();
  if (existingHeader !== headers[0]) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  // Adatsorok törlése (2. sortól)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  if (!items || items.length === 0) return;

  var rows = items.map(function (item) {
    return headers.map(function (h) {
      var v = item[h];
      if (v === undefined || v === null) return '';
      // Boolean → 'TRUE'/'FALSE' string, hogy a Sheets ne konvertálja máshogy
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return String(v);
    });
  });

  // Fontos: '@' (plain text) formátum ELŐBB, hogy a Sheets ne konvertálja
  // az ID-kat és category referenciákat számokká (pl. '1' → 1).
  // Enélkül cat.id === event.category összehasonlítás mindig false lenne.
  var range = sheet.getRange(2, 1, rows.length, headers.length);
  range.setNumberFormat('@');
  range.setValues(rows);
}

/**
 * Olvassa a 2. sortól az adatsorokat és visszaad egy objektum tömböt.
 * Üres sorokat (ahol az első oszlop üres) kihagyja.
 * @param {Sheet} sheet
 * @param {string[]} headers
 * @returns {Object[]}
 */
function readRows(sheet, headers) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var result = [];

  values.forEach(function (row) {
    // Üres sor kihagyása (első oszlop üres)
    if (row[0] === '' || row[0] === null || row[0] === undefined) return;

    var obj = {};
    headers.forEach(function (h, i) {
      var val = row[i];
      // Boolean visszaállítása (writeRows 'TRUE'/'FALSE'-ként menti)
      if (val === 'TRUE' || val === true)  { obj[h] = true;  return; }
      if (val === 'FALSE' || val === false) { obj[h] = false; return; }
      // Üres cella → kihagyás (frontend cleanEvent/cleanCategory logikájával összhangban)
      if (val === '' || val === null || val === undefined) return;
      // Minden más: string (setNumberFormat('@') miatt mindig string jön vissza,
      // de biztonság kedvéért explicit String() konverzió)
      obj[h] = String(val);
    });
    result.push(obj);
  });

  return result;
}

/**
 * Írja a szemeszter metadata sort (META_HEADERS szerint).
 * Fejlécet is ellenőrzi, szükség esetén (pl. régi formátum) újraírja.
 */
function writeMetaRow(metSheet, semester) {
  var existingHeader = metSheet.getRange(1, 1).getValue();
  if (existingHeader !== META_HEADERS[0]) {
    metSheet.clearContents();
    metSheet.getRange(1, 1, 1, META_HEADERS.length).setValues([META_HEADERS]);
    metSheet.getRange(1, 1, 1, META_HEADERS.length).setFontWeight('bold');
  }
  var lastRow = metSheet.getLastRow();
  if (lastRow > 1) {
    metSheet.deleteRows(2, lastRow - 1);
  }
  if (!semester) return;
  var row = META_HEADERS.map(function (h) {
    var v = semester[h];
    return (v === undefined || v === null) ? '' : String(v);
  });
  var metRange = metSheet.getRange(2, 1, 1, META_HEADERS.length);
  metRange.setNumberFormat('@');
  metRange.setValues([row]);
}

/**
 * Olvassa vissza a szemeszter metadata sort.
 */
function readMetaRow(metSheet) {
  if (!metSheet) return null;
  var lastRow = metSheet.getLastRow();
  if (lastRow < 2) return null;
  var row = metSheet.getRange(2, 1, 1, META_HEADERS.length).getValues()[0];
  var obj = {};
  META_HEADERS.forEach(function (h, i) {
    if (row[i] !== '') obj[h] = String(row[i]);
  });
  return Object.keys(obj).length > 0 ? obj : null;
}

// ── Aktív félév meghatározása ──────────────────────────────

function getActiveSheetName() {
  var index = getIndexData();
  for (var i = 0; i < index.length; i++) {
    if (index[i].status === 'active') return index[i].sheet;
  }
  return 'OrarendData'; // backward compat
}

// ── GET ────────────────────────────────────────────────────

function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action;

    // Félév lista visszaadása (_index)
    if (action === 'list') {
      return jsonResponse(getIndexData());
    }

    // Adott (vagy aktív) félév betöltése
    var sheetName = params.sheet;
    if (!sheetName || sheetName === 'active') {
      sheetName = getActiveSheetName();
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = loadStructured(ss, sheetName);

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

/**
 * Beolvassa a strukturált tabokat és visszaad egy {semester, events, categories} objektumot.
 * Ha a strukturált formátum nem létezik (régi JSON-blob formátum), fallback az A1-re.
 */
function loadStructured(ss, sheetName) {
  var evSheet  = ss.getSheetByName(sheetName);
  var catSheet = ss.getSheetByName(sheetName + '_Categories');
  var metSheet = ss.getSheetByName(sheetName + '_Meta');

  // Backward compat: ha nincs _Meta sheet, ez régi formátum → A1-ből olvas
  var isLegacy = !metSheet && evSheet;
  if (isLegacy) {
    var raw = evSheet.getRange(1, 1).getValue();
    try { return JSON.parse(raw || '{}'); } catch (e2) { return {}; }
  }

  if (!evSheet) return {};

  var events     = readRows(evSheet,  EVENT_HEADERS);
  var categories = readRows(catSheet, CATEGORY_HEADERS);
  var semester   = readMetaRow(metSheet);

  return {
    semester:   semester   || undefined,
    categories: categories,
    events:     events
  };
}

// ── POST ───────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;
    var ss      = SpreadsheetApp.getActiveSpreadsheet();

    // ── Félév létrehozása / regisztrálása ─────────────────
    if (action === 'create') {
      var existing = ss.getSheetByName(payload.sheet);
      if (!existing) {
        // Csak új sheet esetén inicializáljuk
        var sheets = getOrCreateStructuredSheets(ss, payload.sheet);
        if (payload.meta) {
          writeMetaRow(sheets.metSheet, payload.meta);
        }
      }
      // _index frissítése (migration-safe)
      var index = getIndexData();
      index = index.filter(function (s) { return s.sheet !== payload.sheet; });
      index.push(payload.meta);
      saveIndexData(index);
      return jsonResponse({ status: 'ok' });
    }

    // ── Státusz beállítása ─────────────────────────────────
    if (action === 'setStatus') {
      var index = getIndexData();
      if (payload.status === 'active') {
        index = index.map(function (s) {
          if (s.status === 'active') s.status = 'archived';
          return s;
        });
      }
      index = index.map(function (s) {
        if (s.sheet === payload.sheet) s.status = payload.status;
        return s;
      });
      saveIndexData(index);
      return jsonResponse({ status: 'ok' });
    }

    // ── Félév törlése ──────────────────────────────────────
    if (action === 'deleteSemester') {
      var sheetToDel = ss.getSheetByName(payload.sheet);
      if (sheetToDel) ss.deleteSheet(sheetToDel);
      var afterDel = getIndexData().filter(function (s) { return s.sheet !== payload.sheet; });
      saveIndexData(afterDel);
      return jsonResponse({ status: 'ok' });
    }

    // ── Félév adatainak mentése ────────────────────────────
    if (action === 'save') {
      var data;
      try { data = JSON.parse(payload.data); } catch (pe) { data = {}; }

      var sheets = getOrCreateStructuredSheets(ss, payload.sheet);
      writeRows(sheets.evSheet,  EVENT_HEADERS,    data.events     || []);
      writeRows(sheets.catSheet, CATEGORY_HEADERS, data.categories || []);
      writeMetaRow(sheets.metSheet, data.semester || payload.meta);

      // _index metadata frissítése
      if (payload.meta) {
        var index = getIndexData();
        var found = false;
        index = index.map(function (s) {
          if (s.sheet === payload.sheet) {
            for (var k in payload.meta) s[k] = payload.meta[k];
            found = true;
          }
          return s;
        });
        if (!found) {
          var entry = { sheet: payload.sheet };
          for (var k in payload.meta) entry[k] = payload.meta[k];
          index.push(entry);
        }
        saveIndexData(index);
      }
      return jsonResponse({ status: 'ok' });
    }

    // ── Legacy POST (régi formátum, nincs action mező) ────
    // Az aktív szemeszter sheet-jébe strukturáltan menti
    var activeName = getActiveSheetName();
    var legacyData;
    try { legacyData = JSON.parse(e.postData.contents); } catch (le) { legacyData = {}; }
    var legacySheets = getOrCreateStructuredSheets(ss, activeName);
    writeRows(legacySheets.evSheet,  EVENT_HEADERS,    legacyData.events     || []);
    writeRows(legacySheets.catSheet, CATEGORY_HEADERS, legacyData.categories || []);
    writeMetaRow(legacySheets.metSheet, legacyData.semester);
    return jsonResponse({ status: 'ok' });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

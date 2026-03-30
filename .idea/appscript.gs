// ============================================================
// Google Apps Script – Naptár Kezelő – Több féléves felhő mentés
// ============================================================
// Beállítás:
//   1. Nyisd meg: script.google.com → Új projekt
//   2. Illeszd be ezt a kódot
//   3. Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone
//   4. Az így kapott URL-t add meg az alkalmazásban (⚙ gomb)
// ============================================================

var INDEX_SHEET = '_index';

// ── Segédfüggvények ────────────────────────────────────────

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

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET ────────────────────────────────────────────────────

function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action;
    var sheetName = params.sheet;

    // Félév lista visszaadása
    if (action === 'list') {
      return jsonResponse(getIndexData());
    }

    // Adott félév betöltése (vagy az aktív)
    if (!sheetName || sheetName === 'active') {
      var index = getIndexData();
      var active = null;
      for (var i = 0; i < index.length; i++) {
        if (index[i].status === 'active') { active = index[i]; break; }
      }
      sheetName = active ? active.sheet : 'OrarendData'; // backward compat
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return jsonResponse({});

    var data = sheet.getRange(1, 1).getValue();
    return ContentService
      .createTextOutput(data || '{}')
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── POST ───────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    // ── Félév létrehozása / regisztrálása ─────────────────
    if (action === 'create') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var existing = ss.getSheetByName(payload.sheet);
      if (!existing) {
        // Csak új sheet esetén inicializáljuk üres adattal
        var newSheet = ss.insertSheet(payload.sheet);
        var initData = { semester: payload.meta, events: [], categories: [] };
        newSheet.getRange(1, 1).setValue(JSON.stringify(initData));
      }
      // Mindig frissítjük az _index-et (migration-safe)
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
        // Jelenlegi aktív → archivált
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

    // ── Félév adatainak mentése ────────────────────────────
    if (action === 'save') {
      var sheet = getOrCreateSheet(payload.sheet);
      sheet.getRange(1, 1).setValue(payload.data);

      // Index metadata frissítése ha küldtek
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

    // ── Legacy POST (régi formátum, backward compat) ───────
    var index = getIndexData();
    var active = null;
    for (var i = 0; i < index.length; i++) {
      if (index[i].status === 'active') { active = index[i]; break; }
    }
    var sheetName = active ? active.sheet : 'OrarendData';
    var sheet = getOrCreateSheet(sheetName);
    sheet.getRange(1, 1).setValue(e.postData.contents);

    return jsonResponse({ status: 'ok' });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

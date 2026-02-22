// ============================================================
// Google Apps Script – Órarend felhő mentés/betöltés
// ============================================================
// Beállítás:
//   1. Nyisd meg: script.google.com → Új projekt
//   2. Illeszd be ezt a kódot
//   3. Futtasd egyszer a createSheet() függvényt (engedélyezd a jogosultságokat)
//   4. Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone       ← FONTOS: nem "Anyone with Google account"
//   5. Az így kapott URL-t add meg az alkalmazásban (⚙ gomb)
// ============================================================

var SHEET_NAME = 'OrarendData';

function createSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_NAME)) {
    ss.insertSheet(SHEET_NAME);
  }
  Logger.log('Sheet kész: ' + SHEET_NAME);
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    var data = sheet.getRange(1, 1).getValue();
    return ContentService
      .createTextOutput(data || '{}')
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    var payload = e.postData.contents;
    sheet.getRange(1, 1).setValue(payload);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

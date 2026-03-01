function setupCoachMatchSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {
    'Deltagare': [
      'id','visningsnamn','slutdatum','fritext','aktiv','arkivdatum',
      'matchraknare','kategori_restaurang','kategori_stad','kategori_truckkort',
      'kategori_nystartsjobb','kategori_bkorkort','kategori_extra_1',
      'kategori_extra_1_namn','skapad','uppdaterad'
    ],
    'CV': ['id','deltagare_id','rubrik','cv_text','skapad','uppdaterad'],
    'Tjänster': [
      'id','rekryterare','foretag','tjanst','krav','aktiv',
      'sorteringsordning','skapad','uppdaterad'
    ],
    'Matchningar': [
      'id','deltagare_id','tjanst_id','rekryterare','ai_motivering',
      'ai_motivering_redigerad','korning_datum','ny_denna_korning'
    ]
  };

  Object.entries(sheets).forEach(([namn, kolumner]) => {
    let sheet = ss.getSheetByName(namn);
    if (!sheet) sheet = ss.insertSheet(namn);
    sheet.getRange(1, 1, 1, kolumner.length).setValues([kolumner]);
    sheet.getRange(1, 1, 1, kolumner.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  SpreadsheetApp.getUi().alert(
    'CoachMatch Sheet är redo!\n\n' +
    'Kopiera Sheet-ID från URL-fältet\n' +
    '(strängen mellan /d/ och /edit)\n' +
    'och lägg in som VITE_GOOGLE_SHEET_ID i din .env-fil.'
  );
}

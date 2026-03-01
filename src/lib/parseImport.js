import { normalize, safeTrim, generateId, nowTimestamp } from './utils.js';
import { parseISO, isValid } from 'date-fns';

// ─── Datum-parsning ─────────────────────────────────────────────────────────

function parseDate(raw) {
  const s = safeTrim(raw);
  if (!s) return null;

  // ISO: 2026-07-12 eller 2026-07-12 00:00:00
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    const d = parseISO(isoMatch[1]);
    return isValid(d) ? isoMatch[1] : null;
  }

  // Europeiskt: 12/7/2026 eller 12-7-2026
  const euroMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (euroMatch) {
    const [, day, month, year] = euroMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (isValid(d)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

// ─── TSV-parser (hanterar Excel-citering med inbäddade radbrytningar) ───────

/**
 * Parsar en TSV-sträng enligt Excel-konventionen:
 *   – Fält som innehåller \t, \n eller " omsluts av dubbla citattecken
 *   – Inbäddade " i ett citerat fält kodas som ""
 *   – Inbäddade radbrytningar i ett citerat fält ersätts med mellanslag
 * Returnerar en array av rader, där varje rad är en array av fältsträngar.
 * Tomma rader (alla fält tomma) filtreras bort.
 */
function parseTSVRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (ch === '\n') {
        field += ' '; // inbäddad radbrytning → mellanslag
      } else {
        field += ch;
      }
    } else {
      if (ch === '"' && field === '') {
        inQuotes = true;
      } else if (ch === '\t') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        if (row.some((f) => f.trim() !== '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  // Sista raden (ingen avslutande \n)
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);

  return rows;
}

// ─── Deltagarimport ─────────────────────────────────────────────────────────

/**
 * Parsar inklistrad text med format: visningsnamn\tslutdatum
 * Returnerar { rows: [{visningsnamn, slutdatum}], errors: [string] }
 */
export function parseDeltagareText(text) {
  const rows = [];
  const errors = [];

  const tsvRows = parseTSVRows(text);

  tsvRows.forEach((parts, i) => {
    if (parts.length < 2) {
      errors.push(`Rad ${i + 1}: Saknar tabbseparator – hittade "${parts[0].slice(0, 40)}"`);
      return;
    }

    const visningsnamn = safeTrim(parts[0]);
    // Slutdatum är alltid sista kolumnen – fungerar även om Excel har extra kolumner i mitten
    const slutdatumRaw = safeTrim(parts[parts.length - 1]);

    if (!visningsnamn) {
      errors.push(`Rad ${i + 1}: Tomt namn`);
      return;
    }

    const slutdatum = parseDate(slutdatumRaw);
    if (!slutdatum) {
      // Rubrikrader (t.ex. "Förnamn / Slutdatum") hoppas över tyst
      if (normalize(slutdatumRaw) === 'slutdatum' || normalize(visningsnamn) === 'förnamn') return;
      errors.push(`Rad ${i + 1}: Kunde inte tolka datum "${slutdatumRaw}" för "${visningsnamn}"`);
      return;
    }

    rows.push({ visningsnamn, slutdatum });
  });

  return { rows, errors };
}

/**
 * Smart merge: jämför nya rader mot befintliga deltagare.
 * Matchning på normalize(visningsnamn).
 *
 * Returnerar:
 *   added:    nya Deltagare-objekt (klara att spara i DB)
 *   updated:  { id, slutdatum } för befintliga med ändrat datum
 *   unchanged: antal oförändrade
 */
export function mergeDeltagare(newRows, existing) {
  const added = [];
  const updated = [];
  let unchanged = 0;

  const existingMap = new Map(
    existing.map((d) => [normalize(d.visningsnamn), d])
  );

  for (const row of newRows) {
    const key = normalize(row.visningsnamn);
    const match = existingMap.get(key);

    if (!match) {
      const now = nowTimestamp();
      added.push({
        id: generateId(),
        visningsnamn: row.visningsnamn,
        slutdatum: row.slutdatum,
        fritext: '',
        aktiv: true,
        arkivdatum: null,
        matchraknare: 0,
        kategori_restaurang: false,
        kategori_stad: false,
        kategori_truckkort: false,
        kategori_nystartsjobb: false,
        kategori_bkorkort: false,
        kategori_extra_1: false,
        kategori_extra_1_namn: '',
        skapad: now,
        uppdaterad: now,
      });
    } else if (match.slutdatum !== row.slutdatum) {
      updated.push({ id: match.id, slutdatum: row.slutdatum });
    } else {
      unchanged++;
    }
  }

  return { added, updated, unchanged };
}

// ─── Tjänsteimport ──────────────────────────────────────────────────────────

/**
 * Ord som identifierar en rubrikrad i tjänsteimport.
 * Om foretag eller tjanst matchar → hoppa över raden tyst.
 */
const TJANST_HEADER_WORDS = new Set([
  'företag', 'company',
  'tjänst', 'position', 'jobb', 'roll', 'titel',
]);

/**
 * Parsar inklistrad text med format: företag\ttjänst[\tkrav]
 * Returnerar { rows: [{foretag, tjanst, krav}], errors: [string] }
 */
export function parseTjansterText(text) {
  const rows = [];
  const errors = [];

  const tsvRows = parseTSVRows(text);

  tsvRows.forEach((parts, i) => {
    if (parts.length < 2) {
      errors.push(`Rad ${i + 1}: Saknar tabbseparator`);
      return;
    }

    const foretag = safeTrim(parts[0]);
    const tjanst = safeTrim(parts[1]);
    const krav = parts[2] ? safeTrim(parts[2]) : '';

    if (!foretag || !tjanst) {
      errors.push(`Rad ${i + 1}: Företag och tjänst får inte vara tomma`);
      return;
    }

    // Hoppa över rubrikrader tyst (t.ex. "Företag\tTjänst\tKrav" från Excel)
    if (TJANST_HEADER_WORDS.has(normalize(foretag)) || TJANST_HEADER_WORDS.has(normalize(tjanst))) {
      return;
    }

    rows.push({ foretag, tjanst, krav, sorteringsordning: i + 1 });
  });

  return { rows, errors };
}

/**
 * Smart merge för tjänster per rekryterare.
 * Matchning på normalize(foretag + tjanst).
 *
 * Returnerar:
 *   added:    nya Tjanst-objekt
 *   updated:  { id, krav } för befintliga med ändrade krav
 *   deactivated: [id] – finns i existing men inte i new (sätt aktiv=FALSE)
 *   unchanged: antal
 */
export function mergeTjanster(newRows, existing, rekryterare) {
  const added = [];
  const updated = [];
  const deactivated = [];
  let unchanged = 0;

  const newKey = (r) => normalize(r.foretag + '|' + r.tjanst);
  const newMap = new Map(newRows.map((r) => [newKey(r), r]));
  const existingMap = new Map(existing.map((e) => [normalize(e.foretag + '|' + e.tjanst), e]));

  // Nya eller uppdaterade
  for (const row of newRows) {
    const key = newKey(row);
    const match = existingMap.get(key);

    if (!match) {
      const now = nowTimestamp();
      added.push({
        id: generateId(),
        rekryterare,
        foretag: row.foretag,
        tjanst: row.tjanst,
        krav: row.krav,
        aktiv: true,
        sorteringsordning: row.sorteringsordning,
        skapad: now,
        uppdaterad: now,
      });
    } else if (normalize(match.krav ?? '') !== normalize(row.krav ?? '')) {
      updated.push({ id: match.id, krav: row.krav });
    } else {
      unchanged++;
    }
  }

  // Existerande som saknas i ny import → deaktivera
  for (const e of existing) {
    const key = normalize(e.foretag + '|' + e.tjanst);
    if (!newMap.has(key)) {
      deactivated.push(e.id);
    }
  }

  return { added, updated, deactivated, unchanged };
}

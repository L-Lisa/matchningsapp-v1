import { normalize, safeTrim, generateId, nowTimestamp, toSheetsBoolean } from './utils.js';
import { parseISO, isValid, parse } from 'date-fns';

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

// ─── Deltagarimport ─────────────────────────────────────────────────────────

/**
 * Parsar inklistrad text med format: visningsnamn\tslutdatum
 * Returnerar { rows: [{visningsnamn, slutdatum}], errors: [string] }
 */
export function parseDeltagareText(text) {
  const rows = [];
  const errors = [];

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  lines.forEach((line, i) => {
    const parts = line.split('\t');
    if (parts.length < 2) {
      errors.push(`Rad ${i + 1}: Saknar tabbseparator – hittade "${line.slice(0, 40)}"`);
      return;
    }

    const visningsnamn = safeTrim(parts[0]);
    const slutdatumRaw = safeTrim(parts[1]);

    if (!visningsnamn) {
      errors.push(`Rad ${i + 1}: Tomt namn`);
      return;
    }

    const slutdatum = parseDate(slutdatumRaw);
    if (!slutdatum) {
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
 *   added:    nya Deltagare-objekt (klara att skriva till Sheets)
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
        aktiv: toSheetsBoolean(true),
        arkivdatum: '',
        matchraknare: 0,
        kategori_restaurang: toSheetsBoolean(false),
        kategori_stad: toSheetsBoolean(false),
        kategori_truckkort: toSheetsBoolean(false),
        kategori_nystartsjobb: toSheetsBoolean(false),
        kategori_bkorkort: toSheetsBoolean(false),
        kategori_extra_1: toSheetsBoolean(false),
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
 * Parsar inklistrad text med format: företag\ttjänst[\tkrav]
 * Returnerar { rows: [{foretag, tjanst, krav}], errors: [string] }
 */
export function parseTjansterText(text) {
  const rows = [];
  const errors = [];

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  lines.forEach((line, i) => {
    const parts = line.split('\t');
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
        aktiv: toSheetsBoolean(true),
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

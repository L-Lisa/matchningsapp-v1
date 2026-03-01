import { getGoogleToken } from './auth.js';
import { sleep } from './utils.js';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const MAX_RETRIES = 3;
const CACHE_PREFIX = 'cm_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

// ─── HTTP-hjälp ─────────────────────────────────────────────────────────────

async function sheetsRequest(method, path, body = null, attempt = 1) {
  const token = getGoogleToken();
  if (!token) throw new Error('Inte inloggad med Google. Logga in på nytt.');

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const url = `${BASE_URL}/${SHEET_ID}${path}`;
  const res = await fetch(url, options);

  if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
    await sleep(Math.pow(2, attempt) * 1000);
    return sheetsRequest(method, path, body, attempt + 1);
  }

  if (res.status === 401) {
    throw new Error('Google-sessionen har löpt ut. Logga in på nytt.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Sheets API svarade med ${res.status}`);
  }

  return res.json();
}

// ─── Cache ───────────────────────────────────────────────────────────────────

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, expires: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    // sessionStorage full – fortsätt utan cache
  }
}

export function cacheClear(key) {
  sessionStorage.removeItem(CACHE_PREFIX + key);
}

export function cacheClearAll() {
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .forEach((k) => sessionStorage.removeItem(k));
}

// ─── Läsning ─────────────────────────────────────────────────────────────────

async function readSheet(sheetName, useCache = true) {
  if (useCache) {
    const cached = cacheGet(sheetName);
    if (cached) return cached;
  }

  const data = await sheetsRequest('GET', `/values/${encodeURIComponent(sheetName)}`);
  const rows = data.values ?? [];
  if (rows.length === 0) return [];

  const [headers, ...dataRows] = rows;
  const result = dataRows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });

  if (useCache) cacheSet(sheetName, result);
  return result;
}

// ─── Skrivning ───────────────────────────────────────────────────────────────

// Lägg till rader (append)
async function appendRows(sheetName, rows, headers) {
  if (rows.length === 0) return;
  const values = rows.map((row) => headers.map((h) => row[h] ?? ''));
  await sheetsRequest('POST', `/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values,
  });
  cacheClear(sheetName);
}

// Skriv om hela fliken (används inte – vi använder append + delete)
async function clearAndWrite(sheetName, headers, rows) {
  // Rensa all data utom header
  await sheetsRequest('POST', `/values/${encodeURIComponent(sheetName)}!A2:ZZ:clear`, {});

  if (rows.length > 0) {
    const values = rows.map((row) => headers.map((h) => row[h] ?? ''));
    await sheetsRequest('POST', `/values/${encodeURIComponent(sheetName)}!A2:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values,
    });
  }
  cacheClear(sheetName);
}

// ─── Deltagare ───────────────────────────────────────────────────────────────

const DELTAGARE_HEADERS = [
  'id','visningsnamn','slutdatum','fritext','aktiv','arkivdatum',
  'matchraknare','kategori_restaurang','kategori_stad','kategori_truckkort',
  'kategori_nystartsjobb','kategori_bkorkort','kategori_extra_1',
  'kategori_extra_1_namn','skapad','uppdaterad',
];

export async function getDeltagare() {
  return readSheet('Deltagare');
}

export async function addDeltagare(deltagareList) {
  await appendRows('Deltagare', deltagareList, DELTAGARE_HEADERS);
}

export async function updateDeltagare(all) {
  await clearAndWrite('Deltagare', DELTAGARE_HEADERS, all);
}

// ─── CV ──────────────────────────────────────────────────────────────────────

const CV_HEADERS = ['id','deltagare_id','rubrik','cv_text','skapad','uppdaterad'];

export async function getCVForDeltagare(deltagareId) {
  const all = await readSheet('CV');
  return all.filter((r) => r.deltagare_id === deltagareId);
}

export async function getAllCV() {
  return readSheet('CV');
}

export async function addCV(cvObj) {
  await appendRows('CV', [cvObj], CV_HEADERS);
}

export async function updateAllCV(all) {
  await clearAndWrite('CV', CV_HEADERS, all);
}

// ─── Tjänster ────────────────────────────────────────────────────────────────

const TJANSTER_HEADERS = [
  'id','rekryterare','foretag','tjanst','krav','aktiv',
  'sorteringsordning','skapad','uppdaterad',
];

export async function getTjanster() {
  return readSheet('Tjänster');
}

export async function addTjanster(list) {
  await appendRows('Tjänster', list, TJANSTER_HEADERS);
}

export async function updateAllTjanster(all) {
  await clearAndWrite('Tjänster', TJANSTER_HEADERS, all);
}

// ─── Matchningar ─────────────────────────────────────────────────────────────

const MATCHNINGAR_HEADERS = [
  'id','deltagare_id','tjanst_id','rekryterare','ai_motivering',
  'ai_motivering_redigerad','korning_datum','ny_denna_korning',
];

export async function getMatchningar() {
  return readSheet('Matchningar', false); // aldrig cachad – ändras ofta
}

/**
 * Ersätt alla matchningar för en rekryterare med nya.
 * Läser, filtrerar bort rekryterarens rader, lägger till nya, skriver allt.
 */
export async function replaceMatchningarForRekryterare(rekryterare, newMatchningar) {
  const all = await getMatchningar();
  const other = all.filter((m) => m.rekryterare !== rekryterare);
  await clearAndWrite('Matchningar', MATCHNINGAR_HEADERS, [...other, ...newMatchningar]);
}

export async function updateMotivering(matchningId, nyMotivering) {
  const all = await getMatchningar();
  const updated = all.map((m) =>
    m.id === matchningId
      ? { ...m, ai_motivering: nyMotivering, ai_motivering_redigerad: 'TRUE' }
      : m
  );
  await clearAndWrite('Matchningar', MATCHNINGAR_HEADERS, updated);
}

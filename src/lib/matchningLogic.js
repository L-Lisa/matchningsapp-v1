// Ren, testbar logik – inga env-variabler eller externa anrop

import { parseBoolean } from './utils.js';

// ─── Kategori-keywords ────────────────────────────────────────────────────────

export const KATEGORI_KEYWORDS = {
  restaurang:   ['restaurang', 'kök', 'köksbiträde', 'kock', 'servitör',
                 'servitris', 'disk', 'café', 'mat', 'gastronomi', 'food'],
  stad:         ['städ', 'lokalvård', 'rengöring', 'clean', 'städare', 'hemstäd'],
  truckkort:    ['truck', 'lager', 'logistik', 'warehouse', 'truckkort'],
  nystartsjobb: ['nystartsjobb', 'nystart'],
  bkorkort:             ['körkort', 'b-körkort', 'b körkort', 'krav körkort'],
  utvecklingsgarantin:  ['utvecklingsgarantin', 'garanti'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasKeywordMatch(text, keywords) {
  if (!text) return false;
  const t = text.toLowerCase();
  return keywords.some((kw) => t.includes(kw.toLowerCase()));
}

// ─── Keyword-filter ──────────────────────────────────────────────────────────

/**
 * Avgör om en deltagare ska inkluderas för en given tjänst.
 *
 * Regler:
 * 1. Deltagare utan CV matchas aldrig.
 * 2. Deltagare med minst en kategori inkluderas bara om någon kategori
 *    matchar tjänsten (minskar onödiga API-anrop).
 * 3. Deltagare utan kategorier men med CV inkluderas alltid –
 *    Claude avgör sedan om det är en riktig match via INGEN_MATCH.
 *
 * @param {object} deltagare - med _cvTexter: [{rubrik, cv_text}]
 * @param {object} tjanst - { foretag, tjanst, krav }
 * @param {object} extraKategoriKeywords - ytterligare keywords från inställningar
 */
export function passesKeywordFilter(deltagare, tjanst, extraKategoriKeywords = {}) {
  // Regel 1: inga CV = inga matchningar
  if (!deltagare._cvTexter || deltagare._cvTexter.length === 0) return false;

  const allKeywords = { ...KATEGORI_KEYWORDS, ...extraKategoriKeywords };
  const tjanstText = `${tjanst.tjanst} ${tjanst.foretag} ${tjanst.krav ?? ''}`.toLowerCase();

  const kategoriKeys = [
    ['kategori_restaurang', 'restaurang'],
    ['kategori_stad',       'stad'],
    ['kategori_truckkort',  'truckkort'],
    ['kategori_nystartsjobb', 'nystartsjobb'],
    ['kategori_bkorkort',             'bkorkort'],
    ['kategori_utvecklingsgarantin',  'utvecklingsgarantin'],
  ];

  const harNagonKategori =
    kategoriKeys.some(([field]) => parseBoolean(deltagare[field])) ||
    parseBoolean(deltagare.kategori_extra_1);

  // Regel 2: deltagare med kategorier – inkludera bara om minst en matchar
  if (harNagonKategori) {
    const standardMatch = kategoriKeys.some(([field, key]) => {
      if (!parseBoolean(deltagare[field])) return false;
      return hasKeywordMatch(tjanstText, allKeywords[key] ?? []);
    });
    if (standardMatch) return true;

    if (parseBoolean(deltagare.kategori_extra_1)) {
      const extraNamn = (deltagare.kategori_extra_1_namn ?? '').toLowerCase();
      const extraKw = allKeywords[extraNamn] ?? [];
      if (hasKeywordMatch(tjanstText, extraKw)) return true;
    }

    return false; // har kategorier men ingen matchar denna tjänst
  }

  // Regel 3: inga kategorier + har CV → inkludera alltid, Claude avgör
  return true;
}

// ─── Prompt-byggare ──────────────────────────────────────────────────────────

/**
 * Signal som Claude ska returnera exakt när personen INTE passar tjänsten.
 * Behålls för bakåtkompatibilitet men används ej i den nya multi-prompt-flödet.
 */
export const INGEN_MATCH_SIGNAL = 'INGEN_MATCH';

/** @deprecated Använd buildMultiPrompt istället */
export function buildPrompt(deltagare, cvTexter, tjanst) {
  const cvSektioner = cvTexter
    .map((cv) => `${cv.rubrik}\n${cv.cv_text}`)
    .join('\n\n---\n\n');

  return `Du är en expert på att matcha jobbsökande med tjänster i Sverige.

DELTAGARE: ${deltagare.visningsnamn}
FRITEXT OM DELTAGAREN: ${deltagare.fritext?.trim() || 'Ingen extra information'}
CV-TEXTER:
${cvSektioner}

TJÄNST: ${tjanst.tjanst} på ${tjanst.foretag}
KRAV: ${tjanst.krav?.trim() || 'Inga specificerade krav'}

Bedöm om denna person verkligen passar för tjänsten baserat på CV och krav.

Om personen PASSAR: skriv 1–2 meningar på svenska som presenterar personen för rekryteraren. Var specifik om konkret erfarenhet eller kompetens. Skriv direkt, utan inledning, som om du presenterar personen.
Om personen INTE PASSAR: svara med exakt texten INGEN_MATCH och inget annat.`;
}

/**
 * Bygger en prompt som ber Claude utvärdera en person mot FLERA tjänster på en gång.
 * Claude returnerar bara de tjänster som matchar, med motivering per rad.
 *
 * Svar-format: "MATCH [1]: motivering" per matchande tjänst, ingenting för icke-matcher.
 *
 * @param {object} deltagare - med visningsnamn, fritext
 * @param {Array}  cvTexter  - [{rubrik, cv_text}]
 * @param {Array}  tjanster  - [{id, tjanst, foretag, krav}] – max 30 per anrop
 */
export function buildMultiPrompt(deltagare, cvTexter, tjanster) {
  const cvSektioner = cvTexter
    .map((cv) => `${cv.rubrik}\n${cv.cv_text}`)
    .join('\n\n---\n\n');

  const tjanstLista = tjanster
    .map(
      (t, i) =>
        `[${i + 1}] ${t.tjanst} – ${t.foretag}\nKrav: ${t.krav?.trim() || 'Inga specificerade krav'}`
    )
    .join('\n\n');

  return `Du är expert på jobbmatchning i Sverige.

DELTAGARE: ${deltagare.visningsnamn}
FRITEXT: ${deltagare.fritext?.trim() || 'Ingen extra information'}
CV:
${cvSektioner}

Nedan finns ${tjanster.length} lediga tjänster. Avgör vilka denna person passar för baserat på CV och krav.

Instruktioner:
- För varje tjänst personen PASSAR: skriv exakt "MATCH [nummer]: [1-2 meningar på svenska som presenterar personen specifikt för denna roll. Var konkret om vilken erfarenhet eller kompetens som är relevant.]"
- För tjänster personen INTE passar: skriv ingenting alls.
- Om personen inte passar någon tjänst: svara med exakt "INGA_MATCHER"

TJÄNSTER:
${tjanstLista}`;
}

/**
 * Parsar Claudes svar från buildMultiPrompt.
 * Returnerar lista med {tjanst_id, motivering} för de tjänster som matchade.
 *
 * Hanterar:
 * - MATCH [1]: text  (med hakparenteser)
 * - MATCH 1: text    (utan hakparenteser)
 * - Flerraders motiveringar (konkateneras med mellanslag)
 * - Extra text från Claude före/efter MATCH-rader ignoreras
 *
 * @param {string} text     - Claudes råsvar
 * @param {Array}  tjanster - samma array som skickades till buildMultiPrompt
 */
export function parseMultiResponse(text, tjanster) {
  if (!text || !text.trim() || text.trim() === 'INGA_MATCHER') return [];

  const matches = [];
  const MATCH_LINE = /^MATCH\s+\[?(\d+)\]?:\s*(.*)$/i;
  const lines = text.split('\n');
  let current = null; // { tjanst_id, motivering }

  for (const line of lines) {
    const trimmed = line.trim();
    const hit = trimmed.match(MATCH_LINE);

    if (hit) {
      if (current) matches.push(current); // spara föregående
      const idx = parseInt(hit[1], 10) - 1; // 1-baserat → 0-baserat
      if (idx >= 0 && idx < tjanster.length) {
        current = { tjanst_id: tjanster[idx].id, motivering: hit[2].trim() };
      } else {
        current = null; // ogiltigt index – ignorera
      }
    } else if (current && trimmed && !trimmed.startsWith('INGA')) {
      // Fortsättningsrad till föregående MATCH
      current.motivering += ' ' + trimmed;
    }
  }

  if (current) matches.push(current);
  return matches;
}

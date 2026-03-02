// Ren, testbar logik – inga env-variabler eller externa anrop

import { parseBoolean } from './utils.js';

// ─── Kategori-keywords ────────────────────────────────────────────────────────

export const KATEGORI_KEYWORDS = {
  restaurang:           ['restaurang', 'kök', 'köksbiträde', 'kock', 'servitör',
                         'servitris', 'disk', 'café', 'mat', 'gastronomi', 'food'],
  stad:                 ['städ', 'lokalvård', 'rengöring', 'clean', 'städare', 'hemstäd'],
  truckkort:            ['truck', 'lager', 'logistik', 'warehouse', 'truckkort'],
  nystartsjobb:         ['nystartsjobb', 'nystart'],
  bkorkort:             ['körkort', 'b-körkort', 'b körkort', 'krav körkort'],
  utvecklingsgarantin:  ['utvecklingsgarantin', 'garanti'],
};

const KATEGORI_LABELS = {
  kategori_restaurang:          'Restaurang',
  kategori_stad:                'Städ',
  kategori_truckkort:           'Truckkort',
  kategori_nystartsjobb:        'Nystartsjobb',
  kategori_bkorkort:            'B-körkort',
  kategori_utvecklingsgarantin: 'Utvecklingsgarantin',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasKeywordMatch(text, keywords) {
  if (!text) return false;
  const t = text.toLowerCase();
  return keywords.some((kw) => t.includes(kw.toLowerCase()));
}

/** Returnerar en kommaseparerad sträng med aktiva kategorier för en deltagare. */
function formatKategorier(deltagare) {
  return Object.entries(KATEGORI_LABELS)
    .filter(([field]) => parseBoolean(deltagare[field]))
    .map(([, label]) => label)
    .join(', ');
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
    ['kategori_restaurang',          'restaurang'],
    ['kategori_stad',                'stad'],
    ['kategori_truckkort',           'truckkort'],
    ['kategori_nystartsjobb',        'nystartsjobb'],
    ['kategori_bkorkort',            'bkorkort'],
    ['kategori_utvecklingsgarantin', 'utvecklingsgarantin'],
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

// ─── ROM-systeminstruktion ────────────────────────────────────────────────────

const ROM_SYSTEM = `Du är en erfaren jobbcoach och rekryteringsexpert inom Rusta och Matcha-programmet (ROM). Deltagarna är arbetsföra och aktivt jobbsökande – nyanlända, långtidsarbetslösa, unga utan erfarenhet eller personer i omställning.

Matchningsprinciper:
- Inkludera alla med relevant erfarenhet, även överkvalificerade – coachen väljer bort
- Räkna in transferbara färdigheter – liknande roller och branscher gäller
- HÅRDA krav (truckkort, B-körkort, specifika certifikat): matcha bara om personen uppfyller dem
- MJUKA krav (t.ex. "restaurangerfarenhet"): matcha om personen har liknande relevant erfarenhet

Motiveringen du skriver:
- Rikta dig till rekryteraren som ska ringa om jobbet
- 1–2 meningar på svenska, konkret och säljande för just denna roll
- Lyft specifik erfarenhet eller egenskap som gör personen relevant
- Om personen har nystartsjobb-status: nämn det (ekonomisk fördel för arbetsgivaren)`;

// ─── Prompt-byggare ──────────────────────────────────────────────────────────

/**
 * Signal som Claude ska returnera exakt när personen INTE passar tjänsten.
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
 * Inkluderar ROM-kontext, kategorier och uppdaterad kalibrering.
 *
 * Svar-format: "MATCH [1]: motivering" per matchande tjänst, ingenting för icke-matcher.
 *
 * @param {object} deltagare - med visningsnamn, fritext och kategori-fält
 * @param {Array}  cvTexter  - [{rubrik, cv_text}]
 * @param {Array}  tjanster  - [{id, tjanst, foretag, krav}] – max 30 per anrop
 */
export function buildMultiPrompt(deltagare, cvTexter, tjanster, extraKontext = '') {
  const cvSektioner = cvTexter
    .map((cv) => `${cv.rubrik}\n${cv.cv_text}`)
    .join('\n\n---\n\n');

  const kategorierText = formatKategorier(deltagare);

  const tjanstLista = tjanster
    .map(
      (t, i) =>
        `[${i + 1}] ${t.tjanst} – ${t.foretag}\nKrav: ${t.krav?.trim() || 'Inga specificerade krav'}`
    )
    .join('\n\n');

  return `${ROM_SYSTEM}

DELTAGARE: ${deltagare.visningsnamn}${kategorierText ? `\nKATEGORIER: ${kategorierText}` : ''}
FRITEXT: ${deltagare.fritext?.trim() || 'Ingen extra information'}${extraKontext?.trim() ? `\nEXTRA KONTEXT: ${extraKontext.trim()}` : ''}
CV:
${cvSektioner}

Nedan finns ${tjanster.length} lediga tjänster. Avgör vilka denna person passar för.

Instruktioner:
- För varje tjänst personen PASSAR: skriv exakt "MATCH [nummer]: [motivering]"
- För tjänster personen INTE passar: skriv ingenting alls.
- Om personen inte passar någon tjänst: svara med exakt "INGA_MATCHER"

TJÄNSTER:
${tjanstLista}`;
}

/**
 * Bygger en prompt för scenario B: ett jobb mot flera deltagare.
 *
 * @param {object} tjanst         - { tjanst, foretag, krav, rekryterare }
 * @param {Array}  deltagareList  - deltagare med _cvTexter, fritext och kategori-fält
 * @param {string} extraKontext   - valfri extra info från Lisa
 */
export function buildScenarioTjanstPrompt(tjanst, deltagareList, extraKontext = '') {
  const deltagareLista = deltagareList
    .map((d, i) => {
      const cvSektioner = (d._cvTexter ?? [])
        .map((cv) => `${cv.rubrik}\n${cv.cv_text}`)
        .join('\n---\n');
      const kategorierText = formatKategorier(d);
      return [
        `[${i + 1}] ${d.visningsnamn}`,
        kategorierText ? `Kategorier: ${kategorierText}` : null,
        d.fritext?.trim() ? `Anteckningar: ${d.fritext.trim()}` : null,
        `CV:\n${cvSektioner || '(inget CV)'}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n════════\n\n');

  return `${ROM_SYSTEM}

TJÄNST: ${tjanst.tjanst} på ${tjanst.foretag}
KRAV: ${tjanst.krav?.trim() || 'Inga specificerade krav'}${extraKontext?.trim() ? `\nEXTRA KONTEXT: ${extraKontext.trim()}` : ''}

Nedan finns ${deltagareList.length} deltagare. Avgör vilka som passar för denna tjänst.

Instruktioner:
- För varje deltagare som PASSAR: skriv exakt "MATCH [nummer]: [motivering]"
- För deltagare som INTE passar: skriv ingenting alls.
- Om ingen passar: svara med exakt "INGA_MATCHER"

DELTAGARE:
${deltagareLista}`;
}

// ─── Svar-parsers ─────────────────────────────────────────────────────────────

/**
 * Intern generisk parser: parsar "MATCH [n]: text" och mappar index → items[n-1].id
 */
function parseMatchLines(text, items) {
  if (!text || !text.trim() || text.trim() === 'INGA_MATCHER') return [];

  const results = [];
  const MATCH_LINE = /^MATCH\s+\[?(\d+)\]?:\s*(.*)$/i;
  const lines = text.split('\n');
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const hit = trimmed.match(MATCH_LINE);

    if (hit) {
      if (current) results.push(current);
      const idx = parseInt(hit[1], 10) - 1;
      if (idx >= 0 && idx < items.length) {
        current = { id: items[idx].id, motivering: hit[2].trim() };
      } else {
        current = null;
      }
    } else if (current && trimmed && !trimmed.startsWith('INGA')) {
      current.motivering += ' ' + trimmed;
    }
  }

  if (current) results.push(current);
  return results;
}

/**
 * Parsar Claudes svar från buildMultiPrompt.
 * Returnerar lista med {tjanst_id, motivering}.
 *
 * @param {string} text     - Claudes råsvar
 * @param {Array}  tjanster - samma array som skickades till buildMultiPrompt
 */
export function parseMultiResponse(text, tjanster) {
  return parseMatchLines(text, tjanster).map(({ id, motivering }) => ({
    tjanst_id: id,
    motivering,
  }));
}

/**
 * Parsar Claudes svar från buildScenarioTjanstPrompt.
 * Returnerar lista med {deltagare_id, motivering}.
 *
 * @param {string} text          - Claudes råsvar
 * @param {Array}  deltagareList - samma array som skickades till buildScenarioTjanstPrompt
 */
export function parseScenarioTjanstResponse(text, deltagareList) {
  return parseMatchLines(text, deltagareList).map(({ id, motivering }) => ({
    deltagare_id: id,
    motivering,
  }));
}

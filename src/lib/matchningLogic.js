// Ren, testbar logik – inga env-variabler eller externa anrop

import { parseBoolean } from './utils.js';

// ─── Kategori-keywords ────────────────────────────────────────────────────────

export const KATEGORI_KEYWORDS = {
  restaurang:   ['restaurang', 'kök', 'köksbiträde', 'kock', 'servitör',
                 'servitris', 'disk', 'café', 'mat', 'gastronomi', 'food'],
  stad:         ['städ', 'lokalvård', 'rengöring', 'clean', 'städare', 'hemstäd'],
  truckkort:    ['truck', 'lager', 'logistik', 'warehouse', 'truckkort'],
  nystartsjobb: ['nystartsjobb', 'nystart'],
  bkorkort:     ['körkort', 'b-körkort', 'b körkort', 'krav körkort'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasKeywordMatch(text, keywords) {
  if (!text) return false;
  const t = text.toLowerCase();
  return keywords.some((kw) => t.includes(kw.toLowerCase()));
}

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().match(/\b\w{4,}\b/g) ?? [];
}

// ─── Keyword-filter ──────────────────────────────────────────────────────────

/**
 * Avgör om en deltagare ska inkluderas för en given tjänst.
 * Logiken är inkluderande – vi begränsar inga matchningar.
 *
 * @param {object} deltagare - med _cvTexter: [{rubrik, cv_text}]
 * @param {object} tjanst - { foretag, tjanst, krav }
 * @param {object} extraKategoriKeywords - ytterligare keywords från inställningar
 */
export function passesKeywordFilter(deltagare, tjanst, extraKategoriKeywords = {}) {
  const allKeywords = { ...KATEGORI_KEYWORDS, ...extraKategoriKeywords };
  const tjanstText = `${tjanst.tjanst} ${tjanst.foretag} ${tjanst.krav ?? ''}`.toLowerCase();

  // 1. Kategori-match
  const kategoriKeys = [
    ['kategori_restaurang', 'restaurang'],
    ['kategori_stad', 'stad'],
    ['kategori_truckkort', 'truckkort'],
    ['kategori_nystartsjobb', 'nystartsjobb'],
    ['kategori_bkorkort', 'bkorkort'],
  ];

  const hasKategoriMatch = kategoriKeys.some(([field, key]) => {
    if (!parseBoolean(deltagare[field])) return false;
    const keywords = allKeywords[key] ?? [];
    return hasKeywordMatch(tjanstText, keywords);
  });

  if (hasKategoriMatch) return true;

  // Extra kategori
  if (parseBoolean(deltagare.kategori_extra_1)) {
    const extraNamn = (deltagare.kategori_extra_1_namn ?? '').toLowerCase();
    const extraKw = allKeywords[extraNamn] ?? [];
    if (hasKeywordMatch(tjanstText, extraKw)) return true;
  }

  // 2. CV-ord-match (minst 2 ord >3 tecken från CV matchar tjänstetexten)
  const cvText = (deltagare._cvTexter ?? []).map((c) => c.cv_text ?? '').join(' ');
  const cvTokens = tokenize(cvText);
  const tjanstTokens = new Set(tokenize(tjanstText));
  const cvMatches = cvTokens.filter((t) => tjanstTokens.has(t));
  if (cvMatches.length >= 2) return true;

  // 3. Fritextmatch (minst 1 ord >3 tecken)
  const fritextTokens = tokenize(deltagare.fritext ?? '');
  const fritextMatches = fritextTokens.filter((t) => tjanstTokens.has(t));
  return fritextMatches.length >= 1;
}

// ─── Prompt-byggare ──────────────────────────────────────────────────────────

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

Skriv 1–2 meningar på svenska som förklarar varför denna person kan passa för tjänsten.
Var specifik och konkret. Nämn relevant erfarenhet eller öppenhet.
Skriv direkt utan inledning, som om du presenterar personen för rekryteraren.
Svara med enbart 1–2 meningarna, inget annat.`;
}

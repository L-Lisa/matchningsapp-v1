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

// ─── AF-jobbtips: editable default instructions ───────────────────────────────

export const DEFAULT_AF_QUERY_INSTRUCTIONS = `Generera 3 söktermer på svenska för Arbetsförmedlingens platsbank:
1. DIREKT – speglar personens primära yrkeserfarenhet (t.ex. "kock", "lagerarbetare", "ekonomiassistent")
2. TRANSFERABELT – relaterad roll där kompetensen är tillämpbar (t.ex. "kökschef" → "produktionsledare")
3. ALTERNATIVT – en sektor eller roll personen kan växa in i baserat på sin bakgrund

ROM-perspektiv: en fd VD kan söka "affärsutvecklare", "projektledare", "konsultchef". En lagerarbetare kan söka "logistikkoordinator", "truckförare", "lageransvarig". Alla bakgrunder är lika sökbara. Var specifik – undvik generella termer som "tjänsteman" eller "handläggare".`;

export const DEFAULT_AF_RANK_INSTRUCTIONS = `Välj max 15 jobb som genuint passar denna person utifrån ROM-programmets perspektiv:
- INKLUDERA: roller med direkt relevant eller transferabel erfarenhet – även överkvalificerade
- INKLUDERA: roller som stämmer med personens fritext, kategorier och extra kontext
- EXKLUDERA BARA om: hårda krav saknas (truckkort, B-körkort, specifika certifikat) ELLER rollen är helt irrelevant

Tagga varje match med en av tre typer:
- DIREKT: personen har exakt den erfarenheten – trygg kandidatur
- TRANSFERABELT: kompetens från annan bransch/roll är tillämpbar – kräver pitch
- ALTERNATIVT: personen kan växa in i rollen baserat på sin bakgrund

Motivering: 1–2 meningar i du-form på svenska, direkt till personen. Lyft konkret varför just det här jobbet passar.`;

// ─── AF-jobbtips: prompt-byggare ─────────────────────────────────────────────

/**
 * Ber Claude generera 3 svenska söktermer för AF utifrån CV + kontext.
 * Svar: en sökterm per rad, inget annat.
 *
 * @param {string} instructions - redigerbar del, default = DEFAULT_AF_QUERY_INSTRUCTIONS
 */
export function buildAfQueryPrompt(deltagare, cvTexter, extraKontext = '', instructions = DEFAULT_AF_QUERY_INSTRUCTIONS) {
  const cvSektioner = cvTexter
    .map((cv) => `${cv.rubrik}\n${cv.cv_text}`)
    .join('\n\n---\n\n');
  const kategorierText = formatKategorier(deltagare);

  return `Du är jobbcoach inom ROM-programmet. Analysera denna deltagares bakgrund och generera söktermer för Arbetsförmedlingens platsbank.

DELTAGARE: ${deltagare.visningsnamn}${kategorierText ? `\nKATEGORIER: ${kategorierText}` : ''}${deltagare.fritext?.trim() ? `\nANTECKNINGAR: ${deltagare.fritext.trim()}` : ''}${extraKontext?.trim() ? `\nEXTRA KONTEXT: ${extraKontext.trim()}` : ''}
CV:
${cvSektioner}

${instructions}

Returnera exakt 3 rader. Varje rad är en sökterm (t.ex. "lagerarbetare", "kökspersonal restaurang", "IT-support tekniker"). Bara söktermerna, inget annat.`;
}

/**
 * Ber Claude välja de 10 bästa jobben från AF-sökresultat och motivera varför.
 * Svar-format: "MATCH [nummer]: motivering" – återanvänder samma parsers.
 *
 * @param {string} instructions - redigerbar del, default = DEFAULT_AF_RANK_INSTRUCTIONS
 */
export function buildAfRankPrompt(deltagare, cvTexter, jobs, extraKontext = '', instructions = DEFAULT_AF_RANK_INSTRUCTIONS) {
  const cvSektioner = cvTexter
    .map((cv) => `${cv.rubrik}\n${cv.cv_text}`)
    .join('\n\n---\n\n');
  const kategorierText = formatKategorier(deltagare);

  const jobLista = jobs
    .map((j, i) => {
      const meta = [];
      if (j.municipality) meta.push(`Plats: ${j.municipality}`);
      if (j.workingHours) meta.push(j.workingHours);
      if (j.duration) meta.push(j.duration);
      if (j.drivingLicenseRequired) meta.push('Kräver körkort');
      if (j.experienceRequired) meta.push('Kräver erfarenhet');
      if (j.mustHave?.length) meta.push(`Hårda krav: ${j.mustHave.join(', ')}`);
      const metaStr = meta.length ? `\n${meta.join(' | ')}` : '';
      return `[${i + 1}] ${j.headline} – ${j.employer}${metaStr}\n${j.description}`;
    })
    .join('\n\n');

  return `${ROM_SYSTEM}

DELTAGARE: ${deltagare.visningsnamn}${kategorierText ? `\nKATEGORIER: ${kategorierText}` : ''}${deltagare.fritext?.trim() ? `\nANTECKNINGAR FRÅN COACH: ${deltagare.fritext.trim()}` : ''}${extraKontext?.trim() ? `\nEXTRA KONTEXT: ${extraKontext.trim()}` : ''}
CV:
${cvSektioner}

${instructions}

Instruktioner för svar:
- För varje jobb som passar: skriv exakt "MATCH [nummer] DIREKT: [motivering]" eller "MATCH [nummer] TRANSFERABELT: [motivering]" eller "MATCH [nummer] ALTERNATIVT: [motivering]"
- För jobb som inte passar: skriv ingenting
- Om inga passar: svara med exakt "INGA_MATCHER"

JOBBANNONSER (${jobs.length} st):
${jobLista}`;
}

// ─── Jobb Fokus: prompt-byggare ───────────────────────────────────────────────

/**
 * Utvärderar en deltagare mot flera roller på en gång.
 * Svar-format: "MATCH [n] DIREKT|TRANSFERABELT|ALTERNATIVT: motivering"
 *
 * @param {object} deltagare  - med visningsnamn, fritext och kategori-fält
 * @param {Array}  cvTexter   - [{rubrik, cv_text}]
 * @param {Array}  roller     - [{titel}]
 * @param {string} extraKontext
 */
export function buildJobbFokusPrompt(deltagare, cvTexter, roller, extraKontext = '') {
  const cvSektioner = cvTexter
    .map((cv) => `${cv.rubrik}\n${cv.cv_text}`)
    .join('\n\n---\n\n');
  const kategorierText = formatKategorier(deltagare);

  const rollLista = roller
    .map((r, i) => `[${i + 1}] ${r.titel}`)
    .join('\n');

  // Roller visas FÖRE CV så att Claude läser CV:t med rollistan i minnet –
  // precis som en rekryterare som läser ett CV med jobbannonsen framför sig.
  return `${ROM_SYSTEM}

Du utvärderar en jobbsökande mot ${roller.length} roller. Läs rollerna nedan, läs sedan CV:t noggrant och rapportera vilka roller personen faktiskt passar för.

ROLLER ATT UTVÄRDERA [1]–[${roller.length}]:
${rollLista}

DELTAGARE: ${deltagare.visningsnamn}${kategorierText ? `\nKATEGORIER: ${kategorierText}` : ''}${deltagare.fritext?.trim() ? `\nANTECKNINGAR: ${deltagare.fritext.trim()}` : ''}${extraKontext?.trim() ? `\nEXTRA KONTEXT: ${extraKontext.trim()}` : ''}

CV:
${cvSektioner}

Gå nu igenom rollerna [1]–[${roller.length}] systematiskt och rapportera matchningar:
- MATCH [nummer] DIREKT: [motivering] – personen har direkt erfarenhet av detta
- MATCH [nummer] TRANSFERABELT: [motivering] – kompetens från annan roll/bransch är tillämpbar
- MATCH [nummer] ALTERNATIVT: [motivering] – personen kan växa in i rollen utifrån sin bakgrund
- Ingen rad om personen inte passar den rollen
- Svarar "INGA_MATCHER" om personen inte passar någon roll alls

KRAV på motivering: referera alltid till konkret CV-innehåll (specifik erfarenhet, kompetens, jobbhistorik). Inga antaganden om vad personen kan utöver vad som faktiskt står i CV:t.`;
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

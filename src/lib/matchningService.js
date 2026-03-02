// Orkestrering av matchningskörning – anropar proxy

import { sleep, generateId, nowTimestamp, chunkArray } from './utils.js';
import {
  buildMultiPrompt, parseMultiResponse,
  buildScenarioTjanstPrompt, parseScenarioTjanstResponse,
} from './matchningLogic.js';

export { passesKeywordFilter, buildPrompt, INGEN_MATCH_SIGNAL, KATEGORI_KEYWORDS, buildMultiPrompt, parseMultiResponse } from './matchningLogic.js';

const APP_SECRET = import.meta.env.VITE_APP_SECRET;

// ─── Anrop till proxy ────────────────────────────────────────────────────────

async function callProxy(prompt, attempt = 1) {
  const res = await fetch('/api/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${APP_SECRET}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (res.status === 429 && attempt < 3) {
    await sleep(Math.pow(2, attempt) * 1000);
    return callProxy(prompt, attempt + 1);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Proxyn svarade med ${res.status}`);
  }

  const data = await res.json();
  return data.text ?? '';
}

// ─── Matchningskörning ───────────────────────────────────────────────────────

/**
 * Kör matchning för en rekryterare.
 *
 * Bevarar manuellt redigerade motiveringar från previousMatchningar.
 * Filtrerar ut kombinationer där Claude svarar INGEN_MATCH.
 *
 * @param {string} rekryterare
 * @param {Array} aktiva - Aktiva deltagare med _cvTexter inlagda
 * @param {Array} tjanster - Alla aktiva tjänster för denna rekryterare
 * @param {Array} previousMatchningar - Befintliga matchningar (för att bevara redigerade)
 * @param {Function} onProgress - Callback: (done, total, message) => void
 * @returns {Array} Matchningar att spara (inkl. bevarade redigerade)
 */
const BATCH_SIZE = 30;    // tjänster per Claude-anrop (deltagare → jobb)
const SCENARIO_BATCH = 15; // deltagare per Claude-anrop (jobb → deltagare)

// ─── Scenario A: en deltagare → hitta matchande jobb ─────────────────────────

/**
 * Kör scenario för en deltagare mot alla angivna tjänster.
 * Ingen keyword-filter – Claude ser alla jobb med CV.
 *
 * @param {object} deltagare  - med visningsnamn, fritext och kategori-fält
 * @param {Array}  cvTexter   - [{rubrik, cv_text}]
 * @param {Array}  allTjanster - aktiva tjänster från alla rekryterare
 * @returns {Array} [{tjanst, motivering}]
 */
export async function runScenarioDeltagare(deltagare, cvTexter, allTjanster, extraKontext = '') {
  if (!cvTexter || cvTexter.length === 0) return [];

  const batches = chunkArray(allTjanster, BATCH_SIZE);
  const results = [];

  for (const batch of batches) {
    const prompt = buildMultiPrompt(deltagare, cvTexter, batch, extraKontext);
    const text = await callProxy(prompt);
    const matches = parseMultiResponse(text, batch);

    for (const { tjanst_id, motivering } of matches) {
      const tjanst = batch.find((t) => t.id === tjanst_id);
      if (tjanst) results.push({ tjanst, motivering });
    }

    if (batches.length > 1) await sleep(300);
  }

  return results;
}

// ─── Scenario B: ett jobb → hitta matchande deltagare ────────────────────────

/**
 * Kör scenario för en tjänst mot alla deltagare med CV.
 * Ingen keyword-filter – Claude ser alla deltagare.
 *
 * @param {object} tjanst        - { id, tjanst, foretag, krav, rekryterare }
 * @param {Array}  allDeltagare  - aktiva deltagare med _cvTexter inlagda
 * @param {string} extraKontext  - valfri extra info från Lisa
 * @returns {Array} [{deltagare, motivering}]
 */
export async function runScenarioTjanst(tjanst, allDeltagare, extraKontext = '') {
  const medCV = allDeltagare.filter(
    (d) => d._cvTexter && d._cvTexter.length > 0
  );
  const batches = chunkArray(medCV, SCENARIO_BATCH);
  const results = [];

  for (const batch of batches) {
    const prompt = buildScenarioTjanstPrompt(tjanst, batch, extraKontext);
    const text = await callProxy(prompt);
    const matches = parseScenarioTjanstResponse(text, batch);

    for (const { deltagare_id, motivering } of matches) {
      const d = batch.find((x) => x.id === deltagare_id);
      if (d) results.push({ deltagare: d, motivering });
    }

    if (batches.length > 1) await sleep(300);
  }

  return results;
}

// ─── Matchningskörning ───────────────────────────────────────────────────────

/**
 * Kör matchning för en rekryterare.
 *
 * Arkitektur: per-deltagare med batching.
 * För varje aktiv deltagare skickas upp till BATCH_SIZE tjänster i ett enda
 * Claude-anrop. Claude returnerar bara de tjänster som matchar + motivering.
 *
 * Bevarar manuellt redigerade motiveringar från previousMatchningar.
 * Kastar vid API-fel så att körningen avbryts med synligt felmeddelande.
 *
 * @param {string}   rekryterare
 * @param {Array}    aktiva           - Aktiva deltagare med _cvTexter inlagda
 * @param {Array}    tjanster         - Alla aktiva tjänster för denna rekryterare
 * @param {Array}    previousMatchningar
 * @param {Function} onProgress       - (done, total, message) => void
 */
export async function runMatchningForRekryterare(
  rekryterare,
  aktiva,
  tjanster,
  previousMatchningar,
  onProgress
) {
  const previousMap = new Map(
    previousMatchningar.map((m) => [`${m.deltagare_id}|${m.tjanst_id}`, m])
  );

  const aktivaIds = new Set(aktiva.map((d) => d.id));
  const tjanstIds = new Set(tjanster.map((t) => t.id));

  // Bevara manuellt redigerade matchningar vars deltagare+tjänst fortfarande är aktiva
  const redigerade = previousMatchningar.filter(
    (m) =>
      m.ai_motivering_redigerad &&
      aktivaIds.has(m.deltagare_id) &&
      tjanstIds.has(m.tjanst_id)
  );
  const redigeradeKeys = new Set(redigerade.map((m) => `${m.deltagare_id}|${m.tjanst_id}`));

  const results = [...redigerade];
  const total = aktiva.length;

  onProgress?.(0, total, `Förbereder matchning för ${rekryterare}...`);

  for (let i = 0; i < aktiva.length; i++) {
    const deltagare = aktiva[i];
    const cvTexter = deltagare._cvTexter ?? [];

    // Deltagare utan CV matchas aldrig
    if (cvTexter.length === 0) {
      onProgress?.(i + 1, total, `Matchning för ${rekryterare} (deltagare ${i + 1}/${total})...`);
      continue;
    }

    // Hoppa över tjänster med redigerade matchningar för denna deltagare
    const tjansterForDeltagare = tjanster.filter(
      (t) => !redigeradeKeys.has(`${deltagare.id}|${t.id}`)
    );

    if (tjansterForDeltagare.length > 0) {
      const batches = chunkArray(tjansterForDeltagare, BATCH_SIZE);

      for (const batch of batches) {
        const prompt = buildMultiPrompt(deltagare, cvTexter, batch);
        const responseText = await callProxy(prompt); // kastar vid API-fel
        console.debug(
          `[matchning] ${deltagare.visningsnamn} (batch ${batch.length} tjänster) →`,
          responseText.substring(0, 300)
        );
        const matches = parseMultiResponse(responseText, batch);

        for (const { tjanst_id, motivering } of matches) {
          if (!tjanstIds.has(tjanst_id)) continue; // sanity-check mot ogiltiga id:n

          const key = `${deltagare.id}|${tjanst_id}`;
          const prev = previousMap.get(key);
          const now = nowTimestamp();

          if (prev) {
            results.push({
              ...prev,
              ai_motivering: motivering,
              ai_motivering_redigerad: false,
              korning_datum: now,
            });
          } else {
            results.push({
              id: generateId(),
              deltagare_id: deltagare.id,
              tjanst_id,
              rekryterare,
              ai_motivering: motivering,
              ai_motivering_redigerad: false,
              korning_datum: now,
              ny_denna_korning: true,
            });
          }
        }
      }
    }

    onProgress?.(i + 1, total, `Matchning för ${rekryterare} (deltagare ${i + 1}/${total})...`);

    // Kort paus mellan deltagare (inte efter sista)
    if (i < aktiva.length - 1) await sleep(300);
  }

  return results;
}

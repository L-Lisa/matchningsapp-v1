// Orkestrering av matchningskörning – anropar proxy

import { sleep, generateId, nowTimestamp, chunkArray } from './utils.js';
import { passesKeywordFilter, buildPrompt, INGEN_MATCH_SIGNAL } from './matchningLogic.js';

export { passesKeywordFilter, buildPrompt, INGEN_MATCH_SIGNAL, KATEGORI_KEYWORDS } from './matchningLogic.js';

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
export async function runMatchningForRekryterare(
  rekryterare,
  aktiva,
  tjanster,
  previousMatchningar,
  onProgress
) {
  // Bygg snabb uppslag på befintliga matchningar
  const previousMap = new Map(
    previousMatchningar.map((m) => [`${m.deltagare_id}|${m.tjanst_id}`, m])
  );

  // Identifiera redigerade matchningar vars deltagare+tjänst fortfarande är aktiva
  const aktivaIds = new Set(aktiva.map((d) => d.id));
  const tjanstIds = new Set(tjanster.map((t) => t.id));

  const redigerade = previousMatchningar.filter(
    (m) =>
      m.ai_motivering_redigerad &&
      aktivaIds.has(m.deltagare_id) &&
      tjanstIds.has(m.tjanst_id)
  );
  const redigeradeKeys = new Set(redigerade.map((m) => `${m.deltagare_id}|${m.tjanst_id}`));

  // Bygg kombinationer via keyword-filter (hoppa över redigerade – de bevaras som-är)
  const kombinationer = [];
  for (const tjanst of tjanster) {
    for (const deltagare of aktiva) {
      const key = `${deltagare.id}|${tjanst.id}`;
      if (redigeradeKeys.has(key)) continue; // hanteras separat
      if (passesKeywordFilter(deltagare, tjanst)) {
        kombinationer.push({ deltagare, tjanst });
      }
    }
  }

  const total = kombinationer.length;
  onProgress?.(0, total, `Förbereder matchning för ${rekryterare}...`);

  const batches = chunkArray(kombinationer, 10);

  // Starta med de redigerade – de behöver inga API-anrop
  const results = [...redigerade];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    const batchResults = await Promise.all(
      batch.map(async ({ deltagare, tjanst }) => {
        const key = `${deltagare.id}|${tjanst.id}`;
        const prev = previousMap.get(key); // befintlig icke-redigerad, om den finns

        const cvTexter = deltagare._cvTexter ?? [];
        const prompt = buildPrompt(deltagare, cvTexter, tjanst);
        let motivering = '';

        try {
          motivering = await callProxy(prompt);
        } catch (err) {
          console.error('[matchning] Prompt misslyckades:', err.message);
          return null; // skippa vid fel – lägg inte in garbage
        }

        // Claude säger att det inte är en match
        if (motivering.trim() === INGEN_MATCH_SIGNAL) {
          return null;
        }

        const now = nowTimestamp();

        if (prev) {
          // Uppdatera befintlig icke-redigerad matchning (behåll id)
          return {
            ...prev,
            ai_motivering: motivering,
            ai_motivering_redigerad: false,
            korning_datum: now,
          };
        }

        // Ny matchning
        return {
          id: generateId(),
          deltagare_id: deltagare.id,
          tjanst_id: tjanst.id,
          rekryterare,
          ai_motivering: motivering,
          ai_motivering_redigerad: false,
          korning_datum: now,
          ny_denna_korning: true,
        };
      })
    );

    results.push(...batchResults.filter(Boolean));

    onProgress?.(
      results.length - redigerade.length, // visa bara AI-körda
      total,
      `Kör matchning för ${rekryterare} (${results.length - redigerade.length}/${total})...`
    );

    // 500ms delay mellan batches (inte efter sista)
    if (batchIdx < batches.length - 1) {
      await sleep(500);
    }
  }

  return results;
}

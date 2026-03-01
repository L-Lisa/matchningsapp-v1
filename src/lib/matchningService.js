// Orkestrering av matchningskörning – anropar proxy

import { sleep, generateId, nowTimestamp, chunkArray } from './utils.js';
import { passesKeywordFilter, buildPrompt } from './matchningLogic.js';

export { passesKeywordFilter, buildPrompt, KATEGORI_KEYWORDS } from './matchningLogic.js';

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
 * @param {string} rekryterare
 * @param {Array} aktiva - Aktiva deltagare med _cvTexter inlagda
 * @param {Array} tjanster - Alla aktiva tjänster för denna rekryterare
 * @param {Array} previousMatchningar - Matchningar som tas bort (för ny_denna_korning-logik)
 * @param {Function} onProgress - Callback: (done, total, message) => void
 * @returns {Array} Nya matchningar
 */
export async function runMatchningForRekryterare(
  rekryterare,
  aktiva,
  tjanster,
  previousMatchningar,
  onProgress
) {
  const previousKeys = new Set(
    previousMatchningar.map((m) => `${m.deltagare_id}|${m.tjanst_id}`)
  );

  // Bygg kombinationer via keyword-filter
  const kombinationer = [];
  for (const tjanst of tjanster) {
    for (const deltagare of aktiva) {
      if (passesKeywordFilter(deltagare, tjanst)) {
        kombinationer.push({ deltagare, tjanst });
      }
    }
  }

  const total = kombinationer.length;
  onProgress?.(0, total, `Förbereder matchning för ${rekryterare}...`);

  const batches = chunkArray(kombinationer, 10);
  const results = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    const batchResults = await Promise.all(
      batch.map(async ({ deltagare, tjanst }) => {
        const cvTexter = deltagare._cvTexter ?? [];
        const prompt = buildPrompt(deltagare, cvTexter, tjanst);
        let motivering = '';

        try {
          motivering = await callProxy(prompt);
        } catch (err) {
          console.error('[matchning] Prompt misslyckades:', err.message);
          motivering = 'Kunde inte generera motivering.';
        }

        const key = `${deltagare.id}|${tjanst.id}`;
        return {
          id: generateId(),
          deltagare_id: deltagare.id,
          tjanst_id: tjanst.id,
          rekryterare,
          ai_motivering: motivering,
          ai_motivering_redigerad: false,
          korning_datum: nowTimestamp(),
          ny_denna_korning: !previousKeys.has(key),
        };
      })
    );

    results.push(...batchResults);
    onProgress?.(
      results.length,
      total,
      `Kör matchning för ${rekryterare} (${results.length}/${total})...`
    );

    // 500ms delay mellan batches (inte efter sista)
    if (batchIdx < batches.length - 1) {
      await sleep(500);
    }
  }

  return results;
}

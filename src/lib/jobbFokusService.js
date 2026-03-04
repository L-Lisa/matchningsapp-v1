// Jobb Fokus: utvärderar varje deltagare individuellt mot flera roller

import { sleep, chunkArray } from './utils.js';
import { buildJobbFokusPrompt } from './matchningLogic.js';

const APP_SECRET = import.meta.env.VITE_APP_SECRET;
const CONCURRENCY = 5; // deltagare som utvärderas parallellt

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

  return (await res.json()).text ?? '';
}

function parseJobbFokusResponse(text, roller) {
  if (!text || text.trim() === 'INGA_MATCHER') return [];

  const MATCH_WITH_TAG = /^MATCH\s+\[?(\d+)\]?\s+(DIREKT|TRANSFERABELT|ALTERNATIVT):\s*(.*)$/i;
  const MATCH_PLAIN    = /^MATCH\s+\[?(\d+)\]?:\s*(.*)$/i;
  const lines = text.split('\n');
  const results = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const tagged = trimmed.match(MATCH_WITH_TAG);
    const plain  = !tagged && trimmed.match(MATCH_PLAIN);

    if (tagged || plain) {
      if (current) results.push(current);
      const idx = parseInt((tagged || plain)[1], 10) - 1;
      if (idx >= 0 && idx < roller.length) {
        current = {
          roll_idx:  idx,
          roll_titel: roller[idx].titel,
          kategori:  tagged ? tagged[2].toUpperCase() : null,
          motivering: (tagged ? tagged[3] : plain[2]).trim(),
        };
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
 * Utvärderar varje deltagare individuellt mot en lista av roller.
 * Kör CONCURRENCY deltagare parallellt och anropar callbacks löpande.
 *
 * @param {Array}    roller        - [{titel}]
 * @param {Array}    deltagareList - aktiva deltagare med _cvTexter inlagda
 * @param {string}   extraKontext
 * @param {object}   callbacks
 * @param {Function} callbacks.onProgress - ({ done, total }) => void
 * @param {Function} callbacks.onMatch    - (deltagare, matches) => void
 *   matches: [{roll_idx, roll_titel, kategori, motivering}]
 */
export async function runJobbFokus(roller, deltagareList, extraKontext, { onProgress, onMatch, onFailed }) {
  const medCV = deltagareList.filter((d) => d._cvTexter?.length > 0);
  const total = medCV.length;
  let done = 0;

  const batches = chunkArray(medCV, CONCURRENCY);

  for (let i = 0; i < batches.length; i++) {
    await Promise.all(
      batches[i].map(async (d) => {
        try {
          const cvTexter = d._cvTexter.map((c) => ({ rubrik: c.rubrik, cv_text: c.cv_text }));
          const prompt = buildJobbFokusPrompt(d, cvTexter, roller, extraKontext);
          const text = await callProxy(prompt);
          const matches = parseJobbFokusResponse(text, roller);
          if (matches.length > 0) onMatch(d, matches);
        } catch {
          // Körningen fortsätter för övriga, men vi rapporterar felet
          onFailed?.(d.visningsnamn);
        } finally {
          done++;
          onProgress({ done, total });
        }
      })
    );

    if (i < batches.length - 1) await sleep(200);
  }
}

// AF-jobbtips: hämtar jobb från Arbetsförmedlingen via Claude + AF API

import { sleep } from './utils.js';
import {
  buildAfQueryPrompt,
  buildAfRankPrompt,
  DEFAULT_AF_QUERY_INSTRUCTIONS,
  DEFAULT_AF_RANK_INSTRUCTIONS,
} from './matchningLogic.js';

export const STORAGE_KEY_QUERY = 'coachmatch_af_query_instructions';
export const STORAGE_KEY_RANK = 'coachmatch_af_rank_instructions';

export function getAfInstructions() {
  return {
    queryInstructions: localStorage.getItem(STORAGE_KEY_QUERY) || DEFAULT_AF_QUERY_INSTRUCTIONS,
    rankInstructions: localStorage.getItem(STORAGE_KEY_RANK) || DEFAULT_AF_RANK_INSTRUCTIONS,
  };
}

const APP_SECRET = import.meta.env.VITE_APP_SECRET;

async function callProxy(prompt) {
  const res = await fetch('/api/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${APP_SECRET}`,
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Proxyn svarade med ${res.status}`);
  }
  return (await res.json()).text ?? '';
}

async function callAfProxy(query) {
  const res = await fetch('/api/af-jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${APP_SECRET}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `AF-proxyn svarade med ${res.status}`);
  }
  return (await res.json()).jobs ?? [];
}

function parseQueryResponse(text) {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^\d+[\.\)]\s*/, '')) // ta bort ev. "1. " prefix
    .filter(Boolean)
    .slice(0, 3);
}

function parseRankResponse(text, jobs) {
  if (!text || text.trim() === 'INGA_MATCHER') return [];
  const MATCH_LINE = /^MATCH\s+\[?(\d+)\]?:\s*(.*)$/i;
  const lines = text.split('\n');
  const results = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const hit = trimmed.match(MATCH_LINE);
    if (hit) {
      if (current) results.push(current);
      const idx = parseInt(hit[1], 10) - 1;
      if (idx >= 0 && idx < jobs.length) {
        current = { job: jobs[idx], motivering: hit[2].trim() };
      } else {
        current = null;
      }
    } else if (current && trimmed && !trimmed.startsWith('INGA')) {
      current.motivering += ' ' + trimmed;
    }
  }
  if (current) results.push(current);
  return results.slice(0, 10);
}

/**
 * Kör hela AF-jobbtips-flödet för en deltagare:
 * 1. Claude genererar 2-3 söktermer
 * 2. AF API söks för varje term
 * 3. Claude rankar och väljer max 10 jobb
 *
 * @param {object} deltagare  - med visningsnamn, fritext och kategori-fält
 * @param {Array}  cvTexter   - [{rubrik, cv_text}]
 * @param {string} extraKontext
 * @returns {Array} [{job: {headline, employer, url, description}, motivering}]
 */
export async function runAfJobSearch(deltagare, cvTexter, extraKontext = '') {
  const { queryInstructions, rankInstructions } = getAfInstructions();

  // Steg 1: generera söktermer
  const queryPrompt = buildAfQueryPrompt(deltagare, cvTexter, extraKontext, queryInstructions);
  const queryText = await callProxy(queryPrompt);
  const queries = parseQueryResponse(queryText);

  if (queries.length === 0) throw new Error('Claude kunde inte generera söktermer.');

  // Steg 2: sök AF API för varje term, deduplicera på id
  const jobMap = new Map();
  for (const query of queries) {
    const jobs = await callAfProxy(query);
    for (const job of jobs) {
      if (!jobMap.has(job.id)) jobMap.set(job.id, job);
    }
    await sleep(200);
  }

  const allJobs = [...jobMap.values()];
  if (allJobs.length === 0) return [];

  // Steg 3: Claude rankar och väljer bästa
  const rankPrompt = buildAfRankPrompt(deltagare, cvTexter, allJobs, extraKontext, rankInstructions);
  const rankText = await callProxy(rankPrompt);
  return parseRankResponse(rankText, allJobs);
}

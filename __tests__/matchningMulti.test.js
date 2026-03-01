import { describe, it, expect } from '@jest/globals';
import { buildMultiPrompt, parseMultiResponse } from '../src/lib/matchningLogic.js';

const deltagare = {
  id: 'd1',
  visningsnamn: 'Krister Lindberg',
  fritext: 'Expert på personalfrågor och förändringsledning',
};

const cvTexter = [
  { rubrik: 'Arbetslivserfarenhet', cv_text: '15 år inom HR, rekrytering och arbetsmiljö.' },
];

const tjanster = [
  { id: 't1', tjanst: 'HR-specialist', foretag: 'Norla AB', krav: 'Erfarenhet av personalfrågor' },
  { id: 't2', tjanst: 'Truckförare', foretag: 'Lager AB', krav: 'Truckkort A+B' },
  { id: 't3', tjanst: 'Chefsstöd', foretag: 'Kommun AB', krav: 'Förändringsledning, HR' },
];

// ─── buildMultiPrompt ─────────────────────────────────────────────────────────

describe('buildMultiPrompt', () => {
  it('innehåller deltagarens namn', () => {
    const prompt = buildMultiPrompt(deltagare, cvTexter, tjanster);
    expect(prompt).toContain('Krister Lindberg');
  });

  it('innehåller CV-text', () => {
    const prompt = buildMultiPrompt(deltagare, cvTexter, tjanster);
    expect(prompt).toContain('15 år inom HR');
  });

  it('numrerar tjänster med [1], [2], [3]', () => {
    const prompt = buildMultiPrompt(deltagare, cvTexter, tjanster);
    expect(prompt).toContain('[1]');
    expect(prompt).toContain('[2]');
    expect(prompt).toContain('[3]');
  });

  it('innehåller alla tre tjänsters namn', () => {
    const prompt = buildMultiPrompt(deltagare, cvTexter, tjanster);
    expect(prompt).toContain('HR-specialist');
    expect(prompt).toContain('Truckförare');
    expect(prompt).toContain('Chefsstöd');
  });

  it('instruerar Claude att svara med MATCH-format', () => {
    const prompt = buildMultiPrompt(deltagare, cvTexter, tjanster);
    expect(prompt).toContain('MATCH [nummer]');
  });

  it('hanterar deltagare utan fritext', () => {
    const d = { ...deltagare, fritext: '' };
    const prompt = buildMultiPrompt(d, cvTexter, tjanster);
    expect(prompt).toContain('Ingen extra information');
  });

  it('hanterar tjänst utan krav', () => {
    const tUtanKrav = [{ id: 't4', tjanst: 'Receptionist', foretag: 'Hotel AB', krav: '' }];
    const prompt = buildMultiPrompt(deltagare, cvTexter, tUtanKrav);
    expect(prompt).toContain('Inga specificerade krav');
  });
});

// ─── parseMultiResponse ───────────────────────────────────────────────────────

describe('parseMultiResponse', () => {
  it('parsar en enkel MATCH-rad', () => {
    const text = 'MATCH [1]: Krister har gedigen HR-erfarenhet som passar rollen.';
    const result = parseMultiResponse(text, tjanster);
    expect(result).toHaveLength(1);
    expect(result[0].tjanst_id).toBe('t1');
    expect(result[0].motivering).toBe('Krister har gedigen HR-erfarenhet som passar rollen.');
  });

  it('parsar flera MATCH-rader', () => {
    const text = [
      'MATCH [1]: Passar HR-rollen utmärkt.',
      'MATCH [3]: Förändringsledning stämmer väl överens.',
    ].join('\n');
    const result = parseMultiResponse(text, tjanster);
    expect(result).toHaveLength(2);
    expect(result[0].tjanst_id).toBe('t1');
    expect(result[1].tjanst_id).toBe('t3');
  });

  it('returnerar tom array vid INGA_MATCHER', () => {
    const result = parseMultiResponse('INGA_MATCHER', tjanster);
    expect(result).toHaveLength(0);
  });

  it('returnerar tom array vid tomt svar', () => {
    const result = parseMultiResponse('', tjanster);
    expect(result).toHaveLength(0);
  });

  it('ignorerar MATCH-rad med index utanför listan', () => {
    const text = 'MATCH [99]: Ogiltigt index.';
    const result = parseMultiResponse(text, tjanster);
    expect(result).toHaveLength(0);
  });

  it('tolererar MATCH utan hakparenteser', () => {
    const text = 'MATCH 2: Passar inte alls men testas ändå.';
    const result = parseMultiResponse(text, tjanster);
    expect(result).toHaveLength(1);
    expect(result[0].tjanst_id).toBe('t2');
  });

  it('ignorerar kommentarer och extra text från Claude', () => {
    const text = [
      'Här är min bedömning:',
      'MATCH [1]: Krister passar HR-rollen.',
      'Tjänst 2 passar inte alls.',
    ].join('\n');
    const result = parseMultiResponse(text, tjanster);
    expect(result).toHaveLength(1);
    expect(result[0].tjanst_id).toBe('t1');
  });
});

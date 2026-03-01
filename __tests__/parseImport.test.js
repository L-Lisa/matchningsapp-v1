import { describe, it, expect } from '@jest/globals';

// Testa utan Vite-imports – kopiera ut ren logik för testbarhet
import { parseDeltagareText, mergeDeltagare, parseTjansterText, mergeTjanster } from '../src/lib/parseImport.js';

// ─── parseDeltagareText ───────────────────────────────────────────────────────

describe('parseDeltagareText', () => {
  it('parsar ISO-datum korrekt', () => {
    const text = 'Anna Karlsson\t2026-07-15';
    const { rows, errors } = parseDeltagareText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].visningsnamn).toBe('Anna Karlsson');
    expect(rows[0].slutdatum).toBe('2026-07-15');
  });

  it('parsar ISO-datum med tid', () => {
    const text = 'Bo Svensson\t2026-08-01 00:00:00';
    const { rows } = parseDeltagareText(text);
    expect(rows[0].slutdatum).toBe('2026-08-01');
  });

  it('parsar europeiskt datumformat', () => {
    const text = 'Carin Dahl\t12/7/2026';
    const { rows } = parseDeltagareText(text);
    expect(rows[0].slutdatum).toBe('2026-07-12');
  });

  it('filtrerar tomma rader tyst', () => {
    const text = 'Anna\t2026-07-15\n\n   \nBo\t2026-08-01';
    const { rows } = parseDeltagareText(text);
    expect(rows).toHaveLength(2);
  });

  it('rapporterar fel för rad utan tab', () => {
    const text = 'Anna Karlsson';
    const { errors } = parseDeltagareText(text);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/tabbseparator/);
  });

  it('rapporterar fel för ogiltigt datum', () => {
    const text = 'Anna\tinte-ett-datum';
    const { errors } = parseDeltagareText(text);
    expect(errors[0]).toMatch(/datum/i);
  });

  it('trimmar whitespace runt namn och datum', () => {
    const text = '  Anna Karlsson  \t  2026-07-15  ';
    const { rows } = parseDeltagareText(text);
    expect(rows[0].visningsnamn).toBe('Anna Karlsson');
    expect(rows[0].slutdatum).toBe('2026-07-15');
  });

  it('hanterar kommatecken i namn korrekt', () => {
    const text = 'A / H Fredrik Vollin UX Designer, marknad\t2026-06-09 00:00:00';
    const { rows, errors } = parseDeltagareText(text);
    expect(errors).toHaveLength(0);
    expect(rows[0].visningsnamn).toBe('A / H Fredrik Vollin UX Designer, marknad');
    expect(rows[0].slutdatum).toBe('2026-06-09');
  });

  it('använder sista kolumnen som datum vid 3 kolumner', () => {
    const text = 'Anna Karlsson\tUX Designer\t2026-07-15';
    const { rows, errors } = parseDeltagareText(text);
    expect(errors).toHaveLength(0);
    expect(rows[0].visningsnamn).toBe('Anna Karlsson');
    expect(rows[0].slutdatum).toBe('2026-07-15');
  });

  it('hoppar över rubrikrad tyst', () => {
    const text = 'Förnamn\tSlutdatum\nAnna Karlsson\t2026-07-15';
    const { rows, errors } = parseDeltagareText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].visningsnamn).toBe('Anna Karlsson');
  });
});

// ─── mergeDeltagare ───────────────────────────────────────────────────────────

describe('mergeDeltagare', () => {
  const existing = [
    { id: 'id-1', visningsnamn: 'Anna Karlsson', slutdatum: '2026-07-15', fritext: 'Bra på service' },
  ];

  it('lägger till ny deltagare', () => {
    const newRows = [
      { visningsnamn: 'Bo Svensson', slutdatum: '2026-08-01' },
    ];
    const { added, updated, unchanged } = mergeDeltagare(newRows, existing);
    expect(added).toHaveLength(1);
    expect(updated).toHaveLength(0);
    expect(unchanged).toBe(0);
    expect(added[0].visningsnamn).toBe('Bo Svensson');
  });

  it('uppdaterar slutdatum för befintlig deltagare', () => {
    const newRows = [
      { visningsnamn: 'Anna Karlsson', slutdatum: '2026-09-01' },
    ];
    const { added, updated, unchanged } = mergeDeltagare(newRows, existing);
    expect(added).toHaveLength(0);
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe('id-1');
    expect(updated[0].slutdatum).toBe('2026-09-01');
  });

  it('räknar oförändrade korrekt', () => {
    const newRows = [
      { visningsnamn: 'Anna Karlsson', slutdatum: '2026-07-15' },
    ];
    const { added, updated, unchanged } = mergeDeltagare(newRows, existing);
    expect(unchanged).toBe(1);
    expect(added).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it('matchar case-insensitivt', () => {
    const newRows = [
      { visningsnamn: 'anna karlsson', slutdatum: '2026-07-15' },
    ];
    const { added, unchanged } = mergeDeltagare(newRows, existing);
    expect(added).toHaveLength(0);
    expect(unchanged).toBe(1);
  });
});

// ─── parseTjansterText ────────────────────────────────────────────────────────

describe('parseTjansterText', () => {
  it('parsar tre kolumner korrekt', () => {
    const text = 'Nobina\tBusschaufför\tKörkort D, YKB';
    const { rows, errors } = parseTjansterText(text);
    expect(errors).toHaveLength(0);
    expect(rows[0].foretag).toBe('Nobina');
    expect(rows[0].tjanst).toBe('Busschaufför');
    expect(rows[0].krav).toBe('Körkort D, YKB');
  });

  it('accepterar saknad krav-kolumn', () => {
    const text = 'Nobina\tBusschaufför';
    const { rows } = parseTjansterText(text);
    expect(rows[0].krav).toBe('');
  });

  it('sätter sorteringsordning från radnummer', () => {
    const text = 'A\tTjänst1\nB\tTjänst2\nC\tTjänst3';
    const { rows } = parseTjansterText(text);
    expect(rows[0].sorteringsordning).toBe(1);
    expect(rows[1].sorteringsordning).toBe(2);
    expect(rows[2].sorteringsordning).toBe(3);
  });
});

// ─── mergeTjanster ────────────────────────────────────────────────────────────

describe('mergeTjanster', () => {
  const existing = [
    { id: 'tj-1', foretag: 'Nobina', tjanst: 'Busschaufför', krav: 'Körkort D', aktiv: 'TRUE' },
    { id: 'tj-2', foretag: 'ICA', tjanst: 'Kassapersonal', krav: '', aktiv: 'TRUE' },
  ];

  it('deaktiverar tjänst som saknas i ny import', () => {
    const newRows = [{ foretag: 'Nobina', tjanst: 'Busschaufför', krav: 'Körkort D', sorteringsordning: 1 }];
    const { deactivated } = mergeTjanster(newRows, existing, 'Petra');
    expect(deactivated).toContain('tj-2');
    expect(deactivated).not.toContain('tj-1');
  });

  it('uppdaterar krav för befintlig tjänst', () => {
    const newRows = [
      { foretag: 'Nobina', tjanst: 'Busschaufför', krav: 'Körkort D + YKB', sorteringsordning: 1 },
    ];
    const { updated } = mergeTjanster(newRows, existing, 'Petra');
    expect(updated).toHaveLength(1);
    expect(updated[0].krav).toBe('Körkort D + YKB');
  });
});

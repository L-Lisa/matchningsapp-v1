import { describe, it, expect } from '@jest/globals';
import { passesKeywordFilter } from '../src/lib/matchningLogic.js';

// Hjälp: bygg deltagare med _cvTexter
function deltagare(overrides = {}) {
  return {
    id: 'test',
    visningsnamn: 'Test Person',
    fritext: '',
    kategori_restaurang: 'FALSE',
    kategori_stad: 'FALSE',
    kategori_truckkort: 'FALSE',
    kategori_nystartsjobb: 'FALSE',
    kategori_bkorkort: 'FALSE',
    kategori_extra_1: 'FALSE',
    kategori_extra_1_namn: '',
    _cvTexter: [],
    ...overrides,
  };
}

function tjanst(overrides = {}) {
  return {
    id: 'tj-1',
    foretag: 'TestFöretag',
    tjanst: 'Testjobb',
    krav: '',
    ...overrides,
  };
}

// CV-data för tester som kräver att deltagaren har ett CV
const ettCV = [{ rubrik: 'CV', cv_text: 'Erfarenhet av arbete' }];

describe('passesKeywordFilter – ingen CV', () => {
  it('exkluderar alltid deltagare utan CV, även med kategori', () => {
    const d = deltagare({ kategori_restaurang: 'TRUE', _cvTexter: [] });
    const t = tjanst({ tjanst: 'Kock', foretag: 'Restaurang Smaken' });
    expect(passesKeywordFilter(d, t)).toBe(false);
  });

  it('exkluderar deltagare utan CV och utan kategorier', () => {
    const d = deltagare({ _cvTexter: [] });
    const t = tjanst();
    expect(passesKeywordFilter(d, t)).toBe(false);
  });
});

describe('passesKeywordFilter – med CV, med kategorier', () => {
  it('inkluderar restaurang-deltagare mot tjänst med "kock"', () => {
    const d = deltagare({ kategori_restaurang: 'TRUE', _cvTexter: ettCV });
    const t = tjanst({ tjanst: 'Kock', foretag: 'Restaurang Smaken' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });

  it('exkluderar restaurang-deltagare mot kontorsjobb', () => {
    const d = deltagare({ kategori_restaurang: 'TRUE', _cvTexter: ettCV });
    const t = tjanst({ tjanst: 'Administratör', foretag: 'Kontor AB' });
    expect(passesKeywordFilter(d, t)).toBe(false);
  });

  it('inkluderar truckkort-deltagare mot lagerjobb', () => {
    const d = deltagare({ kategori_truckkort: 'TRUE', _cvTexter: ettCV });
    const t = tjanst({ tjanst: 'Lagermedarbetare', foretag: 'Lager AB' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });

  it('inkluderar b-körkort-deltagare mot tjänst med "körkort" i krav', () => {
    const d = deltagare({ kategori_bkorkort: 'TRUE', _cvTexter: ettCV });
    const t = tjanst({ tjanst: 'Busschaufför', krav: 'Körkort D, YKB' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });
});

describe('passesKeywordFilter – med CV, utan kategorier', () => {
  it('inkluderar alltid mot alla tjänster när inga kategorier är satta (Claude avgör)', () => {
    const d = deltagare({
      _cvTexter: [{ rubrik: 'IT', cv_text: 'Programmerare med erfarenhet av Java och Python' }],
    });
    const t = tjanst({ tjanst: 'Kock', foretag: 'Restaurang Smaken' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });

  it('inkluderar deltagare utan kategorier oavsett CV-innehåll', () => {
    const d = deltagare({
      _cvTexter: [{ rubrik: 'CV', cv_text: 'Butikssäljare med kundkontakt' }],
    });
    const t = tjanst({ tjanst: 'Lagermedarbetare', foretag: 'Lager AB' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });
});

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

describe('passesKeywordFilter – kategori', () => {
  it('matchar restaurang-kategori mot tjänst med "kock"', () => {
    const d = deltagare({ kategori_restaurang: 'TRUE' });
    const t = tjanst({ tjanst: 'Kock', foretag: 'Restaurang Smaken' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });

  it('matchar inte restaurang-kategori mot kontorsjobb', () => {
    const d = deltagare({ kategori_restaurang: 'TRUE' });
    const t = tjanst({ tjanst: 'Administratör', foretag: 'Kontor AB' });
    expect(passesKeywordFilter(d, t)).toBe(false);
  });

  it('matchar truckkort-kategori mot lagerjobb', () => {
    const d = deltagare({ kategori_truckkort: 'TRUE' });
    const t = tjanst({ tjanst: 'Lagermedarbetare', foretag: 'Lager AB' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });

  it('matchar b-körkort mot tjänst med "körkort"', () => {
    const d = deltagare({ kategori_bkorkort: 'TRUE' });
    const t = tjanst({ tjanst: 'Busschaufför', krav: 'Körkort D, YKB' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });
});

describe('passesKeywordFilter – CV-ord', () => {
  it('matchar på minst 2 CV-ord i tjänstetexten', () => {
    const d = deltagare({
      _cvTexter: [{ rubrik: 'Säljare', cv_text: 'Arbetat med försäljning och kundservice inom butik' }],
    });
    const t = tjanst({ tjanst: 'Butikssäljare', krav: 'Erfarenhet av kundservice och försäljning' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });

  it('matchar inte på bara 1 CV-ord', () => {
    const d = deltagare({
      _cvTexter: [{ rubrik: 'IT', cv_text: 'Programmerare' }],
    });
    const t = tjanst({ tjanst: 'Kock', foretag: 'Restaurang', krav: '' });
    expect(passesKeywordFilter(d, t)).toBe(false);
  });
});

describe('passesKeywordFilter – fritext', () => {
  it('matchar på 1 fritextord när ordet finns i tjänstetexten', () => {
    // "lager" (5 tecken) finns i fritext OCH som token i foretag "Lager AB"
    const d = deltagare({ fritext: 'Söker jobb inom lager och logistik' });
    const t = tjanst({ tjanst: 'Lagerarbetare', foretag: 'Lager AB' });
    expect(passesKeywordFilter(d, t)).toBe(true);
  });

  it('matchar inte när inga fritextord finns i tjänstetexten', () => {
    const d = deltagare({ fritext: 'Öppen för kontorsarbete och administration' });
    const t = tjanst({ tjanst: 'Kock', foretag: 'Restaurang Smaken' });
    expect(passesKeywordFilter(d, t)).toBe(false);
  });
});

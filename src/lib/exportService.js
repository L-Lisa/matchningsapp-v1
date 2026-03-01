import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { parseBoolean } from './utils.js';

/**
 * Bygger exporttext i ren text för Gmail-kopiering.
 *
 * @param {string} rekryterare
 * @param {Array} matchningar - matchningar för denna rekryterare
 * @param {Array} tjanster - alla tjänster (för att hämta info per tjänst)
 * @param {Array} deltagare - alla deltagare
 * @param {string|null} korningDatum - ISO-datum för körningen
 */
export function buildExportText(rekryterare, matchningar, tjanster, deltagare, korningDatum) {
  if (!matchningar || matchningar.length === 0) {
    return `Inga matchningar för ${rekryterare}.`;
  }

  const tjanstMap = new Map(tjanster.map((t) => [t.id, t]));
  const deltagareMap = new Map(deltagare.map((d) => [d.id, d]));

  // Gruppera matchningar per tjänst, bevara tjänstens sorteringsordning
  const tjänstGrupper = new Map();
  for (const m of matchningar) {
    if (!tjänstGrupper.has(m.tjanst_id)) {
      tjänstGrupper.set(m.tjanst_id, []);
    }
    tjänstGrupper.get(m.tjanst_id).push(m);
  }

  // Sortera tjänster på sorteringsordning
  const sortedTjanstIds = [...tjänstGrupper.keys()].sort((a, b) => {
    const ta = tjanstMap.get(a);
    const tb = tjanstMap.get(b);
    return (Number(ta?.sorteringsordning) || 0) - (Number(tb?.sorteringsordning) || 0);
  });

  const sep = '────────────────────────────────────';

  let datumStr = '';
  if (korningDatum) {
    try {
      const d = parseISO(korningDatum);
      if (isValid(d)) {
        datumStr = format(d, 'd MMMM yyyy', { locale: sv });
      }
    } catch {}
  }

  const lines = [`Baserat på körning: ${datumStr || 'okänt datum'}`, ''];

  for (const tjanstId of sortedTjanstIds) {
    const tjanst = tjanstMap.get(tjanstId);
    if (!tjanst) continue;

    lines.push(sep);
    lines.push('');

    const tjänstMatchningar = tjänstGrupper.get(tjanstId);
    const arNy = tjänstMatchningar.some((m) => parseBoolean(m.ny_denna_korning));
    const rubrik = `${arNy ? '[NY] ' : ''}${tjanst.foretag} – ${tjanst.tjanst}`;
    lines.push(rubrik);

    if (tjanst.krav?.trim()) {
      lines.push(`Krav: ${tjanst.krav.trim()}`);
    }
    lines.push('');

    for (const m of tjänstMatchningar) {
      const d = deltagareMap.get(m.deltagare_id);
      const namn = d?.visningsnamn ?? m.deltagare_id;
      lines.push(`• ${namn}`);
      if (m.ai_motivering) {
        lines.push(`  ${m.ai_motivering.trim()}`);
      }
      lines.push('');
    }
  }

  lines.push(sep);

  return lines.join('\n');
}

/**
 * Hämta senaste körningsdatum för en rekryterare.
 */
export function getSenasteKorningDatum(rekryterare, matchningar) {
  const relevant = matchningar.filter((m) => m.rekryterare === rekryterare);
  if (!relevant.length) return null;

  const sorted = [...relevant].sort(
    (a, b) => new Date(b.korning_datum) - new Date(a.korning_datum)
  );
  return sorted[0].korning_datum ?? null;
}

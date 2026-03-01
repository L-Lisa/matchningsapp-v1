import { parseBoolean } from '../../lib/utils.js';
import MotiveringEditor from './MotiveringEditor.jsx';

export default function TjanstMatchningar({ tjanst, matchningar, deltagare, onEditMotivering }) {
  const deltagareMap = new Map(deltagare.map((d) => [d.id, d]));

  const harNyBadge = matchningar.some((m) => parseBoolean(m.ny_denna_korning));

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          {harNyBadge && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-primary)] text-white">
              NY
            </span>
          )}
          <span className="font-semibold text-sm">
            {tjanst.foretag} – {tjanst.tjanst}
          </span>
        </div>
        {tjanst.krav && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Krav: {tjanst.krav}</p>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {matchningar.length} matchade deltagare
        </p>
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {matchningar.map((m) => {
          const d = deltagareMap.get(m.deltagare_id);
          const isNy = parseBoolean(m.ny_denna_korning);
          return (
            <li key={m.id} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{d?.visningsnamn ?? m.deltagare_id}</span>
                    {isNy && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--accent-light)] text-[var(--accent-primary)]">
                        Ny
                      </span>
                    )}
                  </div>
                  <MotiveringEditor matchning={m} onSave={onEditMotivering} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

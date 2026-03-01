import MotiveringEditor from './MotiveringEditor.jsx';

export default function TjanstMatchningar({ tjanst, matchningar, deltagare, onEditMotivering }) {
  const deltagareMap = new Map(deltagare.map((d) => [d.id, d]));

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <span className="font-semibold text-sm">
          {tjanst.foretag} – {tjanst.tjanst}
        </span>
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
          return (
            <li key={m.id} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <span className="font-medium text-sm">{d?.visningsnamn ?? m.deltagare_id}</span>
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

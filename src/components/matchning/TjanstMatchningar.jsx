import { useState } from 'react';
import { Trash2, UserPlus, Check, X } from 'lucide-react';
import MotiveringEditor from './MotiveringEditor.jsx';
import { parseBoolean } from '../../lib/utils.js';

export default function TjanstMatchningar({
  tjanst,
  matchningar,
  deltagare,
  onEditMotivering,
  onAddMatchning,
  onRemoveMatchning,
}) {
  const deltagareMap = new Map(deltagare.map((d) => [d.id, d]));

  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [motivering, setMotivering] = useState('');
  const [saving, setSaving] = useState(false);

  // Aktiva deltagare som inte redan matchas med denna tjänst
  const matchadeIds = new Set(matchningar.map((m) => m.deltagare_id));
  const tillgangliga = deltagare
    .filter((d) => parseBoolean(d.aktiv) && !matchadeIds.has(d.id))
    .sort((a, b) => a.visningsnamn.localeCompare(b.visningsnamn, 'sv'));

  async function handleAdd() {
    if (!selectedId) return;
    setSaving(true);
    await onAddMatchning(selectedId, tjanst.id, tjanst.rekryterare, motivering.trim());
    setSaving(false);
    setSelectedId('');
    setMotivering('');
    setShowAdd(false);
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
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

      {/* Matchningar */}
      <ul className="divide-y divide-[var(--border)]">
        {matchningar.map((m) => {
          const d = deltagareMap.get(m.deltagare_id);
          const manuell = parseBoolean(m.ai_motivering_redigerad) && !m.ai_motivering;
          return (
            <li key={m.id} className="px-5 py-3 group/row">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {d?.visningsnamn ?? m.deltagare_id}
                    </span>
                    {manuell && (
                      <span className="text-xs text-[var(--text-muted)] italic">
                        Manuellt tillagd
                      </span>
                    )}
                  </div>
                  <MotiveringEditor matchning={m} onSave={onEditMotivering} />
                </div>
                <button
                  onClick={() => onRemoveMatchning(m.id)}
                  className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover/row:opacity-100 transition-opacity mt-0.5"
                  title="Ta bort matchning"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Lägg till deltagare */}
      {showAdd ? (
        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] space-y-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            autoFocus
            className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="">Välj deltagare...</option>
            {tillgangliga.map((d) => (
              <option key={d.id} value={d.id}>
                {d.visningsnamn}
              </option>
            ))}
          </select>
          <textarea
            value={motivering}
            onChange={(e) => setMotivering(e.target.value)}
            placeholder="Valfri motivering..."
            rows={2}
            className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--accent-primary)] resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={!selectedId || saving}
              className="flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Sparar...' : 'Lägg till'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setSelectedId(''); setMotivering(''); }}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          disabled={tillgangliga.length === 0}
          className="w-full px-5 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Lägg till deltagare
        </button>
      )}
    </div>
  );
}

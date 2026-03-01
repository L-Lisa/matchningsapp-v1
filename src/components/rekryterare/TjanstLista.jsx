import { useState } from 'react';
import { parseBoolean } from '../../lib/utils.js';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { Briefcase } from 'lucide-react';

export default function TjanstLista({ tjanster, rekryterare, onReaktivera }) {
  const [filter, setFilter] = useState('aktiva');

  const filtered = tjanster
    .filter((t) => {
      if (filter === 'aktiva') return parseBoolean(t.aktiv);
      if (filter === 'inaktiva') return !parseBoolean(t.aktiv);
      return true;
    })
    .sort((a, b) => (Number(a.sorteringsordning) || 0) - (Number(b.sorteringsordning) || 0));

  if (tjanster.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title={`Inga tjänster för ${rekryterare} än`}
        description="Klistra in listan ovan för att komma igång."
      />
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1 w-fit mb-4">
        {[['aktiva', 'Aktiva'], ['inaktiva', 'Inaktiva'], ['alla', 'Alla']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === v
                ? 'bg-white text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((t) => {
          const aktiv = parseBoolean(t.aktiv);
          return (
            <div
              key={t.id}
              className={`flex items-start justify-between gap-4 px-4 py-3 rounded-lg border ${
                aktiv
                  ? 'bg-white border-[var(--border)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border)] opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {t.foretag} – {t.tjanst}
                </p>
                {t.krav && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Krav: {t.krav}
                  </p>
                )}
              </div>
              {!aktiv && (
                <Button size="sm" variant="secondary" onClick={() => onReaktivera(t.id)}>
                  Reaktivera
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTjanster, REKRYTERARE } from '../hooks/useTjanster.js';
import { parseBoolean } from '../lib/utils.js';
import TjanstImport from '../components/rekryterare/TjanstImport.jsx';
import TjanstLista from '../components/rekryterare/TjanstLista.jsx';

const REK_COLORS = {
  Petra:  'var(--petra)',
  Nancy:  'var(--nancy)',
  Julia:  'var(--julia)',
  Nikola: 'var(--nikola)',
};

export default function Rekryterare() {
  const { tjanster, loading, error, load, importTjanster, reaktiveraTjanst, deleteTjanst, getTjansterForRekryterare } = useTjanster();
  const [activeTab, setActiveTab] = useState('Petra');

  useEffect(() => { load(); }, []);

  if (loading && tjanster.length === 0) {
    return <div className="text-sm text-[var(--text-muted)] py-8 text-center">Laddar tjänster...</div>;
  }
  if (error) {
    return <div className="text-sm text-[var(--danger)] py-4">{error}</div>;
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6 gap-1 overflow-x-auto">
        {REKRYTERARE.map((rek) => {
          const count = getTjansterForRekryterare(rek).filter((t) => parseBoolean(t.aktiv)).length;
          const isActive = activeTab === rek;
          return (
            <button
              key={rek}
              onClick={() => setActiveTab(rek)}
              style={isActive ? { borderBottomColor: REK_COLORS[rek] } : {}}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {rek}
              {count > 0 && (
                <span
                  className="ml-2 px-1.5 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: REK_COLORS[rek] }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Innehåll för aktiv flik */}
      <div>
        <TjanstImport
          rekryterare={activeTab}
          onImport={importTjanster}
          hasTjanster={getTjansterForRekryterare(activeTab).length > 0}
        />
        <TjanstLista
          tjanster={getTjansterForRekryterare(activeTab)}
          rekryterare={activeTab}
          onReaktivera={reaktiveraTjanst}
          onDelete={deleteTjanst}
        />
      </div>
    </div>
  );
}

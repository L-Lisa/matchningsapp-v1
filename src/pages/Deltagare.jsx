import { useEffect, useState, useMemo } from 'react';
import { Users, Search } from 'lucide-react';
import { useDeltagare } from '../hooks/useDeltagare.js';
import { parseBoolean, normalize } from '../lib/utils.js';
import DeltagarImport from '../components/deltagare/DeltagarImport.jsx';
import DeltagarKort from '../components/deltagare/DeltagarKort.jsx';
import NyaDeltagarPrompt from '../components/deltagare/NyaDeltagarPrompt.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function Deltagare() {
  const {
    deltagare, cvData, loading, error, load,
    importDeltagare, arkiveraDeltagare, updateFritext,
    updateKategorier, resetMatchraknare, saveCv, deleteCv, getCvForDeltagare,
  } = useDeltagare();

  const [filter, setFilter] = useState('aktiva'); // 'aktiva' | 'arkiverade' | 'alla'
  const [sort, setSort] = useState('slutdatum'); // 'slutdatum' | 'namn' | 'matchraknare'
  const [search, setSearch] = useState('');
  const [nyaDeltagare, setNyaDeltagare] = useState([]);
  const [showNyaPrompt, setShowNyaPrompt] = useState(false);

  useEffect(() => { load(); }, []);

  async function handleImport(text) {
    const result = await importDeltagare(text);
    if (result.success && result.added > 0) {
      // Hitta de nya deltagarna efter reload
      const fresh = await (async () => {
        await load();
        return [];
      })();
      // Vi hanterar detta via effect nedan
      setShowNyaPrompt(true);
    }
    return result;
  }

  // Spåra nya deltagare (de utan CV efter import)
  useEffect(() => {
    if (showNyaPrompt) {
      const aktiva = deltagare.filter((d) => parseBoolean(d.aktiv));
      const newest = aktiva
        .filter((d) => !cvData.some((c) => c.deltagare_id === d.id))
        .slice(0, 20);
      setNyaDeltagare(newest);
    }
  }, [deltagare, cvData, showNyaPrompt]);

  const filtered = useMemo(() => {
    let list = [...deltagare];

    if (filter === 'aktiva') list = list.filter((d) => parseBoolean(d.aktiv));
    else if (filter === 'arkiverade') list = list.filter((d) => !parseBoolean(d.aktiv));

    if (search.trim()) {
      const q = normalize(search);
      list = list.filter(
        (d) => normalize(d.visningsnamn).includes(q) || normalize(d.fritext ?? '').includes(q)
      );
    }

    list.sort((a, b) => {
      if (sort === 'namn') return a.visningsnamn.localeCompare(b.visningsnamn, 'sv');
      if (sort === 'matchraknare') return (Number(b.matchraknare) || 0) - (Number(a.matchraknare) || 0);
      // slutdatum
      return new Date(a.slutdatum) - new Date(b.slutdatum);
    });

    return list;
  }, [deltagare, filter, sort, search]);

  const hasDeltagare = deltagare.some((d) => parseBoolean(d.aktiv));

  if (loading && deltagare.length === 0) {
    return <div className="text-sm text-[var(--text-muted)] py-8 text-center">Laddar deltagare...</div>;
  }

  if (error) {
    return <div className="text-sm text-[var(--danger)] py-4">{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Import */}
      <DeltagarImport onImport={handleImport} hasDeltagare={hasDeltagare} />

      {/* Nya deltagare prompt */}
      {showNyaPrompt && nyaDeltagare.length > 0 && (
        <NyaDeltagarPrompt
          nyaDeltagare={nyaDeltagare}
          cvData={cvData}
          onSaveCv={saveCv}
          onDismiss={() => setShowNyaPrompt(false)}
        />
      )}

      {/* Filter + sök */}
      {deltagare.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök deltagare..."
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] w-52"
            />
          </div>

          <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
            {[['aktiva', 'Aktiva'], ['arkiverade', 'Arkiverade'], ['alla', 'Alla']].map(([v, l]) => (
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

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-white focus:outline-none"
          >
            <option value="slutdatum">Sortera: Slutdatum</option>
            <option value="namn">Sortera: Namn</option>
            <option value="matchraknare">Sortera: Matchräknare</option>
          </select>

          <span className="text-sm text-[var(--text-muted)] ml-auto">
            {filtered.length} visas
          </span>
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            deltagare.length === 0
              ? 'Inga deltagare än'
              : 'Inga deltagare matchar sökningen'
          }
          description={
            deltagare.length === 0
              ? 'Klistra in din Excel-lista ovan för att komma igång.'
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((d) => (
            <DeltagarKort
              key={d.id}
              deltagare={d}
              cvList={getCvForDeltagare(d.id)}
              onUpdateFritext={updateFritext}
              onUpdateKategorier={updateKategorier}
              onArkivera={arkiveraDeltagare}
              onResetMatchraknare={resetMatchraknare}
              onSaveCv={saveCv}
              onDeleteCv={deleteCv}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useDeltagare } from '../hooks/useDeltagare.js';
import { useTjanster, REKRYTERARE } from '../hooks/useTjanster.js';
import { useMatchning } from '../hooks/useMatchning.js';
import { parseBoolean } from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import TjanstMatchningar from '../components/matchning/TjanstMatchningar.jsx';

const REK_COLORS = {
  Petra:  'var(--petra)',
  Nancy:  'var(--nancy)',
  Julia:  'var(--julia)',
  Nikola: 'var(--nikola)',
};

export default function Matchning() {
  const { deltagare, cvData, load: loadD } = useDeltagare();
  const { tjanster, load: loadT } = useTjanster();
  const { matchningar, progress, loading, load: loadM, runMatchning, editMotivering, addMatchning, removeMatchning } = useMatchning();

  const [selectedRek, setSelectedRek] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('Petra');

  useEffect(() => {
    loadD();
    loadT();
    loadM();
  }, []);

  async function handleKorMatchning() {
    setRunning(true);
    try {
      // Bygg aktiva deltagare med _cvTexter
      const aktiva = deltagare
        .filter((d) => parseBoolean(d.aktiv))
        .map((d) => ({
          ...d,
          _cvTexter: cvData.filter((c) => c.deltagare_id === d.id),
        }));

      const aktivaTjanster = tjanster.filter((t) => parseBoolean(t.aktiv));
      await runMatchning([...selectedRek], aktiva, aktivaTjanster);
    } finally {
      setRunning(false);
    }
  }

  const isEmpty =
    deltagare.filter((d) => parseBoolean(d.aktiv)).length === 0 &&
    tjanster.filter((t) => parseBoolean(t.aktiv)).length === 0;

  // Matchningar per rekryterare för aktiv tab
  const tabMatchningar = matchningar.filter((m) => m.rekryterare === activeTab);
  const tabTjanster = tjanster
    .filter((t) => t.rekryterare === activeTab)
    .sort((a, b) => (Number(a.sorteringsordning) || 0) - (Number(b.sorteringsordning) || 0));

  // Gruppera matchningar per tjänst
  const matchningarPerTjanst = new Map();
  for (const m of tabMatchningar) {
    if (!matchningarPerTjanst.has(m.tjanst_id)) matchningarPerTjanst.set(m.tjanst_id, []);
    matchningarPerTjanst.get(m.tjanst_id).push(m);
  }

  const totalt = matchningar.length;
  const nya = matchningar.filter((m) => parseBoolean(m.ny_denna_korning)).length;

  if (isEmpty && !running) {
    return (
      <EmptyState
        icon={Zap}
        title="Inga matchningar än"
        description="Lägg till deltagare och tjänster, sedan kör matchning."
        action={
          <Link to="/deltagare">
            <Button>Lägg till deltagare</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Körningspanel */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h2 className="font-display text-xl">Kör matchning</h2>

        {/* Rekryterare-val */}
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-2">Välj rekryterare att köra för:</p>
          <div className="flex flex-wrap gap-2">
            {REKRYTERARE.map((rek) => {
              const checked = selectedRek.has(rek);
              return (
                <button
                  key={rek}
                  onClick={() => {
                    setSelectedRek((prev) => {
                      const next = new Set(prev);
                      if (next.has(rek)) next.delete(rek);
                      else next.add(rek);
                      return next;
                    });
                  }}
                  style={checked ? { backgroundColor: REK_COLORS[rek], borderColor: REK_COLORS[rek] } : {}}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    checked ? 'text-white' : 'bg-white text-[var(--text-muted)] border-[var(--border)]'
                  }`}
                >
                  {rek}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleKorMatchning}
          loading={running}
          disabled={running || selectedRek.size === 0}
        >
          <Zap className="w-5 h-5" />
          {running ? 'Kör matchning...' : 'Kör matchning'}
        </Button>

        {/* Progress */}
        {Object.keys(progress).length > 0 && (
          <div className="space-y-2">
            {REKRYTERARE.filter((r) => progress[r]).map((rek) => {
              const p = progress[rek];
              return (
                <div key={rek} className="flex items-center gap-3 text-sm">
                  {p.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)] flex-shrink-0" />}
                  {p.status === 'done'    && <CheckCircle className="w-4 h-4 text-[var(--success)] flex-shrink-0" />}
                  {p.status === 'error'   && <XCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0" />}
                  <span
                    className="font-medium w-16"
                    style={{ color: REK_COLORS[rek] }}
                  >
                    {rek}
                  </span>
                  <span className="text-[var(--text-secondary)]">{p.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resultat */}
      {totalt > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)]">{totalt}</span> matchningar,{' '}
              <span className="font-semibold text-[var(--accent-primary)]">{nya}</span> nya
            </p>
            <Link to="/export" className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-primary)] hover:underline">
              <Download className="w-4 h-4" />
              Gå till export
            </Link>
          </div>

          {/* Rekryterare-tabs */}
          <div className="flex border-b border-[var(--border)] mb-4 gap-1 overflow-x-auto">
            {REKRYTERARE.map((rek) => {
              const count = matchningar.filter((m) => m.rekryterare === rek).length;
              const isActive = activeTab === rek;
              return (
                <button
                  key={rek}
                  onClick={() => setActiveTab(rek)}
                  style={isActive ? { borderBottomColor: REK_COLORS[rek] } : {}}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive ? 'text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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

          {/* Tjänster med matchningar */}
          {tabMatchningar.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4">Inga matchningar för {activeTab}.</p>
          ) : (
            <div className="space-y-4">
              {tabTjanster.map((tjanst) => {
                const ms = matchningarPerTjanst.get(tjanst.id);
                if (!ms || ms.length === 0) return null;
                return (
                  <TjanstMatchningar
                    key={tjanst.id}
                    tjanst={tjanst}
                    matchningar={ms}
                    deltagare={deltagare}
                    onEditMotivering={editMotivering}
                    onAddMatchning={addMatchning}
                    onRemoveMatchning={removeMatchning}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

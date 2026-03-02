import { useEffect, useState } from 'react';
import { useTjanster, REKRYTERARE } from '../hooks/useTjanster.js';
import { parseBoolean } from '../lib/utils.js';
import { getDeltagare, getAllCV } from '../lib/supabaseService.js';
import { runScenarioTjanst } from '../lib/matchningService.js';
import TjanstImport from '../components/rekryterare/TjanstImport.jsx';
import TjanstLista from '../components/rekryterare/TjanstLista.jsx';
import ScenarioModal from '../components/scenario/ScenarioModal.jsx';

const REK_COLORS = {
  Petra:  'var(--petra)',
  Nancy:  'var(--nancy)',
  Julia:  'var(--julia)',
  Nikola: 'var(--nikola)',
};

export default function Rekryterare() {
  const { tjanster, loading, error, load, importTjanster, reaktiveraTjanst, updateTjanst, toggleInskickad, deleteTjanst, deleteAllTjanster, getTjansterForRekryterare } = useTjanster();
  const [activeTab, setActiveTab] = useState('Petra');

  // Scenario B – jobb → deltagare
  const [scenario, setScenario] = useState(null); // null | { tjanst, results, loading, error }

  function handleHittaDeltagare(tjanst) {
    setScenario({ tjanst, results: null, loading: false, error: null });
  }

  async function runScenario(extraKontext) {
    if (!scenario) return;
    setScenario((s) => ({ ...s, loading: true, error: null, results: null }));
    try {
      const [allDeltagare, allCv] = await Promise.all([getDeltagare(), getAllCV()]);
      const aktiva = allDeltagare.filter((d) => parseBoolean(d.aktiv));
      const cvMap = new Map();
      for (const cv of allCv) {
        if (!cvMap.has(cv.deltagare_id)) cvMap.set(cv.deltagare_id, []);
        cvMap.get(cv.deltagare_id).push({ rubrik: cv.rubrik, cv_text: cv.cv_text });
      }
      const medCV = aktiva.map((d) => ({ ...d, _cvTexter: cvMap.get(d.id) ?? [] }));
      const results = await runScenarioTjanst(scenario.tjanst, medCV, extraKontext);
      setScenario((s) => ({ ...s, loading: false, results }));
    } catch (err) {
      setScenario((s) => ({ ...s, loading: false, error: err.message }));
    }
  }

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
          onUpdate={updateTjanst}
          onToggleInskickad={toggleInskickad}
          onHittaDeltagare={handleHittaDeltagare}
          onDelete={deleteTjanst}
          onDeleteAll={() => deleteAllTjanster(activeTab)}
        />
      </div>

      {/* Scenario B – modal */}
      {scenario && (
        <ScenarioModal
          mode="tjanst"
          title={`Hitta deltagare för ${scenario.tjanst.tjanst} – ${scenario.tjanst.foretag}`}
          results={scenario.results}
          loading={scenario.loading}
          error={scenario.error}
          onRun={runScenario}
          onClose={() => setScenario(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Target } from 'lucide-react';
import { useDeltagare } from '../hooks/useDeltagare.js';
import { parseBoolean } from '../lib/utils.js';
import { runJobbFokus } from '../lib/jobbFokusService.js';
import Button from '../components/ui/Button.jsx';

const KATEGORI_BADGE = {
  DIREKT:        { label: 'Direkt',        cls: 'bg-green-100 text-green-700' },
  TRANSFERABELT: { label: 'Transferabelt', cls: 'bg-blue-100 text-blue-700' },
  ALTERNATIVT:   { label: 'Alternativt',   cls: 'bg-purple-100 text-purple-700' },
};

const KATEGORI_ORDER = { DIREKT: 0, TRANSFERABELT: 1, ALTERNATIVT: 2 };

function KategoriBadge({ kategori }) {
  const badge = KATEGORI_BADGE[kategori];
  if (!badge) return null;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

export default function JobbFokus() {
  const { deltagare, cvData, loading, load } = useDeltagare();
  useEffect(() => { load(); }, []);

  const [roller, setRoller] = useState([{ titel: '' }]);
  const [extraKontext, setExtraKontext] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState(null); // null = ej startad, {} = pågående/klar
  const [rollerUsed, setRollerUsed] = useState([]);
  const [error, setError] = useState(null);

  const deltagareWithCV = useMemo(() => (
    deltagare
      .filter((d) => parseBoolean(d.aktiv))
      .map((d) => ({
        ...d,
        _cvTexter: cvData.filter((c) => c.deltagare_id === d.id),
      }))
  ), [deltagare, cvData]);

  const deltagareMedCV = deltagareWithCV.filter((d) => d._cvTexter.length > 0);

  function addRoll() {
    if (roller.length >= 30) return;
    setRoller((prev) => [...prev, { titel: '' }]);
  }

  function removeRoll(idx) {
    setRoller((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRoll(idx, titel) {
    setRoller((prev) => prev.map((r, i) => (i === idx ? { ...r, titel } : r)));
  }

  const valideraRoller = roller.filter((r) => r.titel.trim());

  async function handleKor() {
    if (valideraRoller.length === 0 || running) return;
    setRollerUsed(valideraRoller);
    setRunning(true);
    setResults({});
    setError(null);
    setProgress({ done: 0, total: 0 });

    try {
      await runJobbFokus(
        valideraRoller,
        deltagareWithCV,
        extraKontext,
        {
          onProgress: ({ done, total }) => setProgress({ done, total }),
          onMatch: (d, matches) => {
            setResults((prev) => {
              const next = { ...(prev ?? {}) };
              for (const match of matches) {
                if (!next[match.roll_idx]) next[match.roll_idx] = [];
                next[match.roll_idx] = [
                  ...next[match.roll_idx],
                  { deltagare: d, motivering: match.motivering, kategori: match.kategori },
                ];
              }
              return next;
            });
          },
        }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  const progressPct = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Rollinput */}
      <section className="bg-white border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Roller att utvärdera</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Lägg till upp till 30 roller – Claude utvärderar varje aktiv deltagare med CV
            {!loading && ` (${deltagareMedCV.length} st)`} individuellt mot alla roller på en gång.
          </p>
        </div>

        <ul className="space-y-2">
          {roller.map((r, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] w-5 text-right flex-shrink-0">
                {idx + 1}.
              </span>
              <input
                type="text"
                value={r.titel}
                onChange={(e) => updateRoll(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && idx === roller.length - 1) addRoll();
                }}
                placeholder={`T.ex. "IT support", "kock", "lagerarbetare"`}
                disabled={running}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
              />
              {roller.length > 1 && (
                <button
                  onClick={() => removeRoll(idx)}
                  disabled={running}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] rounded transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {roller.length < 30 && (
          <button
            onClick={addRoll}
            disabled={running}
            className="flex items-center gap-1.5 text-sm text-[var(--accent-primary)] hover:underline disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Lägg till roll
          </button>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Extra kontext (valfritt)
          </label>
          <textarea
            value={extraKontext}
            onChange={(e) => setExtraKontext(e.target.value)}
            disabled={running}
            rows={2}
            placeholder="T.ex. krav på B-körkort, jobbar i Stockholmsregionen, öppna för nystartsjobb..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleKor}
            loading={running}
            disabled={valideraRoller.length === 0 || running || deltagareMedCV.length === 0}
          >
            <Target className="w-4 h-4" />
            {running
              ? `Utvärderar... (${progress.done}/${progress.total})`
              : results !== null
              ? 'Kör igen'
              : 'Kör matchning'}
          </Button>
          {deltagareMedCV.length === 0 && !loading && (
            <p className="text-sm text-[var(--text-muted)]">
              Inga aktiva deltagare med uppladdade CV.
            </p>
          )}
        </div>
      </section>

      {/* Progressbar */}
      {running && progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>Utvärderar deltagare individuellt...</span>
            <span>{progress.done} / {progress.total} klara</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Fel */}
      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* Resultat per roll */}
      {results !== null && (
        <div className="space-y-4">
          {rollerUsed.map((roll, idx) => {
            const matches = [...(results[idx] ?? [])].sort(
              (a, b) => (KATEGORI_ORDER[a.kategori] ?? 3) - (KATEGORI_ORDER[b.kategori] ?? 3)
            );
            return (
              <section
                key={idx}
                className="bg-white border border-[var(--border)] rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{roll.titel}</h3>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {matches.length} {matches.length === 1 ? 'träff' : 'träffar'}
                    {running && results[idx] === undefined ? ' – söker...' : ''}
                  </span>
                </div>

                {matches.length === 0 && !running && (
                  <p className="text-sm text-[var(--text-muted)] italic">
                    Inga deltagare passade denna roll.
                  </p>
                )}

                {matches.length > 0 && (
                  <ul className="space-y-3 divide-y divide-[var(--border)]">
                    {matches.map(({ deltagare: d, motivering, kategori }) => (
                      <li key={d.id} className="pt-3 first:pt-0 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{d.visningsnamn}</span>
                          {kategori && <KategoriBadge kategori={kategori} />}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 italic">
                          {motivering}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

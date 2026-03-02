import { useState } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import Button from '../ui/Button.jsx';

/**
 * ScenarioModal – visar resultat för scenario A och B.
 *
 * Props:
 *  mode        "deltagare" | "tjanst"
 *  title       Rubriken i modalen
 *  results     Array av matchningar (null = ej kört än, [] = kört men tomt)
 *  loading     boolean
 *  error       string | null
 *  onRun       (extraKontext) => void – körs när användaren klickar Sök
 *  onClose     () => void
 */
export default function ScenarioModal({ mode, title, results, loading, error, onRun, onClose }) {
  const [extraKontext, setExtraKontext] = useState('');

  const hasRun = results !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={loading ? undefined : onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">{title}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {mode === 'deltagare'
                ? 'Söker mot alla aktiva tjänster hos alla rekryterare'
                : 'Söker bland alla aktiva deltagare med CV'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kontext-input + Sök-knapp (visas alltid, även efter körning) */}
        <div className="px-6 py-4 border-b border-[var(--border)] space-y-2">
          <textarea
            value={extraKontext}
            onChange={(e) => setExtraKontext(e.target.value)}
            placeholder={
              mode === 'deltagare'
                ? 'Lägg till kontext om personen (valfritt)...'
                : 'Lägg till kontext om tjänsten eller vad ni söker (valfritt)...'
            }
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
          />
          <Button
            size="sm"
            onClick={() => onRun(extraKontext)}
            loading={loading}
            disabled={loading}
          >
            <Search className="w-3.5 h-3.5" />
            {hasRun ? 'Sök igen' : 'Sök'}
          </Button>
        </div>

        {/* Resultat */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Söker – det kan ta en liten stund...
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-[var(--danger)] py-4">{error}</p>
          )}

          {!loading && !error && hasRun && results.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] italic py-4 text-center">
              Inga matchningar hittades.
            </p>
          )}

          {!loading && !error && results && results.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {results.length} {results.length === 1 ? 'matchning' : 'matchningar'} hittades
              </p>

              {mode === 'deltagare' ? (
                /* Scenario A: visar jobb */
                <ul className="divide-y divide-[var(--border)]">
                  {results.map(({ tjanst, motivering }, i) => (
                    <li key={i} className="py-3">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {tjanst.tjanst} – {tjanst.foretag}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {tjanst.rekryterare}
                        </span>
                      </div>
                      {tjanst.krav && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Krav: {tjanst.krav}
                        </p>
                      )}
                      <p className="text-sm text-[var(--text-secondary)] mt-1 italic">
                        {motivering}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                /* Scenario B: visar deltagare */
                <ul className="divide-y divide-[var(--border)]">
                  {results.map(({ deltagare, motivering }, i) => (
                    <li key={i} className="py-3">
                      <span className="font-medium text-sm">{deltagare.visningsnamn}</span>
                      <p className="text-sm text-[var(--text-secondary)] mt-1 italic">
                        {motivering}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!loading && !hasRun && (
            <p className="text-sm text-[var(--text-muted)] italic py-4 text-center">
              Klicka på Sök för att starta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

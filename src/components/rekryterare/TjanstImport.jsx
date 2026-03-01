import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button.jsx';

export default function TjanstImport({ rekryterare, onImport, hasTjanster }) {
  const [open, setOpen] = useState(!hasTjanster);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await onImport(text, rekryterare);
      setResult(r);
      if (r.success) setText('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <div>
          <span className="font-semibold">Importera tjänster</span>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Kopiera tre kolumner från Excel: företag, tjänst och krav
          </p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Kopiera tre kolumner från Excel: <strong>företag</strong>, <strong>tjänst</strong> och <strong>krav</strong>. Krav är valfritt.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Nobina\tBusschaufför\tKörkort D, YKB\nICA\tKassapersonal\t"}
            rows={6}
            className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
          <Button onClick={handleImport} loading={loading} disabled={!text.trim()}>
            Importera
          </Button>

          {result && (
            <div className={`text-sm rounded-lg px-4 py-3 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {result.success ? (
                <>
                  <p className="font-medium">Import klar!</p>
                  <p>
                    {result.added} tillagda, {result.updated} uppdaterade,
                    {' '}{result.deactivated} inaktiverade, {result.unchanged} oförändrade
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Fel:</p>
                  {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

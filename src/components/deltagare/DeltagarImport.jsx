import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button.jsx';

export default function DeltagarImport({ onImport, hasDeltagare }) {
  const [open, setOpen] = useState(!hasDeltagare);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await onImport(text);
      setResult(r);
      if (r.success) setText('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <div>
          <span className="font-semibold text-[var(--text-primary)]">Importera deltagare</span>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Klistra in från Excel – namn och slutdatum
          </p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Markera och kopiera två kolumner från Excel: <strong>namn</strong> och <strong>slutdatum</strong>. Klistra in här.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Anna Karlsson\t2026-07-15\nBo Svensson\t2026-08-01"}
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
                  <p>{result.added} tillagda, {result.updated} uppdaterade, {result.unchanged} oförändrade</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Fel i importen:</p>
                  <ul className="mt-1 space-y-0.5">
                    {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </>
              )}
              {result.errors?.length > 0 && result.success && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="font-medium">Varningar:</p>
                  {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

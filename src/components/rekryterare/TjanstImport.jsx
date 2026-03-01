import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button.jsx';
import ImportPreviewModal from '../ui/ImportPreviewModal.jsx';
import { parseTjansterText } from '../../lib/parseImport.js';

const KOLUMNER = [
  { key: 'foretag', label: 'Företag' },
  { key: 'tjanst',  label: 'Tjänst'  },
  { key: 'krav',    label: 'Krav'    },
];

export default function TjanstImport({ rekryterare, onImport, hasTjanster }) {
  const [open, setOpen]             = useState(!hasTjanster);
  const [text, setText]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [previewRows, setPreviewRows] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);

  function handleForhandsgranska() {
    const { rows, errors } = parseTjansterText(text);
    if (rows.length === 0) {
      setParseErrors(errors.length > 0 ? errors : ['Kunde inte tolka någon rad – kontrollera att kolumnerna är tabbseparerade.']);
      return;
    }
    setParseErrors([]);
    setPreviewRows(rows);
  }

  async function handleConfirm(editedRows) {
    setPreviewRows(null);
    setLoading(true);
    setResult(null);
    // Bygg om till tabbseparerad text för att återanvända hook-logiken
    const rebuiltText = editedRows
      .map((r) => [r.foretag, r.tjanst, r.krav ?? ''].join('\t'))
      .join('\n');
    try {
      const r = await onImport(rebuiltText, rekryterare);
      setResult(r);
      if (r.success) setText('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
          {open
            ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
            : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
        </button>

        {open && (
          <div className="px-5 pb-5 space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Kopiera tre kolumner från Excel: <strong>företag</strong>, <strong>tjänst</strong> och <strong>krav</strong>.
              Krav är valfritt. Klicka <em>Förhandsgranska</em> för att kontrollera tolkningen innan du importerar.
            </p>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setParseErrors([]); setResult(null); }}
              placeholder={"Nobina\tBusschaufför\tKörkort D, YKB\nICA\tKassapersonal\t"}
              rows={6}
              className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <Button onClick={handleForhandsgranska} loading={loading} disabled={!text.trim()}>
              Förhandsgranska
            </Button>

            {parseErrors.length > 0 && (
              <div className="text-sm rounded-lg px-4 py-3 bg-red-50 text-red-800">
                <p className="font-medium">Kunde inte tolka texten:</p>
                {parseErrors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}

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

      {previewRows && (
        <ImportPreviewModal
          title={`Granska import – ${rekryterare}`}
          columns={KOLUMNER}
          initialRows={previewRows}
          onConfirm={handleConfirm}
          onClose={() => setPreviewRows(null)}
        />
      )}
    </>
  );
}

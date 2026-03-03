import { useState } from 'react';
import { validatePassword, getSession } from '../lib/auth.js';
import { useDeltagare } from '../hooks/useDeltagare.js';
import { useTjanster } from '../hooks/useTjanster.js';
import { useMatchning } from '../hooks/useMatchning.js';
import Button from '../components/ui/Button.jsx';
import bcrypt from 'bcryptjs';
import {
  DEFAULT_AF_QUERY_INSTRUCTIONS,
  DEFAULT_AF_RANK_INSTRUCTIONS,
} from '../lib/matchningLogic.js';
import {
  STORAGE_KEY_QUERY,
  STORAGE_KEY_RANK,
} from '../lib/afJobsService.js';

export default function Installningar() {
  const [gammalt, setGammalt] = useState('');
  const [nytt, setNytt] = useState('');
  const [bekrafta, setBekrafta] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  // AF-instruktioner (localStorage)
  const [queryInstr, setQueryInstr] = useState(
    () => localStorage.getItem(STORAGE_KEY_QUERY) || DEFAULT_AF_QUERY_INSTRUCTIONS
  );
  const [rankInstr, setRankInstr] = useState(
    () => localStorage.getItem(STORAGE_KEY_RANK) || DEFAULT_AF_RANK_INSTRUCTIONS
  );
  const [instrSaved, setInstrSaved] = useState(false);

  function saveAfInstructions() {
    localStorage.setItem(STORAGE_KEY_QUERY, queryInstr);
    localStorage.setItem(STORAGE_KEY_RANK, rankInstr);
    setInstrSaved(true);
    setTimeout(() => setInstrSaved(false), 2000);
  }

  function resetAfInstructions() {
    localStorage.removeItem(STORAGE_KEY_QUERY);
    localStorage.removeItem(STORAGE_KEY_RANK);
    setQueryInstr(DEFAULT_AF_QUERY_INSTRUCTIONS);
    setRankInstr(DEFAULT_AF_RANK_INSTRUCTIONS);
  }

  const { deltagare, cvData, load: loadD } = useDeltagare();
  const { tjanster } = useTjanster();
  const { matchningar } = useMatchning();

  const session = getSession();

  async function handleBytLösenord(e) {
    e.preventDefault();
    setPwMsg(null);

    if (nytt !== bekrafta) {
      setPwMsg({ type: 'error', text: 'De nya lösenorden matchar inte.' });
      return;
    }
    if (nytt.length < 8) {
      setPwMsg({ type: 'error', text: 'Lösenordet måste vara minst 8 tecken.' });
      return;
    }

    setPwLoading(true);
    try {
      const ok = await validatePassword(gammalt);
      if (!ok) {
        setPwMsg({ type: 'error', text: 'Fel nuvarande lösenord.' });
        return;
      }

      const hash = await bcrypt.hash(nytt, 10);
      setPwMsg({
        type: 'success',
        text: `Lösenordet verifierades. Uppdatera nu VITE_APP_PASSWORD_HASH i din .env:\n${hash}`,
      });
      setGammalt('');
      setNytt('');
      setBekrafta('');
    } catch {
      setPwMsg({ type: 'error', text: 'Ett fel uppstod.' });
    } finally {
      setPwLoading(false);
    }
  }

  function handleExport() {
    setExportLoading(true);
    const data = {
      exportDatum: new Date().toISOString(),
      deltagare,
      cv: cvData,
      tjanster,
      matchningar,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coachmatch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Databas-status */}
      <section className="bg-white border border-[var(--border)] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Databas-status (Supabase)</h2>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-[var(--text-muted)]">Session: </span>
            <span className="text-[var(--success)] font-medium">Aktiv</span>
          </p>
        </div>
      </section>

      {/* Byt lösenord */}
      <section className="bg-white border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold mb-4">Byt lösenord</h2>
        <form onSubmit={handleBytLösenord} className="space-y-3">
          <InputField label="Nuvarande lösenord" value={gammalt} onChange={setGammalt} />
          <InputField label="Nytt lösenord" value={nytt} onChange={setNytt} />
          <InputField label="Bekräfta nytt lösenord" value={bekrafta} onChange={setBekrafta} />

          <Button type="submit" loading={pwLoading} disabled={!gammalt || !nytt || !bekrafta}>
            Generera ny hash
          </Button>

          {pwMsg && (
            <div className={`text-sm rounded-lg px-4 py-3 whitespace-pre-wrap ${
              pwMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {pwMsg.text}
            </div>
          )}
        </form>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Lösenordshashen visas ovan – klistra in den i din .env som VITE_APP_PASSWORD_HASH och starta om appen.
        </p>
      </section>

      {/* Exportera data */}
      <section className="bg-white border border-[var(--border)] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Exportera data (backup)</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Laddar ner all data som JSON-fil.
        </p>
        <Button variant="secondary" loading={exportLoading} onClick={handleExport}>
          Exportera JSON
        </Button>
      </section>

      {/* AF-jobbtips: instruktioner */}
      <section className="bg-white border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold">AF-jobbtips – instruktioner</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Styr hur Claude söker och rankar jobb på Arbetsförmedlingen. Sparas lokalt i din webbläsare.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Söktermsgenerering
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            Instruktioner för att generera sökord till AF:s platsbank (3 termer per sökning).
          </p>
          <textarea
            value={queryInstr}
            onChange={(e) => setQueryInstr(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-y font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Rankningsbedömning
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            Instruktioner för hur Claude väljer och motiverar de 10 bästa jobben.
          </p>
          <textarea
            value={rankInstr}
            onChange={(e) => setRankInstr(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-y font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={saveAfInstructions}>
            {instrSaved ? 'Sparad!' : 'Spara instruktioner'}
          </Button>
          <Button variant="ghost" onClick={resetAfInstructions}>
            Återställ standard
          </Button>
        </div>
      </section>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
      />
    </div>
  );
}

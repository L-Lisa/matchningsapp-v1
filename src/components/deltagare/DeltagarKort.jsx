import { useState } from 'react';
import { Upload, Trash2, RotateCcw, Edit2, Check, X, Briefcase, Loader2, Copy, ExternalLink } from 'lucide-react';
import { weeksUntil, formatDate, parseBoolean } from '../../lib/utils.js';
import { runAfJobSearch } from '../../lib/afJobsService.js';
import KategoriCheckboxar from './KategoriCheckboxar.jsx';
import CVModal from './CVModal.jsx';
import Button from '../ui/Button.jsx';

const KATEGORI_BADGE = {
  DIREKT:        { label: 'Direkt',        cls: 'bg-green-100 text-green-700' },
  TRANSFERABELT: { label: 'Transferabelt', cls: 'bg-blue-100 text-blue-700' },
  ALTERNATIVT:   { label: 'Alternativt',   cls: 'bg-purple-100 text-purple-700' },
};

function KategoriBadge({ kategori }) {
  const badge = KATEGORI_BADGE[kategori];
  if (!badge) return null;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

function SlutdatumBadge({ slutdatum }) {
  const w = weeksUntil(slutdatum);
  let cls = 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  if (w !== null && w < 0) cls = 'bg-red-100 text-red-700';
  else if (w !== null && w < 6) cls = 'bg-red-100 text-red-700';
  else if (w !== null && w < 12) cls = 'bg-orange-100 text-orange-700';

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {formatDate(slutdatum)}
    </span>
  );
}

export default function DeltagarKort({
  deltagare,
  cvList,
  onUpdateFritext,
  onUpdateKategorier,
  onArkivera,
  onResetMatchraknare,
  onSaveCv,
  onDeleteCv,
  onHittaJobb,
}) {
  const [editFritext, setEditFritext] = useState(false);
  const [fritext, setFritext] = useState(deltagare.fritext ?? '');
  const [savingFritext, setSavingFritext] = useState(false);
  const [cvModal, setCvModal] = useState(null); // null | { existingCv? }
  const [confirmDeleteCvId, setConfirmDeleteCvId] = useState(null);
  const [confirmArkivera, setConfirmArkivera] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [arkiveraLoading, setArkiveraLoading] = useState(false);

  // AF-jobbtips
  const [afKontext, setAfKontext] = useState('');
  const [afState, setAfState] = useState(null); // null | { loading, results, error }
  const [copied, setCopied] = useState(false);

  async function handleAfSearch() {
    if (cvList.length === 0) return;
    setAfState({ loading: true, results: null, error: null });
    try {
      const cvTexter = cvList.map((c) => ({ rubrik: c.rubrik, cv_text: c.cv_text }));
      const results = await runAfJobSearch(deltagare, cvTexter, afKontext);
      setAfState({ loading: false, results, error: null });
    } catch (err) {
      setAfState({ loading: false, results: null, error: err.message });
    }
  }

  function copyAll() {
    if (!afState?.results?.length) return;
    const lines = [`${afState.results.length} jobbtips för ${deltagare.visningsnamn}:\n`];
    afState.results.forEach(({ job, motivering, kategori }, i) => {
      const tag = kategori ? ` [${KATEGORI_BADGE[kategori]?.label ?? kategori}]` : '';
      lines.push(`${i + 1}. ${job.headline} – ${job.employer}${tag}`);
      lines.push(`   ${motivering}`);
      if (job.url) lines.push(`   Ansök: ${job.url}`);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveFritext() {
    setSavingFritext(true);
    await onUpdateFritext(deltagare.id, fritext);
    setSavingFritext(false);
    setEditFritext(false);
  }

  async function handleArkivera() {
    setArkiveraLoading(true);
    await onArkivera(deltagare.id);
    setArkiveraLoading(false);
    setConfirmArkivera(false);
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--text-primary)]">{deltagare.visningsnamn}</span>
            <SlutdatumBadge slutdatum={deltagare.slutdatum} />
          </div>
        </div>

        {/* Matchräknare */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] flex-shrink-0">
          <span className="font-medium">{deltagare.matchraknare ?? 0} matchningar</span>
          {confirmReset ? (
            <div className="flex gap-1">
              <button
                onClick={() => { onResetMatchraknare(deltagare.id); setConfirmReset(false); }}
                className="text-[var(--danger)] hover:underline"
              >Nollställ</button>
              <button onClick={() => setConfirmReset(false)}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              title="Nollställ matchräknare"
              className="p-0.5 hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Fritext */}
      <div>
        {editFritext ? (
          <div className="space-y-2">
            <textarea
              value={fritext}
              onChange={(e) => setFritext(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Anteckningar om intressen, öppenhet, övrigt..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--accent-primary)] bg-[var(--bg-primary)] focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveFritext} loading={savingFritext}>
                <Check className="w-3.5 h-3.5" /> Spara
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditFritext(false); setFritext(deltagare.fritext ?? ''); }}>
                <X className="w-3.5 h-3.5" /> Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditFritext(true)}
            className="w-full text-left group"
          >
            {fritext ? (
              <p className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {fritext}
                <Edit2 className="inline w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-60" />
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic group-hover:text-[var(--text-secondary)]">
                Klicka för att lägga till anteckningar...
              </p>
            )}
          </button>
        )}
      </div>

      {/* Kategorier */}
      <KategoriCheckboxar
        deltagare={deltagare}
        onChange={(kat) => onUpdateKategorier(deltagare.id, kat)}
      />

      {/* CV-lista */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">CV ({cvList.length}/4)</span>
          {cvList.length < 4 && (
            <button
              onClick={() => setCvModal({})}
              className="flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:underline font-medium"
            >
              <Upload className="w-3.5 h-3.5" /> Ladda upp CV
            </button>
          )}
        </div>

        {cvList.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">Inget CV uppladdad ännu</p>
        ) : (
          <ul className="space-y-1">
            {cvList.map((cv) => (
              <li key={cv.id} className="flex items-center justify-between gap-2 text-sm py-1">
                <button
                  onClick={() => setCvModal({ existingCv: cv })}
                  className="text-[var(--accent-primary)] hover:underline text-left"
                >
                  {cv.rubrik}
                </button>
                {confirmDeleteCvId === cv.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { onDeleteCv(cv.id); setConfirmDeleteCvId(null); }}
                      className="text-xs text-[var(--danger)] hover:underline font-medium"
                    >
                      Radera
                    </button>
                    <button
                      onClick={() => setConfirmDeleteCvId(null)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteCvId(cv.id)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] rounded transition-colors"
                    title="Ta bort CV"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* AF-jobbtips */}
      {cvList.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3 space-y-2">
          <textarea
            value={afKontext}
            onChange={(e) => setAfKontext(e.target.value)}
            placeholder="Lägg till kontext (valfritt) – t.ex. vill ha IT-jobb, långt från arbetsmarknaden..."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAfSearch}
            loading={afState?.loading}
            disabled={afState?.loading}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Hitta jobb på AF
          </Button>

          {/* Laddning */}
          {afState?.loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Söker på Arbetsförmedlingen – tar en liten stund...
            </div>
          )}

          {/* Fel */}
          {!afState?.loading && afState?.error && (
            <p className="text-xs text-[var(--danger)]">{afState.error}</p>
          )}

          {/* Inga resultat */}
          {!afState?.loading && afState?.results?.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] italic">Inga matchande jobb hittades.</p>
          )}

          {/* Resultat */}
          {!afState?.loading && afState?.results?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  {afState.results.length} jobbtips
                </span>
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Kopierat!' : 'Kopiera alla'}
                </button>
              </div>
              <ul className="space-y-3">
                {afState.results.map(({ job, motivering, kategori }) => (
                  <li key={job.id} className="text-sm border-l-2 border-[var(--border)] pl-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{job.headline}</span>
                          {job.employer && (
                            <span className="text-[var(--text-muted)]">– {job.employer}</span>
                          )}
                          {kategori && <KategoriBadge kategori={kategori} />}
                        </div>
                        {job.municipality && (
                          <span className="text-xs text-[var(--text-muted)]">{job.municipality}</span>
                        )}
                      </div>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-[var(--accent-primary)] hover:opacity-70"
                          title="Öppna på AF"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 italic">{motivering}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Hitta jobb + Arkivera */}
      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
        {confirmArkivera ? (
          <div className="flex gap-2 items-center text-sm">
            <span className="text-[var(--text-secondary)]">Arkivera {deltagare.visningsnamn}?</span>
            <Button size="sm" variant="danger" loading={arkiveraLoading} onClick={handleArkivera}>
              Bekräfta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmArkivera(false)}>Avbryt</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onHittaJobb && cvList.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => onHittaJobb(deltagare, cvList)}>
                <Briefcase className="w-3.5 h-3.5" /> Hitta jobb
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConfirmArkivera(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Arkivera
            </Button>
          </div>
        )}
      </div>

      {/* CV Modal */}
      {cvModal !== null && (
        <CVModal
          deltagare={deltagare}
          existingCv={cvModal.existingCv ?? null}
          onSave={(rubrik, text, id) => onSaveCv(deltagare.id, rubrik, text, id)}
          onClose={() => setCvModal(null)}
        />
      )}
    </div>
  );
}

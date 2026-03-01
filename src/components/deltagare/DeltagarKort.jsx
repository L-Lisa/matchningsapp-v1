import { useState } from 'react';
import { Upload, Trash2, RotateCcw, Edit2, Check, X } from 'lucide-react';
import { weeksUntil, formatDate, parseBoolean } from '../../lib/utils.js';
import KategoriCheckboxar from './KategoriCheckboxar.jsx';
import CVModal from './CVModal.jsx';
import Button from '../ui/Button.jsx';

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
}) {
  const [editFritext, setEditFritext] = useState(false);
  const [fritext, setFritext] = useState(deltagare.fritext ?? '');
  const [savingFritext, setSavingFritext] = useState(false);
  const [cvModal, setCvModal] = useState(null); // null | { existingCv? }
  const [confirmDeleteCvId, setConfirmDeleteCvId] = useState(null);
  const [confirmArkivera, setConfirmArkivera] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [arkiveraLoading, setArkiveraLoading] = useState(false);

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

      {/* Arkivera */}
      <div className="pt-2 border-t border-[var(--border)]">
        {confirmArkivera ? (
          <div className="flex gap-2 items-center text-sm">
            <span className="text-[var(--text-secondary)]">Arkivera {deltagare.visningsnamn}?</span>
            <Button size="sm" variant="danger" loading={arkiveraLoading} onClick={handleArkivera}>
              Bekräfta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmArkivera(false)}>Avbryt</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmArkivera(true)}>
            <Trash2 className="w-3.5 h-3.5" /> Arkivera
          </Button>
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

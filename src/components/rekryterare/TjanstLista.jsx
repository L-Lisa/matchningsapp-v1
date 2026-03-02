import { useState } from 'react';
import { parseBoolean } from '../../lib/utils.js';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { Briefcase, Trash2, Pencil, Check, X } from 'lucide-react';

export default function TjanstLista({ tjanster, rekryterare, onReaktivera, onUpdate, onToggleInskickad, onDelete, onDeleteAll }) {
  const [filter, setFilter] = useState('aktiva');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ foretag: '', tjanst: '', krav: '' });
  const [saving, setSaving] = useState(false);

  function startEdit(t) {
    setEditingId(t.id);
    setEditDraft({ foretag: t.foretag, tjanst: t.tjanst, krav: t.krav ?? '' });
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSave(id) {
    if (!editDraft.foretag.trim() || !editDraft.tjanst.trim()) return;
    setSaving(true);
    try {
      await onUpdate(id, {
        foretag: editDraft.foretag.trim(),
        tjanst:  editDraft.tjanst.trim(),
        krav:    editDraft.krav.trim(),
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await onDeleteAll();
    } finally {
      setDeletingAll(false);
      setConfirmDeleteAll(false);
    }
  }

  const filtered = tjanster
    .filter((t) => {
      if (filter === 'aktiva')   return parseBoolean(t.aktiv);
      if (filter === 'inaktiva') return !parseBoolean(t.aktiv);
      return true;
    })
    .sort((a, b) => (Number(a.sorteringsordning) || 0) - (Number(b.sorteringsordning) || 0));

  if (tjanster.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title={`Inga tjänster för ${rekryterare} än`}
        description="Klistra in listan ovan för att komma igång."
      />
    );
  }

  return (
    <div>
      {/* Filter + Rensa lista */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1 w-fit">
          {[['aktiva', 'Aktiva'], ['inaktiva', 'Inaktiva'], ['alla', 'Alla']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === v
                  ? 'bg-white text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Rensa hela listan */}
        {confirmDeleteAll ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Radera alla tjänster för {rekryterare}?</span>
            <Button size="sm" variant="danger" loading={deletingAll} onClick={handleDeleteAll}>
              Ja, rensa
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteAll(false)}>
              Avbryt
            </Button>
          </div>
        ) : (
          <button
            onClick={() => { setConfirmDeleteAll(true); setConfirmDeleteId(null); setEditingId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 transition-colors border border-[var(--border)]"
          >
            <Trash2 className="w-3.5 h-3.5" /> Rensa lista
          </button>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map((t) => {
          const aktiv = parseBoolean(t.aktiv);
          const isEditing = editingId === t.id;

          return (
            <div
              key={t.id}
              className={`rounded-lg border transition-colors ${
                isEditing
                  ? 'bg-[var(--accent-light)] border-[var(--accent-primary)]'
                  : aktiv
                  ? 'bg-white border-[var(--border)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border)] opacity-60'
              }`}
            >
              {isEditing ? (
                /* ── Redigeringsläge ── */
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Företag</label>
                      <input
                        type="text"
                        value={editDraft.foretag}
                        onChange={(e) => setEditDraft((d) => ({ ...d, foretag: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--accent-primary)] bg-white focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Tjänst</label>
                      <input
                        type="text"
                        value={editDraft.tjanst}
                        onChange={(e) => setEditDraft((d) => ({ ...d, tjanst: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Krav</label>
                    <input
                      type="text"
                      value={editDraft.krav}
                      onChange={(e) => setEditDraft((d) => ({ ...d, krav: e.target.value }))}
                      placeholder="T.ex. B-körkort, restaurangerfarenhet"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(t.id)}
                      loading={saving}
                      disabled={!editDraft.foretag.trim() || !editDraft.tjanst.trim()}
                    >
                      <Check className="w-3.5 h-3.5" /> Spara
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5" /> Avbryt
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Visningsläge ── */
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={parseBoolean(t.inskickad)}
                      onChange={() => onToggleInskickad(t.id, parseBoolean(t.inskickad))}
                      title="Inskickad"
                      className="mt-0.5 flex-shrink-0 w-4 h-4 accent-[var(--accent-primary)] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p className={`font-medium text-sm ${parseBoolean(t.inskickad) ? 'line-through text-[var(--text-muted)]' : ''}`}>
                        {t.foretag} – {t.tjanst}
                      </p>
                      {t.krav && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Krav: {t.krav}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!aktiv && (
                      <Button size="sm" variant="secondary" onClick={() => onReaktivera(t.id)}>
                        Reaktivera
                      </Button>
                    )}

                    {/* Redigera */}
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-light)] transition-colors"
                      title="Redigera tjänst"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Radera med bekräftelse */}
                    {confirmDeleteId === t.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deleting}
                          onClick={() => handleDelete(t.id)}
                        >
                          Bekräfta
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                          Avbryt
                        </Button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setConfirmDeleteId(t.id); setEditingId(null); }}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 transition-colors"
                        title="Ta bort tjänst"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

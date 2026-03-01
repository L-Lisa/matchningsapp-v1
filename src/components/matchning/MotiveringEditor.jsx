import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { parseBoolean } from '../../lib/utils.js';

export default function MotiveringEditor({ matchning, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(matchning.ai_motivering ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    await onSave(matchning.id, text.trim());
    setSaving(false);
    setEditing(false);
  }

  const isEdited = parseBoolean(matchning.ai_motivering_redigerad);

  if (editing) {
    return (
      <div className="mt-1 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          rows={3}
          className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--accent-primary)] bg-[var(--bg-primary)] focus:outline-none resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button
            onClick={() => { setEditing(false); setText(matchning.ai_motivering ?? ''); }}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
            Avbryt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 group/mot flex items-start gap-2">
      <p className="text-sm text-[var(--text-secondary)] flex-1">
        {matchning.ai_motivering}
        {isEdited && (
          <span className="ml-1.5 text-xs text-[var(--text-muted)] italic">✏ Redigerad</span>
        )}
      </p>
      <button
        onClick={() => setEditing(true)}
        className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] opacity-0 group-hover/mot:opacity-100 transition-opacity"
        title="Redigera motivering"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

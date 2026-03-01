import { useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import Button from './Button.jsx';

/**
 * Generisk förhandsgranskning av importdata.
 *
 * Props:
 *   title        – rubrik i modalen
 *   columns      – [{ key, label }] kolumnkonfiguration
 *   initialRows  – parsade rader att visa och redigera
 *   onConfirm    – (editedRows) => void  anropas med redigerade rader
 *   onClose      – () => void
 */
export default function ImportPreviewModal({ title, columns, initialRows, onConfirm, onClose }) {
  const [rows, setRows] = useState(() =>
    initialRows.map((r, i) => ({ ...r, _key: i }))
  );

  function updateCell(key, field, value) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  function deleteRow(key) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  function addRow() {
    const empty = { _key: Date.now() };
    columns.forEach((c) => { empty[c.key] = ''; });
    setRows((prev) => [...prev, empty]);
  }

  function handleConfirm() {
    const cleaned = rows
      .filter((r) => columns.some((c) => r[c.key]?.trim()))
      .map(({ _key, ...rest }) => rest);
    onConfirm(cleaned);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-display text-xl text-[var(--text-primary)]">{title}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Kontrollera att varje rad tolkades rätt. Klicka i en cell för att redigera.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] ml-4 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabell */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left pb-2 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border)]"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="w-8 border-b border-[var(--border)]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._key} className="group border-b border-[var(--bg-secondary)] last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="py-1 pr-2">
                      <input
                        value={row[c.key] ?? ''}
                        onChange={(e) => updateCell(row._key, c.key, e.target.value)}
                        className="w-full px-2 py-1 rounded border border-transparent hover:border-[var(--border)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] bg-transparent text-sm"
                      />
                    </td>
                  ))}
                  <td className="py-1">
                    <button
                      onClick={() => deleteRow(row._key)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Ta bort rad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={addRow}
            className="mt-3 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Lägg till rad
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-primary)] rounded-b-2xl">
          <p className="text-sm text-[var(--text-muted)]">{rows.length} rader</p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Avbryt</Button>
            <Button onClick={handleConfirm} disabled={rows.length === 0}>
              Importera {rows.length} poster
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

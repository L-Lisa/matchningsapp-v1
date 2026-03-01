import { useState, useRef } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { extractCVText } from '../../lib/cvExtraktion.js';

export default function CVModal({ deltagare, existingCv, onSave, onClose }) {
  const [rubrik, setRubrik] = useState(existingCv?.rubrik ?? '');
  const [cvText, setCvText] = useState(existingCv?.cv_text ?? '');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractError('');
    const result = await extractCVText(file);
    setExtracting(false);
    if (result.error) {
      setExtractError(result.error);
    } else {
      setCvText(result.text);
    }
    // Rensa file input så samma fil kan laddas igen
    e.target.value = '';
  }

  async function handleSave() {
    if (!rubrik.trim() || !cvText.trim()) return;
    setSaving(true);
    try {
      await onSave(rubrik.trim(), cvText.trim(), existingCv?.id ?? null);
      onClose();
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-display text-xl">
            {existingCv ? 'Ersätt CV' : 'Lägg till CV'} – {deltagare.visningsnamn}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Rubrik */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
              Rubrik (t.ex. "Säljare", "Controller")
            </label>
            <input
              type="text"
              value={rubrik}
              onChange={(e) => setRubrik(e.target.value)}
              placeholder="CV-rubrik"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>

          {/* Filuppladdning */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
              Ladda upp CV (PDF eller DOCX)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFile}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={extracting}
            >
              <Upload className="w-4 h-4" />
              {extracting ? 'Extraherar text...' : 'Välj fil'}
            </Button>
            {extractError && (
              <p className="mt-2 text-sm text-[var(--danger)]">{extractError}</p>
            )}
          </div>

          {/* CV-text */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
              Extraherad CV-text <span className="text-[var(--text-muted)] font-normal">(redigera vid behov)</span>
            </label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="CV-text visas här efter uppladdning, eller klistra in manuellt..."
              rows={12}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!rubrik.trim() || !cvText.trim()}
          >
            <FileText className="w-4 h-4" />
            Spara CV
          </Button>
        </div>
      </div>
    </div>
  );
}

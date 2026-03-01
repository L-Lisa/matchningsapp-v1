import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { formatDate } from '../../lib/utils.js';
import CVModal from './CVModal.jsx';

export default function NyaDeltagarPrompt({ nyaDeltagare, cvData, onSaveCv, onDismiss }) {
  const [cvModal, setCvModal] = useState(null);

  // Dölj deltagare som redan fått CV
  const saknarCv = nyaDeltagare.filter(
    (d) => !cvData.some((c) => c.deltagare_id === d.id)
  );

  if (saknarCv.length === 0) return null;

  return (
    <div className="bg-[var(--accent-light)] border border-[var(--accent-primary)]/30 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-[var(--accent-primary)]">
            {saknarCv.length} nya deltagare saknar CV
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Ladda upp CV för varje ny deltagare innan du kör matchning.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="space-y-2">
        {saknarCv.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 bg-white rounded-lg px-4 py-2.5">
            <div>
              <span className="font-medium text-sm">{d.visningsnamn}</span>
              <span className="text-xs text-[var(--text-muted)] ml-2">
                Slutar {formatDate(d.slutdatum)}
              </span>
            </div>
            <button
              onClick={() => setCvModal(d)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:underline"
            >
              <Upload className="w-3.5 h-3.5" />
              Ladda upp CV
            </button>
          </li>
        ))}
      </ul>

      {cvModal && (
        <CVModal
          deltagare={cvModal}
          existingCv={null}
          onSave={(rubrik, text) => onSaveCv(cvModal.id, rubrik, text, null)}
          onClose={() => setCvModal(null)}
        />
      )}
    </div>
  );
}

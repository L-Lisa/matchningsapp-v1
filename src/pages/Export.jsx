import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useDeltagare } from '../hooks/useDeltagare.js';
import { useTjanster, REKRYTERARE } from '../hooks/useTjanster.js';
import { useMatchning } from '../hooks/useMatchning.js';
import { buildExportText, getSenasteKorningDatum } from '../lib/exportService.js';
import { formatDate } from '../lib/utils.js';
import CopyButton from '../components/ui/CopyButton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const REK_COLORS = {
  Petra:  'var(--petra)',
  Nancy:  'var(--nancy)',
  Julia:  'var(--julia)',
  Nikola: 'var(--nikola)',
};

export default function Export() {
  const { deltagare, load: loadD } = useDeltagare();
  const { tjanster, load: loadT } = useTjanster();
  const { matchningar, load: loadM } = useMatchning();

  useEffect(() => {
    loadD();
    loadT();
    loadM();
  }, []);

  const harNagonMatchning = matchningar.length > 0;

  if (!harNagonMatchning) {
    return (
      <EmptyState
        icon={Download}
        title="Kör en matchning först"
        description="Exportlistorna genereras automatiskt när du kör en matchning."
      />
    );
  }

  return (
    <div className="space-y-6">
      {REKRYTERARE.map((rek) => {
        const rekMatchningar = matchningar.filter((m) => m.rekryterare === rek);
        if (rekMatchningar.length === 0) return null;

        const korningDatum = getSenasteKorningDatum(rek, matchningar);
        const exportText = buildExportText(rek, rekMatchningar, tjanster, deltagare, korningDatum);

        return (
          <div
            key={rek}
            className="bg-white border border-[var(--border)] rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div
              className="px-5 py-4 border-b border-[var(--border)]"
              style={{ borderLeftWidth: 4, borderLeftColor: REK_COLORS[rek] }}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-display text-xl" style={{ color: REK_COLORS[rek] }}>
                    {rek}
                  </h2>
                  {korningDatum && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Senaste körning: {formatDate(korningDatum)}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">
                    {rekMatchningar.length} matchningar
                  </p>
                </div>
                <CopyButton
                  text={exportText}
                  label={`Kopiera lista för ${rek}`}
                />
              </div>
            </div>

            {/* Preview */}
            <pre className="px-5 py-4 text-xs text-[var(--text-secondary)] overflow-x-auto max-h-80 whitespace-pre-wrap font-mono leading-relaxed">
              {exportText}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

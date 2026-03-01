import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Users, Briefcase, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { useDeltagare } from '../hooks/useDeltagare.js';
import { useTjanster } from '../hooks/useTjanster.js';
import { useMatchning } from '../hooks/useMatchning.js';
import { weeksUntil, formatDate, parseBoolean } from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { deltagare, load: loadDeltagare, loading: loadingD, arkiveraDeltagare } = useDeltagare();
  const { tjanster, load: loadTjanster } = useTjanster();
  const { matchningar, load: loadMatchning } = useMatchning();
  const [arkiveringId, setArkiveringId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    loadDeltagare();
    loadTjanster();
    loadMatchning();
  }, []);

  const aktiva = deltagare.filter((d) => parseBoolean(d.aktiv));
  const aktivaTjanster = tjanster.filter((t) => parseBoolean(t.aktiv));
  const isEmpty = aktiva.length === 0 && aktivaTjanster.length === 0;

  // Deltagare med < 6 veckor kvar
  const nararSlut = aktiva.filter((d) => {
    const w = weeksUntil(d.slutdatum);
    return w !== null && w >= 0 && w < 6;
  });

  // Deltagare vars slutdatum passerat (bör arkiveras)
  const utgangna = aktiva.filter((d) => {
    const w = weeksUntil(d.slutdatum);
    return w !== null && w < 0;
  });

  // Senaste matchningsdatum
  const senasteMatch = matchningar.length > 0
    ? matchningar.sort((a, b) => new Date(b.korning_datum) - new Date(a.korning_datum))[0]?.korning_datum
    : null;

  async function handleArkivera(id) {
    setArkiveringId(id);
    try {
      await arkiveraDeltagare(id);
    } finally {
      setArkiveringId(null);
      setConfirmId(null);
    }
  }

  if (isEmpty && !loadingD) {
    return (
      <EmptyState
        icon={Users}
        title="Välkommen till CoachMatch!"
        description="Börja med att lägga till dina deltagare och rekryterarnas tjänstelistor."
        action={
          <Link to="/deltagare">
            <Button>Lägg till deltagare <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Aktiva deltagare"
          value={aktiva.length}
          icon={<Users className="w-5 h-5 text-[var(--accent-primary)]" />}
          to="/deltagare"
        />
        <StatCard
          label="Aktiva tjänster"
          value={aktivaTjanster.length}
          icon={<Briefcase className="w-5 h-5 text-[var(--accent-primary)]" />}
          to="/rekryterare"
        />
        <StatCard
          label="Senaste matchning"
          value={senasteMatch ? formatDate(senasteMatch) : '—'}
          icon={<Zap className="w-5 h-5 text-[var(--accent-primary)]" />}
          to="/matchning"
        />
      </div>

      {/* Varning: nära slutdatum */}
      {nararSlut.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--danger)] mb-2">
                {nararSlut.length} deltagare med under 6 veckor kvar
              </h3>
              <ul className="space-y-1">
                {nararSlut.map((d) => {
                  const w = weeksUntil(d.slutdatum);
                  return (
                    <li key={d.id} className="text-sm text-red-700">
                      <span className="font-medium">{d.visningsnamn}</span>
                      {' – '}
                      {w === 0 ? 'slut denna vecka' : `${w} veckor kvar`}
                      {' ('}
                      {formatDate(d.slutdatum)}
                      {')'}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Arkiveringsförslag */}
      {utgangna.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-2">
                {utgangna.length} deltagare med passerat slutdatum
              </h3>
              <ul className="space-y-2">
                {utgangna.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-yellow-800">
                      <span className="font-medium">{d.visningsnamn}</span>
                      {' – slutade '}
                      {formatDate(d.slutdatum)}
                    </span>
                    {confirmId === d.id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          loading={arkiveringId === d.id}
                          onClick={() => handleArkivera(d.id)}
                        >
                          Bekräfta arkivering
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                          Avbryt
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmId(d.id)}>
                        Granska
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-[var(--accent-light)] border border-[var(--accent-primary)]/20 rounded-xl p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl mb-1">Redo att köra matchning?</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Matcha dina {aktiva.length} aktiva deltagare mot {aktivaTjanster.length} tjänster.
          </p>
        </div>
        <Button size="lg" onClick={() => navigate('/matchning')}>
          <Zap className="w-5 h-5" />
          Kör matchning
        </Button>
      </div>

      {/* Snabblänkar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/deltagare', label: 'Deltagare', icon: Users },
          { to: '/rekryterare', label: 'Rekryterare', icon: Briefcase },
          { to: '/matchning', label: 'Matchning', icon: Zap },
          { to: '/export', label: 'Export', icon: CheckCircle },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[var(--border)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-light)] transition-colors text-sm font-medium text-[var(--text-secondary)]"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, to }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-[var(--border)] p-4 flex items-center gap-4 hover:border-[var(--accent-primary)] transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
      </div>
    </Link>
  );
}

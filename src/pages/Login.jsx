import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePassword, setSession, isAuthenticated } from '../lib/auth.js';

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await validatePassword(password);
      if (!ok) {
        setError('Fel lösenord. Försök igen.');
        setPassword('');
        return;
      }
      setSession();
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Ett fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">CoachMatch</h1>
          <p className="text-sm text-[var(--text-muted)]">Matchningsverktyg för jobbcoacher</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8">
          <h2 className="font-semibold text-lg mb-6 text-center">Logga in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
                Lösenord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Ange lösenord"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Kontrollerar...' : 'Logga in'}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-[var(--danger)] text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

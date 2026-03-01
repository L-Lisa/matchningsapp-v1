import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { validatePassword, setSession, setGoogleToken, isAuthenticated } from '../lib/auth.js';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState('google'); // 'google' | 'password'
  const [googleUser, setGoogleUser] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redan inloggad? Redirecta direkt
  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        // Hämta användarinfo
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!res.ok) throw new Error('Kunde inte hämta Google-kontoinfo');
        const info = await res.json();
        setGoogleToken(tokenResponse.access_token);
        setGoogleUser({ email: info.email, name: info.name });
        setStep('password');
      } catch (err) {
        setError('Inloggning med Google misslyckades. Försök igen.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google-inloggning avbröts eller misslyckades.');
    },
  });

  async function handlePasswordSubmit(e) {
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
      setSession(googleUser);
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
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">CoachMatch</h1>
          <p className="text-sm text-[var(--text-muted)]">Matchningsverktyg för jobbcoacher</p>
        </div>

        {/* Kort */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8">
          {step === 'google' && (
            <>
              <h2 className="font-semibold text-lg mb-6 text-center">Logga in</h2>
              <button
                onClick={() => googleLogin()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-secondary)] transition-colors font-medium text-sm disabled:opacity-50"
              >
                <GoogleIcon />
                {loading ? 'Ansluter...' : 'Logga in med Google'}
              </button>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center mx-auto mb-3">
                  <span className="text-[var(--accent-primary)] text-lg">✓</span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">Inloggad som</p>
                <p className="font-medium">{googleUser?.email}</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
            </>
          )}

          {error && (
            <p className="mt-4 text-sm text-[var(--danger)] text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

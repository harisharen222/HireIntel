import { FormEvent, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (role: 'candidate' | 'recruiter' | 'admin') => {
    const emails = {
      candidate: 'candidate@demo.io',
      recruiter: 'recruiter@demo.io',
      admin:     'admin@demo.io',
    };
    setEmail(emails[role]);
    setPassword('Demo1234!');
  };

  return (
    <div className="auth-layout">
      <div className="auth-panel animate-in">

        {/* Brand */}
        <div className="auth-logo">
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
            color: 'var(--text)',
          }}>
            TalentMatch<span style={{ color: 'var(--text-muted)' }}>.</span>
          </span>
        </div>

        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-sub">Welcome back. Enter your credentials.</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', padding: '14px', marginTop: 4, fontSize: '0.75rem' }}
          >
            {busy ? (
              <span className="flex" style={{ justifyContent: 'center' }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Signing in
              </span>
            ) : (
              <>Sign in <span className="btn-arrow">→</span></>
            )}
          </button>
        </form>

        {/* Horizontal rule */}
        <div style={{ margin: '28px 0', borderTop: '1px solid var(--border)' }} />

        {/* Demo accounts */}
        <div>
          <p style={{
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 10,
          }}>
            Demo accounts — click to autofill
          </p>
          <div className="demo-grid">
            {(['candidate', 'recruiter', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className="demo-pill"
                onClick={() => fillDemo(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
            All use password: <code style={{
              background: 'var(--bg-elevated)',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '0.85em',
            }}>Demo1234!</code>
          </p>
        </div>

        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
              Create one
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

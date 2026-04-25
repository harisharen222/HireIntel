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

  return (
    <div className="container-narrow">
      <h1>Sign in</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Welcome back to TalentMatch.
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 24, textAlign: 'center' }}>
        Don't have an account? <Link to="/register">Create one</Link>
      </p>

      <div
        className="card"
        style={{ marginTop: 32, fontSize: '0.85rem', background: 'transparent' }}
      >
        <h3 style={{ marginBottom: 8 }}>Demo accounts</h3>
        <p className="muted">candidate@demo.io · recruiter@demo.io · admin@demo.io</p>
        <p className="muted">Password: <code>Demo1234!</code></p>
      </div>
    </div>
  );
};

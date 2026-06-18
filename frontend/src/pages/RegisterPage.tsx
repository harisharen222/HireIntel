import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';
import type { Role } from '@/types';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'CANDIDATE' as Role,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-panel animate-in">

        <div className="auth-logo">
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
          }}>
            TalentMatch<span style={{ color: 'var(--text-muted)' }}>.</span>
          </span>
        </div>

        <h1 className="auth-heading">Create account</h1>
        <p className="auth-sub">Get started in under a minute.</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Jane Smith"
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              placeholder="Min. 10 chars, 1 digit, 1 symbol"
              minLength={10}
              required
            />
          </div>

          {/* Role selector — visual toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ marginBottom: 10 }}>I am a</label>
            <div className="role-selector">
              {(['CANDIDATE', 'RECRUITER'] as Role[]).map((r) => (
                <div
                  key={r}
                  className={`role-option${form.role === r ? ' selected' : ''}`}
                  onClick={() => setForm({ ...form, role: r })}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 2 }}>
                    {r === 'CANDIDATE' ? 'Candidate' : 'Recruiter'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {r === 'CANDIDATE' ? 'Looking for opportunities' : 'Posting jobs'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', padding: '14px', fontSize: '0.75rem' }}
          >
            {busy ? (
              <span className="flex" style={{ justifyContent: 'center' }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Creating account
              </span>
            ) : (
              <>Create account <span className="btn-arrow">→</span></>
            )}
          </button>
        </form>

        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

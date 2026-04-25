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
    <div className="container-narrow">
      <h1>Create an account</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Get started in under a minute.
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            minLength={2}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            minLength={10}
            required
          />
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Min 10 characters, at least one digit and one symbol.
          </p>
        </div>
        <div className="form-group">
          <label htmlFor="role">I am a…</label>
          <select
            id="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            <option value="CANDIDATE">Candidate looking for opportunities</option>
            <option value="RECRUITER">Recruiter posting jobs</option>
          </select>
        </div>
        <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 24, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
};

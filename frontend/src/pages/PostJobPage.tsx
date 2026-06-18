import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobApi, extractErrorMessage } from '@/api/client';

export const PostJobPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    minYears: 0,
    description: '',
    skillsCsv: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const requiredSkills = form.skillsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (requiredSkills.length === 0) {
      setError('At least one required skill is needed');
      return;
    }
    if (form.description.length < 50) {
      setError('Description must be at least 50 characters');
      return;
    }

    setBusy(true);
    try {
      await jobApi.create({
        title: form.title,
        company: form.company,
        description: form.description,
        requiredSkills,
        minYears: form.minYears,
        location: form.location || undefined,
      });
      navigate('/recruiter');
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <p className="section-label">New Job</p>
          <h1 style={{ marginTop: 6 }}>
            <span style={{ color: 'var(--text-dim)' }}>Post a Job.</span> Find Talent.
          </h1>
        </div>
      </div>

      <div className="container-form animate-in">

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 32, lineHeight: 1.65 }}>
          Your job description will be embedded in the same 384-dimensional semantic space as candidate CVs,
          enabling accurate AI-powered matching.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Job title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior ML Engineer"
                  required
                  minLength={2}
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Acme Corp"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Remote · New York · London"
                />
              </div>
              <div className="form-group">
                <label>Min. years</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.minYears}
                  onChange={(e) => setForm({ ...form, minYears: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Required skills</label>
              <input
                value={form.skillsCsv}
                onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })}
                placeholder="python, pytorch, nlp, aws, docker"
                required
              />
              <p className="form-hint">Comma-separated list of skills</p>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={8}
                placeholder="Describe the role, responsibilities, and what makes it exciting. Min. 50 characters."
                required
              />
              <p className="form-hint">
                {form.description.length} chars{form.description.length < 50 ? ` (${50 - form.description.length} more needed)` : ''}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              <button
                type="submit"
                disabled={busy}
                style={{ padding: '14px 32px', fontSize: '0.75rem' }}
              >
                {busy ? (
                  <span className="flex">
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--bg)' }} />
                    Creating & embedding
                  </span>
                ) : (
                  <>Create job <span className="btn-arrow">→</span></>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

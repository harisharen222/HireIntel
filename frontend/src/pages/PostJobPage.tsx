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
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>Post a new job</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        The description will be embedded into the same 384-dim space as CVs.
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={onSubmit} className="card">
        <div className="form-group">
          <label>Job title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Senior NLP Engineer"
            required
            minLength={2}
          />
        </div>
        <div className="form-group">
          <label>Company</label>
          <input
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            required
          />
        </div>
        <div className="flex">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Remote · Tunis · Paris"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Min years</label>
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
          <label>Required skills (comma-separated)</label>
          <input
            value={form.skillsCsv}
            onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })}
            placeholder="python, pytorch, nlp, aws"
            required
          />
        </div>
        <div className="form-group">
          <label>Description (min 50 chars)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={8}
            required
          />
        </div>
        <button type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Creating and embedding…' : 'Create job'}
        </button>
      </form>
    </div>
  );
};

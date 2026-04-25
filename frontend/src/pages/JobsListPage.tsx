import { useEffect, useState } from 'react';
import { jobApi, extractErrorMessage } from '@/api/client';
import type { Job } from '@/types';

export const JobsListPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    jobApi
      .listOpen()
      .then(setJobs)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading…</div>;

  const filtered = jobs.filter((j) => {
    const q = filter.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container">
      <h1>Open jobs</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        {jobs.length} total · {filtered.length} shown
      </p>

      {error && <div className="error">{error}</div>}

      <input
        placeholder="Filter by title, company, or skill…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {filtered.map((job) => (
        <div key={job.id} className="card">
          <div className="card-header">
            <div>
              <h2>{job.title}</h2>
              <p className="muted">
                {job.company}
                {job.location ? ` · ${job.location}` : ''} · {job.minYears}+ yrs
              </p>
            </div>
          </div>
          <p style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
            {job.description.length > 240
              ? job.description.slice(0, 240) + '…'
              : job.description}
          </p>
          <div>
            {job.requiredSkills.map((s) => (
              <span key={s} className="badge">
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

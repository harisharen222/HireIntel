import { useEffect, useState } from 'react';
import { jobApi, extractErrorMessage } from '@/api/client';
import type { Job } from '@/types';
import { useCountUp } from '@/hooks/useCountUp';

export const JobsListPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const filtered = jobs.filter((j) => {
    const q = filter.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const jobsCount = useCountUp(jobs.length);
  const filteredCount = useCountUp(filtered.length);

  useEffect(() => {
    jobApi
      .listOpen()
      .then(setJobs)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          Loading jobs
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Page hero */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p className="section-label">Open Positions</p>
              <h1 style={{ marginTop: 6 }}>
                <span style={{ color: 'var(--text-dim)' }}>Impactful</span> Opportunities
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div className="stat-block" style={{ textAlign: 'right' }}>
                <div className="stat-num" style={{ fontSize: '2rem' }}>
                  {jobsCount}
                </div>
                <div className="stat-label">Total roles</div>
              </div>
              {filter && (
                <div className="stat-block" style={{ textAlign: 'right' }}>
                  <div className="stat-num" style={{ fontSize: '2rem' }}>
                    {filteredCount}
                  </div>
                  <div className="stat-label">Shown</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container animate-in">

        {error && <div className="error">{error}</div>}

        {/* Search */}
        <div style={{ marginBottom: 32, position: 'relative' }}>
          <input
            placeholder="Filter by title, company, or skill…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ paddingLeft: 16 }}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="section-label" style={{ marginBottom: 12 }}>
              {filter ? 'No results' : 'No positions yet'}
            </p>
            <h2 style={{ color: 'var(--text-dim)', marginBottom: 8 }}>
              {filter ? `No roles matching "${filter}"` : 'Check back soon'}
            </h2>
            <p>
              {filter
                ? 'Try a different keyword or clear the filter.'
                : 'Recruiters are posting new positions.'}
            </p>
            {filter && (
              <button
                className="secondary"
                onClick={() => setFilter('')}
                style={{ marginTop: 16 }}
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          /* Jobs list — editorial flat cards with top border */
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {filtered.map((job, i) => (
              <div
                key={job.id}
                className="animate-in"
                style={{
                  animationDelay: `${i * 50}ms`,
                  borderBottom: '1px solid var(--border)',
                  padding: '28px 0',
                  display: 'flex',
                  gap: 32,
                  flexWrap: 'wrap',
                }}
              >
                {/* Index number */}
                <div style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  minWidth: 36,
                  paddingTop: 4,
                }}>
                  {String(i + 1).padStart(3, '0')}.
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h2 style={{ marginBottom: 6, fontSize: '1.05rem' }}>{job.title}</h2>
                  <div className="job-meta-row">
                    <span className="job-meta-item">{job.company}</span>
                    {job.location && (
                      <span className="job-meta-item" style={{ color: 'var(--text-muted)' }}>
                        · {job.location}
                      </span>
                    )}
                    <span className="job-meta-item" style={{ color: 'var(--text-muted)' }}>
                      · {job.minYears}+ yrs
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.65,
                    marginBottom: 14,
                    maxWidth: 560,
                  }}>
                    {job.description.length > 180
                      ? job.description.slice(0, 180) + '…'
                      : job.description}
                  </p>

                  {/* Skills as bullet list */}
                  <ul className="skill-bullets" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 24px', listStyle: 'none' }}>
                    {job.requiredSkills.map((s) => (
                      <li key={s} style={{ marginBottom: 4 }}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Status pill */}
                <div style={{ flexShrink: 0, paddingTop: 4 }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--success)',
                    borderBottom: '1px solid rgba(16,185,129,0.3)',
                    paddingBottom: '2px',
                  }}>
                    Open
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

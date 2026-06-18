import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobApi, matchApi, extractErrorMessage } from '@/api/client';
import type { Job, MatchResult } from '@/types';
import { MatchCard } from '@/components/MatchCard';
import { useCountUp } from '@/hooks/useCountUp';

export const RecruiterDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [matching, setMatching] = useState(false);

  const openJobs = jobs.filter((j) => j.status === 'OPEN');
  const jobsCount = useCountUp(jobs.length);
  const openCount = useCountUp(openJobs.length);
  const candidatesCount = useCountUp(candidates.length);

  useEffect(() => {
    jobApi
      .listMine()
      .then(setJobs)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const findCandidates = async (jobId: string) => {
    setMatching(true);
    setSelectedJobId(jobId);
    setError(null);
    try {
      const { matches } = await matchApi.run({ jobId, topK: 10 });
      setCandidates(matches);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setMatching(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this job posting?')) return;
    try {
      await jobApi.delete(jobId);
      setJobs((j) => j.filter((x) => x.id !== jobId));
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setCandidates([]);
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          Loading dashboard
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Page hero */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <p className="section-label">Recruiter Dashboard</p>
              <h1 style={{ marginTop: 6 }}>
                <span style={{ color: 'var(--text-dim)' }}>Find Talent.</span><br />
                Build Teams.
              </h1>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 40 }}>
              <div className="stat-block">
                <div className="stat-num">{jobsCount}</div>
                <div className="stat-label">Total Jobs</div>
              </div>
              <div className="stat-block">
                <div className="stat-num">{openCount}</div>
                <div className="stat-label">Open Roles</div>
              </div>
              {candidates.length > 0 && (
                <div className="stat-block">
                  <div className="stat-num">{candidatesCount}</div>
                  <div className="stat-label">Candidates</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container animate-in">

        {error && <div className="error">{error}</div>}

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p className="section-label" style={{ margin: 0 }}>Your Job Postings</p>
          <Link to="/recruiter/new">
            <button>Post new job <span className="btn-arrow">→</span></button>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">
            <p className="section-label" style={{ marginBottom: 12 }}>No jobs yet</p>
            <h2 style={{ color: 'var(--text-dim)', marginBottom: 8 }}>Post your first job</h2>
            <p>Create a listing and start receiving AI-matched candidates.</p>
            <Link to="/recruiter/new">
              <button style={{ marginTop: 20 }}>Post a job <span className="btn-arrow">→</span></button>
            </Link>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {jobs.map((job, i) => (
              <div
                key={job.id}
                className="animate-in"
                style={{
                  animationDelay: `${i * 50}ms`,
                  borderBottom: '1px solid var(--border)',
                  padding: '24px 0',
                  display: 'flex',
                  gap: 24,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                {/* Number */}
                <div style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  minWidth: 36,
                  paddingTop: 4,
                }}>
                  {String(i + 1).padStart(3, '0')}.
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <h2 style={{ marginBottom: 4, fontSize: '1rem' }}>{job.title}</h2>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''}
                    {` · ${job.minYears}+ yrs`}
                  </div>
                  <div>
                    {job.requiredSkills.slice(0, 5).map((s) => (
                      <span key={s} className="badge">{s}</span>
                    ))}
                    {job.requiredSkills.length > 5 && (
                      <span className="badge">+{job.requiredSkills.length - 5}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex" style={{ gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: job.status === 'OPEN' ? 'var(--success)' : 'var(--text-muted)',
                    alignSelf: 'center',
                    marginRight: 8,
                  }}>
                    {job.status}
                  </span>
                  <button
                    className="secondary sm"
                    onClick={() => findCandidates(job.id)}
                    disabled={matching}
                  >
                    {matching && selectedJobId === job.id ? (
                      <span className="flex">
                        <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                        Matching
                      </span>
                    ) : 'Find candidates'}
                  </button>
                  <button
                    className="danger sm"
                    onClick={() => handleDelete(job.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Candidate results */}
        {candidates.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}>
              <p className="section-label" style={{ margin: 0 }}>
                Top {candidates.length} Candidates
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Ranked by AI match score
              </span>
            </div>

            {candidates.map((m, i) => (
              <div key={m.jobId + i} className="animate-in" style={{ animationDelay: `${i * 60}ms` }}>
                <MatchCard match={m} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

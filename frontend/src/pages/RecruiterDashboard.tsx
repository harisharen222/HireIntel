import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobApi, matchApi, extractErrorMessage } from '@/api/client';
import type { Job, MatchResult } from '@/types';
import { MatchCard } from '@/components/MatchCard';

export const RecruiterDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [matching, setMatching] = useState(false);

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
    if (!confirm('Delete this job?')) return;
    try {
      await jobApi.delete(jobId);
      setJobs((j) => j.filter((x) => x.id !== jobId));
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Recruiter dashboard</h1>
          <p className="muted">Manage your job postings and find candidates.</p>
        </div>
        <Link to="/recruiter/new">
          <button>Post a new job</button>
        </Link>
      </div>

      {error && <div className="error">{error}</div>}

      {jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <h2>No jobs posted yet</h2>
          <p className="muted">Post your first job to start finding candidates.</p>
        </div>
      ) : (
        jobs.map((job) => (
          <div key={job.id} className="card">
            <div className="card-header">
              <div>
                <h2>{job.title}</h2>
                <p className="muted">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ''} · {job.minYears}+ yrs
                </p>
              </div>
              <div className="flex">
                <span className="badge">{job.status}</span>
                <button onClick={() => findCandidates(job.id)} disabled={matching}>
                  {matching && selectedJobId === job.id ? 'Matching…' : 'Find candidates'}
                </button>
                <button className="danger" onClick={() => handleDelete(job.id)}>
                  Delete
                </button>
              </div>
            </div>
            <div>
              {job.requiredSkills.map((s) => (
                <span key={s} className="badge">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))
      )}

      {candidates.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Top candidates</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Ranked by hybrid score. Cards show candidate email in place of company.
          </p>
          {candidates.map((m) => (
            <MatchCard key={m.jobId} match={m} />
          ))}
        </>
      )}
    </div>
  );
};

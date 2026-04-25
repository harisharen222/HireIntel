import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cvApi, matchApi, extractErrorMessage } from '@/api/client';
import type { Cv, MatchResult } from '@/types';
import { MatchCard } from '@/components/MatchCard';

export const CandidateDashboard = () => {
  const [cvs, setCvs] = useState<Cv[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cvApi
      .listMine()
      .then((cvs) => {
        setCvs(cvs);
        if (cvs[0]) setSelectedCvId(cvs[0].id);
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (cvId: string) => {
    if (!confirm('Supprimer ce CV ? Cette action est irréversible.')) return;
    try {
      await cvApi.delete(cvId);
      setCvs((prev) => prev.filter((c) => c.id !== cvId));
      if (selectedCvId === cvId) {
        setSelectedCvId(null);
        setMatches([]);
        setRunId(null);
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };
  const runMatch = async () => {
    if (!selectedCvId) return;
    setMatching(true);
    setError(null);
    try {
      const { runId, matches } = await matchApi.run({ cvId: selectedCvId, topK: 10 });
      setRunId(runId);
      setMatches(matches);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setMatching(false);
    }
  };

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h1>Candidate dashboard</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Upload your CV, run matches, and see the top jobs for your profile.
      </p>

      {error && <div className="error">{error}</div>}

      {cvs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <h2>No CV uploaded yet</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Upload a PDF to get started.
          </p>
          <Link to="/upload">
            <button>Upload CV</button>
          </Link>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <h2>Your CVs</h2>
              <Link to="/upload">
                <button className="secondary">Upload another</button>
              </Link>
            </div>
            <div className="flex-col">
              {cvs.map((cv) => (
                <label
                  key={cv.id}
                  className="flex"
                  style={{
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    background:
                      selectedCvId === cv.id ? 'var(--bg-hover)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="cv"
                    checked={selectedCvId === cv.id}
                    onChange={() => setSelectedCvId(cv.id)}
                    style={{ width: 'auto', marginRight: 8 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{cv.originalFilename}</div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {cv.yearsExperience} yrs exp · {cv.skills.length} skills
                    </div>
                  </div>
                  <button
                    type="button"
                    className="danger"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(cv.id);
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    Supprimer
                  </button>
                </label>
              ))}
            </div>
            <div className="flex" style={{ marginTop: 16 }}>
              <button onClick={runMatch} disabled={!selectedCvId || matching}>
                {matching ? 'Running match…' : 'Find matching jobs'}
              </button>
              {runId && (
                <a href={matchApi.exportCsvUrl(runId)} target="_blank" rel="noopener">
                  <button className="secondary">Download CSV</button>
                </a>
              )}
            </div>
          </div>

          {matches.length > 0 && (
            <>
              <h2 style={{ marginTop: 32 }}>Top matches</h2>
              {matches.map((m) => (
                <MatchCard key={m.jobId} match={m} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

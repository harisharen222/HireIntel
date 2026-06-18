import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cvApi, matchApi, extractErrorMessage } from '@/api/client';
import type { Cv, MatchResult } from '@/types';
import { MatchCard } from '@/components/MatchCard';
import { useCountUp } from '@/hooks/useCountUp';
import { SkillFrequencyChart } from '@/components/SkillFrequencyChart';

export const CandidateDashboard = () => {
  const [cvs, setCvs] = useState<Cv[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCv = cvs.find((c) => c.id === selectedCvId);
  const cvCount = useCountUp(cvs.length);
  const skillCount = useCountUp(selectedCv?.skills?.length ?? 0);
  const matchCount = useCountUp(matches.length);

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
    if (!confirm('Delete this CV? This cannot be undone.')) return;
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
      const result = await matchApi.run({ cvId: selectedCvId, topK: 10 });
      setRunId(result.runId);
      setMatches(result.matches);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setMatching(false);
    }
  };

  const missingSkillsData = matches.reduce((acc, match) => {
    match.missingSkills.forEach((skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span style={{ fontSize: '0.8rem', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Loading profile
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Page hero — editorial header with stats */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <p className="section-label">Candidate Dashboard</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h1 style={{ marginBottom: 8 }}>
                Match Talent.<br />
                <span style={{ color: 'var(--text-dim)' }}>Find Your Role.</span>
              </h1>
            </div>

            {/* Stats row — "200+ Project Complete" pattern */}
            <div style={{ display: 'flex', gap: 40 }}>
              <div className="stat-block">
                <div className="stat-num">
                  {cvCount}<span className="stat-plus">+</span>
                </div>
                <div className="stat-label">CVs Uploaded</div>
              </div>
              <div className="stat-block">
                <div className="stat-num">
                  {skillCount}<span className="stat-plus">+</span>
                </div>
                <div className="stat-label">Skills Detected</div>
              </div>
              <div className="stat-block">
                <div className="stat-num">
                  {matchCount}
                </div>
                <div className="stat-label">Matches Found</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container animate-in">

        {error && <div className="error">{error}</div>}

        {cvs.length === 0 ? (
          <div className="empty-state">
            <p className="section-label" style={{ marginBottom: 16 }}>No CVs yet</p>
            <h2 style={{ marginBottom: 12, color: 'var(--text-dim)' }}>Upload your first CV</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28 }}>
              Drop a PDF resume to start AI-powered job matching.
            </p>
            <Link to="/upload">
              <button>Upload CV <span className="btn-arrow">→</span></button>
            </Link>
          </div>
        ) : (
          <>
            {/* CV selector card */}
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <p className="section-label" style={{ margin: 0 }}>Your CVs</p>
                <Link to="/upload">
                  <button className="secondary sm">+ Upload another</button>
                </Link>
              </div>

              <div className="flex-col" style={{ gap: 6, marginBottom: 20 }}>
                {cvs.map((cv) => (
                  <label
                    key={cv.id}
                    className={`cv-item${selectedCvId === cv.id ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="cv"
                      checked={selectedCvId === cv.id}
                      onChange={() => setSelectedCvId(cv.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: 2 }}>
                        {cv.originalFilename}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cv.yearsExperience} yrs · {cv.skills.length} skills
                      </div>
                    </div>
                    <button
                      type="button"
                      className="danger sm"
                      onClick={(e) => { e.preventDefault(); handleDelete(cv.id); }}
                    >
                      Remove
                    </button>
                  </label>
                ))}
              </div>

              <hr className="rule" style={{ marginBottom: 20 }} />

              <div className="flex" style={{ gap: 12 }}>
                <button
                  onClick={runMatch}
                  disabled={!selectedCvId || matching}
                >
                  {matching ? (
                    <span className="flex">
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--bg)' }} />
                      Matching
                    </span>
                  ) : (
                    <>Find matching jobs <span className="btn-arrow">→</span></>
                  )}
                </button>
                {runId && (
                  <a href={matchApi.exportCsvUrl(runId)} target="_blank" rel="noopener">
                    <button className="secondary">Export CSV</button>
                  </a>
                )}
              </div>
            </div>

            {/* Match results */}
            {matches.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--border)',
                }}>
                  <p className="section-label" style={{ margin: 0 }}>
                    Top {matches.length} Matches
                  </p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Ranked by AI score
                  </span>
                </div>

                {matches.map((m, i) => (
                  <div key={m.jobId} className="animate-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <MatchCard match={m} index={i} />
                  </div>
                ))}

                <div style={{ marginTop: 48, marginBottom: 24 }}>
                  <p className="section-label" style={{ marginBottom: 16 }}>Skill Gaps Identified</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                    Top skills missing from your CV that appear in these matched jobs.
                  </p>
                  <div className="card" style={{ padding: '2rem', backgroundColor: 'var(--bg-elevated)' }}>
                    <SkillFrequencyChart missingSkills={missingSkillsData} />
                  </div>
                </div>
              </div>
            )}

            {matches.length === 0 && !matching && selectedCvId && (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <p className="section-label">Ready to match</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 8 }}>
                  Click "Find matching jobs" to run AI analysis
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

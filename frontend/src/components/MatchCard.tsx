import type { MatchResult } from '@/types';
import { ScoreBar } from './ScoreBar';

interface Props {
  match: MatchResult;
  index?: number;
}

export const MatchCard = ({ match, index = 0 }: Props) => {
  const score = Math.round(match.finalScore * 100);
  const num = String(index + 1).padStart(3, '0');

  const verdictConfig: Record<string, { label: string; color: string }> = {
    STRONG_FIT: { label: 'Strong fit', color: 'var(--success)' },
    MEDIUM_FIT: { label: 'Medium fit', color: 'var(--warning)' },
    WEAK_FIT:   { label: 'Weak fit',   color: 'var(--text-muted)' },
  };

  const verdict = verdictConfig[match.verdict] ?? { label: match.verdict, color: 'var(--text-muted)' };

  return (
    <div
      className="job-card"
      style={{ marginBottom: 1, borderRadius: 0 }}
    >
      {/* Number label like "001." in reference */}
      <div className="job-number">{num}.</div>

      <div className="card-header" style={{ marginBottom: 14 }}>
        {/* Left: title + company */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 4, fontSize: '1.1rem' }}>{match.jobTitle}</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {match.company}
          </div>
        </div>

        {/* Right: score like stat number */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            className="stat-num"
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              color: score >= 70 ? 'var(--success)' : score >= 45 ? 'var(--warning)' : 'var(--text-dim)',
            }}
          >
            {score}
          </div>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: verdict.color, marginTop: 2 }}>
            {verdict.label}
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div style={{ marginBottom: 16 }}>
        <ScoreBar label="Semantic" value={match.semanticSimilarity} />
        <ScoreBar label="Skills" value={match.skillOverlap} />
        <ScoreBar label="Experience" value={match.experienceFit} />
      </div>

      {/* Skills — bullet list style from reference */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {match.matchedSkills.length > 0 && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <p style={{
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--success)',
              marginBottom: 8,
              fontWeight: 600,
            }}>
              Matched
            </p>
            <ul className="skill-bullets">
              {match.matchedSkills.slice(0, 6).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {match.missingSkills.length > 0 && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <p style={{
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--danger)',
              marginBottom: 8,
              fontWeight: 600,
            }}>
              Missing
            </p>
            <ul className="skill-bullets" style={{ '--dot-color': 'var(--danger)' } as React.CSSProperties}>
              {match.missingSkills.slice(0, 6).map((s) => (
                <li key={s} style={{ color: 'var(--text-muted)' }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

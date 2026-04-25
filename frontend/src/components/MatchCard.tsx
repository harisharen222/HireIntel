import type { MatchResult } from '@/types';
import { ScoreBar } from './ScoreBar';

export const MatchCard = ({ match }: { match: MatchResult }) => {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 style={{ marginBottom: 4 }}>{match.jobTitle}</h2>
          <p className="muted">{match.company}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            {(match.finalScore * 100).toFixed(0)}
          </div>
          <div className={`verdict-${match.verdict}`} style={{ fontSize: '0.85rem' }}>
            {match.verdict.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div className="flex-col" style={{ marginBottom: 16 }}>
        <ScoreBar label="Semantic similarity" value={match.semanticSimilarity} />
        <ScoreBar label="Skill overlap" value={match.skillOverlap} />
        <ScoreBar label="Experience fit" value={match.experienceFit} />
      </div>

      {match.matchedSkills.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <h3>Matched skills</h3>
          <div>
            {match.matchedSkills.map((s) => (
              <span key={s} className="badge matched">
                ✓ {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {match.missingSkills.length > 0 && (
        <div>
          <h3>Missing skills</h3>
          <div>
            {match.missingSkills.map((s) => (
              <span key={s} className="badge missing">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

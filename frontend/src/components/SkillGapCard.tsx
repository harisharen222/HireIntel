import { AgentMatchItem } from '@/types/agent';
import { ScoreBar } from './ScoreBar';

interface SkillGapCardProps {
  candidate: AgentMatchItem;
  onViewOutreach: () => void;
}

export function SkillGapCard({ candidate, onViewOutreach }: SkillGapCardProps) {
  const formatPct = (num: number) => `${Math.round(num * 100)}%`;

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {candidate.jobTitle}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>{candidate.company}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`verdict-badge verdict-${candidate.verdict.toLowerCase().replace('_', '-')}`}>
              {candidate.verdict.replace('_', ' ')}
            </span>
            <div style={{ marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
              {formatPct(candidate.finalScore)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <ScoreBar label="Semantic Match" value={candidate.semanticSimilarity} />
          <ScoreBar label="Skill Overlap" value={candidate.skillOverlap} />
          <ScoreBar label="Experience Fit" value={candidate.experienceFit} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Matched Skills
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {candidate.matchedSkills.length > 0 ? (
              candidate.matchedSkills.map((skill) => (
                <span key={skill} style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '0.875rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  ✓ {skill}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>None</span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Missing Skills (Gap)
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {candidate.missingSkills.length > 0 ? (
              candidate.missingSkills.map((skill) => (
                <span key={skill} style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  ⚠️ Learn: {skill}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>None</span>
            )}
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onViewOutreach}>
          <span className="btn-arrow">View AI Outreach Draft</span>
        </button>
      </div>
    </div>
  );
}

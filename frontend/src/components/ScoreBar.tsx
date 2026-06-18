interface Props {
  label: string;
  value: number; // 0..1
}

export const ScoreBar = ({ label, value }: Props) => {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color =
    pct >= 70 ? 'var(--success)' :
    pct >= 40 ? 'var(--warning)' :
    'var(--danger)';

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
      }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '0.8rem',
          fontWeight: 600,
          color,
          letterSpacing: '-0.01em',
        }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
};

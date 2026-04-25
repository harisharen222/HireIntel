interface Props {
  label: string;
  value: number; // 0..1
}

export const ScoreBar = ({ label, value }: Props) => {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div>
      <div
        className="flex"
        style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}
      >
        <span className="muted">{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

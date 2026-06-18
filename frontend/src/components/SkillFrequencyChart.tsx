import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SkillFrequencyChartProps {
  missingSkills: Record<string, number>;
}

export function SkillFrequencyChart({ missingSkills }: SkillFrequencyChartProps) {
  // Convert Record<string, number> to array and sort by frequency descending
  const data = Object.entries(missingSkills)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // top 10 missing skills

  if (data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No missing skills data available.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300, padding: '1rem 0' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
          <XAxis type="number" stroke="#888" allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={100} stroke="#ccc" tick={{ fontSize: 12 }} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }}
          />
          <Bar dataKey="count" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

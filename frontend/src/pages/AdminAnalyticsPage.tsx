import { useEffect, useState } from 'react';
import { adminApi, extractErrorMessage } from '@/api/client';
import type { AnalyticsData, User } from '@/types';
import { useCountUp } from '@/hooks/useCountUp';

export const AdminAnalyticsPage = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const usersCount = useCountUp(data?.totals.users ?? 0);
  const cvsCount = useCountUp(data?.totals.cvs ?? 0);
  const jobsCount = useCountUp(data?.totals.openJobs ?? 0);
  const runsCount = useCountUp(data?.totals.matchRuns ?? 0);

  useEffect(() => {
    Promise.all([adminApi.analytics(), adminApi.listUsers()])
      .then(([a, u]) => {
        setData(a);
        setUsers(u.users);
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          Loading analytics
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Total Users',  value: usersCount, sub: `+${data.recent.usersLast7Days} this week` },
    { label: 'CVs Indexed',  value: cvsCount,   sub: 'Vectorised & ready' },
    { label: 'Open Jobs',    value: jobsCount,  sub: 'Active listings' },
    { label: 'Match Runs',   value: runsCount,  sub: 'AI comparisons run' },
  ];

  const roleColor: Record<string, string> = {
    CANDIDATE: 'var(--text-dim)',
    RECRUITER: 'var(--warning)',
    ADMIN:     'var(--danger)',
  };

  return (
    <>
      {/* Page hero */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <p className="section-label">Admin</p>
          <h1 style={{ marginTop: 6 }}>
            <span style={{ color: 'var(--text-dim)' }}>System</span> Analytics
          </h1>
        </div>
      </div>

      {/* Stats strip — like "200+ 120+ 05+" from reference */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 48px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderLeft: '1px solid var(--border)',
          }}>
            {stats.map((s) => (
              <div key={s.label} style={{
                padding: '32px 32px',
                borderRight: '1px solid var(--border)',
              }}>
                <div className="stat-label" style={{ marginBottom: 8 }}>{s.label}</div>
                <div className="stat-num">{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container animate-in">

        {/* Verdict distribution */}
        {data.verdictDistribution.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}>
              <p className="section-label" style={{ margin: 0 }}>Verdict Distribution</p>
            </div>

            <div style={{ display: 'flex', gap: 1, background: 'var(--border)' }}>
              {data.verdictDistribution.map((d) => {
                const color =
                  d.verdict === 'STRONG_FIT' ? 'var(--success)' :
                  d.verdict === 'MEDIUM_FIT' ? 'var(--warning)' :
                  'var(--text-muted)';
                return (
                  <div
                    key={d.verdict}
                    style={{
                      background: 'var(--bg-card)',
                      padding: '24px 28px',
                      flex: 1,
                    }}
                  >
                    <div style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color,
                      marginBottom: 8,
                    }}>
                      {d.verdict.replace('_', ' ')}
                    </div>
                    <div className="stat-num" style={{ fontSize: '2.2rem', color }}>
                      {d.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Users table */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border)',
          }}>
            <p className="section-label" style={{ margin: 0 }}>Registered Users</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {users.length} total
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ color: 'var(--text-dim)' }}>{u.email}</td>
                  <td>{u.fullName}</td>
                  <td>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: roleColor[u.role] ?? 'var(--text-muted)',
                    }}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
};

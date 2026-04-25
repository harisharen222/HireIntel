import { useEffect, useState } from 'react';
import { adminApi, extractErrorMessage } from '@/api/client';
import type { AnalyticsData, User } from '@/types';

export const AdminAnalyticsPage = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.analytics(), adminApi.listUsers()])
      .then(([a, u]) => {
        setData(a);
        setUsers(u.users);
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading…</div>;
  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!data) return null;

  return (
    <div className="container">
      <h1>Admin analytics</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        System-wide overview of users, content, and matching activity.
      </p>

      <div className="grid" style={{ marginBottom: 32 }}>
        <div className="stat">
          <div className="stat-label">Users</div>
          <div className="stat-value">{data.totals.users}</div>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            +{data.recent.usersLast7Days} in the last 7 days
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">CVs indexed</div>
          <div className="stat-value">{data.totals.cvs}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Open jobs</div>
          <div className="stat-value">{data.totals.openJobs}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Match runs</div>
          <div className="stat-value">{data.totals.matchRuns}</div>
        </div>
      </div>

      <h2>Match verdict distribution</h2>
      <div className="card" style={{ marginBottom: 32 }}>
        {data.verdictDistribution.length === 0 ? (
          <p className="muted">No matches run yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Verdict</th>
                <th style={{ textAlign: 'right' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.verdictDistribution.map((d) => (
                <tr key={d.verdict}>
                  <td>
                    <span className={`verdict-${d.verdict}`}>
                      {d.verdict.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Recent users</h2>
      <div className="card">
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
                <td>{u.email}</td>
                <td>{u.fullName}</td>
                <td>
                  <span className="badge">{u.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

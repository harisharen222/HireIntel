import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    CANDIDATE: 'Candidate',
    RECRUITER: 'Recruiter',
    ADMIN: 'Admin',
  };

  return (
    <nav className="navbar">
      {/* Logo — "Refine." style */}
      <NavLink to="/" className="navbar-brand">
        TalentMatch
        <span style={{ color: 'var(--text-muted)' }}>.</span>
      </NavLink>

      <div className="navbar-links">
        {!user && (
          <>
            <NavLink to="/login">Sign in</NavLink>
            <NavLink to="/register" style={{ marginLeft: 4 }}>
              <button style={{ fontSize: '0.7rem', padding: '7px 16px' }}>
                Get started
              </button>
            </NavLink>
          </>
        )}

        {user?.role === 'CANDIDATE' && (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/upload">Upload CV</NavLink>
            <NavLink to="/jobs">Browse Jobs</NavLink>
          </>
        )}

        {user?.role === 'RECRUITER' && (
          <>
            <NavLink to="/recruiter">My Jobs</NavLink>
            <NavLink to="/recruiter/new">Post Job</NavLink>
            <NavLink to="/recruiter/agent">Agent</NavLink>
          </>
        )}

        {user?.role === 'ADMIN' && (
          <NavLink to="/admin">Admin</NavLink>
        )}

        {user && (
          <>
            <span className="navbar-user" style={{ margin: '0 4px' }}>
              {user.email.split('@')[0]} · {roleLabel[user.role] ?? user.role}
            </span>
            <button
              className="secondary sm"
              onClick={handleLogout}
              style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

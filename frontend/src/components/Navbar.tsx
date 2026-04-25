import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          🎯 TalentMatch AI
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Sign up</NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        🎯 TalentMatch AI
      </NavLink>
      <div className="navbar-links">
        {user.role === 'CANDIDATE' && (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/upload">Upload CV</NavLink>
            <NavLink to="/jobs">Browse jobs</NavLink>
          </>
        )}
        {user.role === 'RECRUITER' && (
          <>
            <NavLink to="/recruiter">My jobs</NavLink>
            <NavLink to="/recruiter/new">Post job</NavLink>
          </>
        )}
        {user.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {user.email} ({user.role.toLowerCase()})
        </span>
        <button className="secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

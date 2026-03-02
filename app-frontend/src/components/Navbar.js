import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="Ghosted By HR" className="navbar-logo" />
          <span className="navbar-title">Ghosted By HR</span>
        </Link>
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/" className="nav-link">Feed</Link>
              <Link to="/connections" className="nav-link">Connections</Link>
              <Link to={`/profile/${user.id}`} className="nav-link">
                Profile
              </Link>
              <span className="nav-user-name">{user.first_name} {user.last_name}</span>
              <button onClick={handleLogout} className="nav-btn logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn signin-btn">Sign In</Link>
              <Link to="/register" className="nav-btn signup-btn">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

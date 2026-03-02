import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              <Link to={`/profile/${user.id}`} className="nav-link">Profile</Link>
              <div className="nav-user-menu" ref={menuRef}>
                <button
                  className="nav-user-trigger"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  {user.first_name} {user.last_name}
                  <span className="nav-user-caret">{menuOpen ? '▲' : '▼'}</span>
                </button>
                {menuOpen && (
                  <div className="nav-dropdown">
                    <Link
                      to="/settings"
                      className="nav-dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      ⚙ Account Settings
                    </Link>
                    <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
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


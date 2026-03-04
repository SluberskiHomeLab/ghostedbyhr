import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import './Navbar.css';

function Navbar() {
  const { user, logout, showModal } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="Ghosted By HR" className="navbar-logo" />
          <span className="navbar-title">Ghosted By HR</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/features" className="nav-link">Features</Link>
          <Link to="/about" className="nav-link">About</Link>
        </div>
        <div className="navbar-auth">
          {user ? (
            <>
              <a href={config.APP_URL} className="btn btn-go-to-app">Go to App</a>
              <div className="navbar-profile" ref={dropdownRef}>
                <button
                  className="profile-avatar-btn"
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.first_name} className="profile-avatar-img" />
                  ) : (
                    <span className="profile-avatar-initials">{initials}</span>
                  )}
                </button>
                {dropdownOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <span className="profile-dropdown-name">{user.first_name} {user.last_name}</span>
                      <span className="profile-dropdown-email">{user.email}</span>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <Link
                      to="/account"
                      className="profile-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Account Settings
                    </Link>
                    <Link
                      to="/account?tab=billing"
                      className="profile-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Billing
                    </Link>
                    <div className="profile-dropdown-divider" />
                    <button
                      className="profile-dropdown-item profile-dropdown-logout"
                      onClick={() => { logout(); setDropdownOpen(false); }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="btn btn-signin" onClick={() => showModal('login')}>Sign In</button>
              <button className="btn btn-signup" onClick={() => showModal('register')}>Sign Up</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

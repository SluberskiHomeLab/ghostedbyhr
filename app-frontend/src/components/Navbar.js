import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import logo from '../assets/logo.jpg';
import api from '../services/api';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const menuRef = useRef(null);
  const panelRef = useRef(null);
  const { unreadCount } = useNotifications() || { unreadCount: 0 };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Debounced suggestion fetch
  const fetchSuggestions = useCallback(async (q) => {
    if (!q.trim()) { setSuggestions([]); return; }
    try {
      const [userRes, tagRes] = await Promise.all([
        api.get(`/users/search?q=${encodeURIComponent(q)}`),
        api.get(`/hashtags/search?q=${encodeURIComponent(q)}`),
      ]);
      const users = (userRes.data || []).slice(0, 3).map((u) => ({
        kind: 'user',
        label: `${u.first_name} ${u.last_name}`,
        sub: `@${u.username}`,
        query: `@${u.username}`,
      }));
      const tags = (tagRes.data || []).slice(0, 3).map((t) => ({
        kind: 'hashtag',
        label: `#${t.tag}`,
        sub: `${t.count} posts`,
        query: `#${t.tag}`,
      }));
      setSuggestions([...users, ...tags]);
    } catch { setSuggestions([]); }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchSuggestions(val), 250);
  };

  const doSearch = (q) => {
    const term = (q ?? searchQuery).trim();
    if (!term) return;
    setSuggestions([]);
    setSearchQuery('');
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') doSearch();
  };

  // Close dropdown and panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSuggestions([]);
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

        {/* Search bar */}
        {user && (
          <div className="navbar-search-wrap" ref={searchRef}>
            <input
              type="text"
              className="navbar-search-input"
              placeholder="Search people, #hashtags…"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
            {suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="search-suggestion-item"
                    onMouseDown={(e) => { e.preventDefault(); doSearch(s.query); }}
                  >
                    <span className="suggestion-icon">{s.kind === 'hashtag' ? '#' : '@'}</span>
                    <span className="suggestion-label">{s.label}</span>
                    <span className="suggestion-sub">{s.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/" className="nav-link">Feed</Link>
              <Link to="/connections" className="nav-link">Connections</Link>
              <Link to={`/profile/${user.id}`} className="nav-link">Profile</Link>

              {/* Notification bell */}
              <div className="nav-notif-wrap" ref={panelRef}>
                <button
                  className="nav-notif-btn"
                  onClick={() => { setPanelOpen(o => !o); setMenuOpen(false); }}
                  aria-label="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="nav-notif-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
              </div>

              <div className="nav-user-menu" ref={menuRef}>
                <button
                  className="nav-user-trigger"
                  onClick={() => { setMenuOpen((o) => !o); setPanelOpen(false); }}
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

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Sidebar.css';

export default function Sidebar({ feedType, setFeedType, sortBy, setSortBy }) {
  const [trending, setTrending] = useState([]);
  const navigate = useNavigate();

  const fetchTrending = useCallback(async () => {
    try {
      const res = await api.get('/hashtags/trending');
      setTrending(res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const periodLabel = { day: 'Today', week: 'This Week', month: 'This Month' };

  const handleHashtagClick = (tag) => {
    navigate(`/search?q=${encodeURIComponent('#' + tag)}`);
  };

  return (
    <aside className="sidebar">
      {/* Feed type */}
      <div className="sidebar-card">
        <h3 className="sidebar-heading">Feed</h3>
        <div className="sidebar-radio-group">
          <label className={`sidebar-radio${feedType === 'public' ? ' active' : ''}`}>
            <input
              type="radio"
              name="feedType"
              value="public"
              checked={feedType === 'public'}
              onChange={() => setFeedType('public')}
            />
            🌐 Public
          </label>
          <label className={`sidebar-radio${feedType === 'connections' ? ' active' : ''}`}>
            <input
              type="radio"
              name="feedType"
              value="connections"
              checked={feedType === 'connections'}
              onChange={() => setFeedType('connections')}
            />
            👥 Connections
          </label>
        </div>
      </div>

      {/* Sort (only for public) */}
      {feedType === 'public' && (
        <div className="sidebar-card">
          <h3 className="sidebar-heading">Sort By</h3>
          <div className="sidebar-radio-group">
            <label className={`sidebar-radio${sortBy === 'recent' ? ' active' : ''}`}>
              <input
                type="radio"
                name="sortBy"
                value="recent"
                checked={sortBy === 'recent'}
                onChange={() => setSortBy('recent')}
              />
              🕐 Most Recent
            </label>
            <label className={`sidebar-radio${sortBy === 'popular' ? ' active' : ''}`}>
              <input
                type="radio"
                name="sortBy"
                value="popular"
                checked={sortBy === 'popular'}
                onChange={() => setSortBy('popular')}
              />
              🔥 Most Popular
            </label>
          </div>
        </div>
      )}

      {/* Trending hashtags */}
      <div className="sidebar-card">
        <h3 className="sidebar-heading">Trending Hashtags</h3>
        {trending.length === 0 ? (
          <p className="sidebar-empty">No trending tags yet</p>
        ) : (
          trending.map(({ period, tags }) => (
            <div key={period} className="trending-period">
              <span className="trending-period-label">{periodLabel[period] || period}</span>
              {tags.length === 0 ? (
                <span className="trending-none">No activity</span>
              ) : (
                <button
                  className="trending-tag"
                  onClick={() => handleHashtagClick(tags[0].tag)}
                >
                  #{tags[0].tag}
                  <span className="trending-count">{tags[0].count} posts</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

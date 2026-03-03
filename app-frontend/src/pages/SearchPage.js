import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import api from '../services/api';
import './SearchPage.css';

function getInitials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const isHashtag = q.startsWith('#');
  const isMention = q.startsWith('@');

  const [activeTab, setActiveTab] = useState(isHashtag ? 'posts' : isMention ? 'people' : 'posts');
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      if (isHashtag) {
        const tag = q.slice(1);
        const [postRes] = await Promise.all([
          api.get(`/hashtags/${encodeURIComponent(tag)}/posts`),
        ]);
        setPosts(postRes.data || []);
        setPeople([]);
        setActiveTab('posts');
      } else if (isMention) {
        const username = q.slice(1);
        const pplRes = await api.get(`/users/search?q=${encodeURIComponent(username)}`);
        setPeople(pplRes.data || []);
        setPosts([]);
        setActiveTab('people');
      } else {
        const [postRes, pplRes] = await Promise.all([
          api.get(`/posts?q=${encodeURIComponent(q)}`),
          api.get(`/users/search?q=${encodeURIComponent(q)}`),
        ]);
        setPosts(postRes.data || []);
        setPeople(pplRes.data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [q, isHashtag, isMention]);

  useEffect(() => {
    search();
  }, [search]);

  const hasPosts = posts.length > 0;
  const hasPeople = people.length > 0;
  const showTabs = !isHashtag && !isMention && (hasPosts || hasPeople);

  return (
    <div className="search-page">
      <Navbar />
      <div className="search-container">
        <div className="search-header">
          <h1 className="search-title">
            {isHashtag ? (
              <>Posts tagged <span className="search-highlight">{q}</span></>
            ) : isMention ? (
              <>People matching <span className="search-highlight">{q}</span></>
            ) : (
              <>Results for <span className="search-highlight">"{q}"</span></>
            )}
          </h1>
        </div>

        {showTabs && (
          <div className="search-tabs">
            <button
              className={`search-tab${activeTab === 'posts' ? ' active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Posts {hasPosts && <span className="search-tab-count">{posts.length}</span>}
            </button>
            <button
              className={`search-tab${activeTab === 'people' ? ' active' : ''}`}
              onClick={() => setActiveTab('people')}
            >
              People {hasPeople && <span className="search-tab-count">{people.length}</span>}
            </button>
          </div>
        )}

        {loading ? (
          <div className="search-loading">Searching…</div>
        ) : (
          <>
            {/* Posts results */}
            {(activeTab === 'posts' || isHashtag) && (
              <div className="search-posts">
                {posts.length === 0 ? (
                  <div className="search-empty">No posts found{q ? ` for "${q}"` : ''}</div>
                ) : (
                  posts.map(post => (
                    <PostCard key={post.id} post={post} onUpdate={search} />
                  ))
                )}
              </div>
            )}

            {/* People results */}
            {(activeTab === 'people' || isMention) && (
              <div className="search-people">
                {people.length === 0 ? (
                  <div className="search-empty">No people found{q ? ` matching "${q}"` : ''}</div>
                ) : (
                  people.map(person => (
                    <div key={person.id} className="person-card" onClick={() => navigate(`/profile/${person.id}`)}>
                      <div className="person-avatar">
                        {person.avatar_url
                          ? <img src={person.avatar_url} alt="" />
                          : <span>{getInitials(person.first_name, person.last_name)}</span>
                        }
                      </div>
                      <div className="person-info">
                        <span className="person-name">{person.first_name} {person.last_name}</span>
                        {person.username && <span className="person-username">@{person.username}</span>}
                        {person.headline && <span className="person-headline">{person.headline}</span>}
                      </div>
                      <Link to={`/profile/${person.id}`} className="person-view-btn" onClick={e => e.stopPropagation()}>
                        View Profile
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

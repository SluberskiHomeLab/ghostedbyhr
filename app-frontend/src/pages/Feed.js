import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import './Feed.css';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('public');
  const [sortBy, setSortBy] = useState('recent');

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (feedType === 'connections') params.set('feed', 'connections');
      if (sortBy === 'popular') params.set('sort', 'popular');
      const response = await api.get(`/posts?${params.toString()}`);
      setPosts(Array.isArray(response.data) ? response.data : response.data.posts || []);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [feedType, sortBy]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="feed-page">
      <Navbar />
      <div className="feed-layout">
        <Sidebar feedType={feedType} setFeedType={setFeedType} sortBy={sortBy} setSortBy={setSortBy} />
        <div className="feed-main">
          <CreatePost onPostCreated={fetchPosts} />
          {loading ? (
            <div className="feed-loading">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="feed-empty">
              <p>{feedType === 'connections' ? 'No posts from your connections yet.' : 'No posts yet. Be the first to share!'}</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={fetchPosts}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Feed;

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import api from '../services/api';
import './Feed.css';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await api.get('/posts');
      setPosts(Array.isArray(response.data) ? response.data : response.data.posts || []);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="feed-page">
      <Navbar />
      <div className="feed-container">
        <div className="feed-main">
          <CreatePost onPostCreated={fetchPosts} />
          {loading ? (
            <div className="feed-loading">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="feed-empty">
              <p>No posts yet. Be the first to share!</p>
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

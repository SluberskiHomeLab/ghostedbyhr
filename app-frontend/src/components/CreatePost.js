import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './CreatePost.css';

function CreatePost({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/posts', { content });
      setContent('');
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : '';

  return (
    <div className="create-post">
      <div className="create-post-header">
        <div className="create-post-avatar">{initials}</div>
        <span className="create-post-greeting">
          What's on your mind, {user?.firstName}?
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          className="create-post-textarea"
          placeholder="Share your job search experience, vent about ghosting, or celebrate a win..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <div className="create-post-footer">
          <button
            type="submit"
            className="create-post-btn"
            disabled={!content.trim() || submitting}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreatePost;

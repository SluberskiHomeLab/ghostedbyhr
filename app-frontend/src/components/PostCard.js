import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './PostCard.css';

function getInitials(first_name, last_name) {
  return `${(first_name || '')[0] || ''}${(last_name || '')[0] || ''}`.toUpperCase();
}

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function PostCard({ post, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async () => {
    try {
      await api.post(`/posts/${post.id}/like`);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/posts/${post.id}/comments`);
      setComments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${post.id}/comments`, {
        content: commentText,
      });
      setCommentText('');
      fetchComments();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <Link to={`/profile/${post.user_id}`} className="post-avatar">
          {getInitials(post.first_name, post.last_name)}
        </Link>
        <div className="post-author-info">
          <Link to={`/profile/${post.user_id}`} className="post-author-name">
            {post.first_name} {post.last_name}
          </Link>
          {post.headline && (
            <span className="post-author-headline">{post.headline}</span>
          )}
          <span className="post-time">{timeAgo(post.created_at)}</span>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
      </div>

      <div className="post-stats">
        <span>{post.like_count || 0} likes</span>
        <span>{post.comment_count || 0} comments</span>
      </div>

      <div className="post-actions">
        <button
          className="post-action-btn"
          onClick={handleLike}
        >
          👍 Like
        </button>
        <button
          className="post-action-btn"
          onClick={toggleComments}
        >
          💬 Comment
        </button>
      </div>

      {showComments && (
        <div className="post-comments">
          {comments.map((comment, idx) => (
            <div key={comment.id || idx} className="comment">
              <div className="comment-avatar">
                {getInitials(comment.first_name, comment.last_name)}
              </div>
              <div className="comment-body">
                <span className="comment-author">
                  {comment.first_name} {comment.last_name}
                </span>
                <p className="comment-text">{comment.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-input"
            />
            <button type="submit" className="comment-submit" disabled={submitting}>
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default PostCard;

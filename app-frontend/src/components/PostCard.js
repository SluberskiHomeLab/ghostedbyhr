import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './PostCard.css';

function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
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
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const author = post.author || {};
  const userId = user?._id || user?.id;
  const isLiked = (post.likes || []).includes(userId);

  const handleLike = async () => {
    try {
      await api.post(`/posts/${post._id || post.id}/like`);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${post._id || post.id}/comments`, {
        content: commentText,
      });
      setCommentText('');
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
        <Link to={`/profile/${author._id || author.id}`} className="post-avatar">
          {getInitials(author.firstName, author.lastName)}
        </Link>
        <div className="post-author-info">
          <Link to={`/profile/${author._id || author.id}`} className="post-author-name">
            {author.firstName} {author.lastName}
          </Link>
          {author.headline && (
            <span className="post-author-headline">{author.headline}</span>
          )}
          <span className="post-time">{timeAgo(post.createdAt || post.created_at)}</span>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
      </div>

      <div className="post-stats">
        <span>{(post.likes || []).length} likes</span>
        <span>{(post.comments || []).length} comments</span>
      </div>

      <div className="post-actions">
        <button
          className={`post-action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          {isLiked ? '👍 Liked' : '👍 Like'}
        </button>
        <button
          className="post-action-btn"
          onClick={() => setShowComments(!showComments)}
        >
          💬 Comment
        </button>
      </div>

      {showComments && (
        <div className="post-comments">
          {(post.comments || []).map((comment, idx) => {
            const commenter = comment.author || comment.user || {};
            return (
              <div key={comment._id || idx} className="comment">
                <div className="comment-avatar">
                  {getInitials(commenter.firstName, commenter.lastName)}
                </div>
                <div className="comment-body">
                  <span className="comment-author">
                    {commenter.firstName} {commenter.lastName}
                  </span>
                  <p className="comment-text">{comment.content || comment.text}</p>
                </div>
              </div>
            );
          })}
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

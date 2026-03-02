import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import MediaEmbed, { extractMediaUrl, detectMedia } from './MediaEmbed';
import './PostCard.css';
import './MediaEmbed.css';

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
  const [commentMedia, setCommentMedia] = useState({ url: '', type: '' });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Derive inline media from post.media_url or from a link in post.content
  const postMediaUrl = post.media_url || extractMediaUrl(post.content);
  const postMediaType = post.media_type || (postMediaUrl ? detectMedia(postMediaUrl)?.kind : null);

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
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  // Detect embeddable link typed in comment box
  const handleCommentTextChange = (e) => {
    const val = e.target.value;
    setCommentText(val);
    // Only auto-detect if no file attached
    if (!commentMedia.url || !commentMedia.url.startsWith('/api/uploads')) {
      const found = extractMediaUrl(val);
      if (found) {
        const info = detectMedia(found);
        if (info) {
          setCommentMedia({
            url: found,
            type: info.kind === 'youtube' || info.kind === 'vimeo' ? 'video' : info.kind,
          });
          return;
        }
      }
      setCommentMedia({ url: '', type: '' });
    }
  };

  const handleCommentFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCommentMedia({ url: res.data.url, type: res.data.type });
    } catch (err) {
      console.error('Comment upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const clearCommentMedia = () => setCommentMedia({ url: '', type: '' });

  const handleComment = async (e) => {
    e.preventDefault();
    if ((!commentText.trim() && !commentMedia.url) || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${post.id}/comments`, {
        content: commentText.trim(),
        media_url: commentMedia.url || undefined,
        media_type: commentMedia.type || undefined,
      });
      setCommentText('');
      setCommentMedia({ url: '', type: '' });
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
          {post.avatar_url
            ? <img src={post.avatar_url} alt={`${post.first_name} ${post.last_name}`} className="post-avatar-img" />
            : getInitials(post.first_name, post.last_name)
          }
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
        {post.content && <p>{post.content}</p>}
        {postMediaUrl && (
          <MediaEmbed
            url={postMediaUrl}
            type={postMediaType === 'youtube' || postMediaType === 'vimeo' ? 'video' : postMediaType}
          />
        )}
      </div>

      <div className="post-stats">
        <span>{post.like_count || 0} likes</span>
        <span>{post.comment_count || 0} comments</span>
      </div>

      <div className="post-actions">
        <button className="post-action-btn" onClick={handleLike}>
          👍 Like
        </button>
        <button className="post-action-btn" onClick={toggleComments}>
          💬 Comment
        </button>
      </div>

      {showComments && (
        <div className="post-comments">
          {comments.map((comment, idx) => {
            const cmtMediaUrl = comment.media_url || extractMediaUrl(comment.content);
            const cmtMediaType = comment.media_type || (cmtMediaUrl ? detectMedia(cmtMediaUrl)?.kind : null);
            return (
              <div key={comment.id || idx} className="comment">
                <div className="comment-avatar">
                  {comment.avatar_url
                    ? <img src={comment.avatar_url} alt={`${comment.first_name} ${comment.last_name}`} className="comment-avatar-img" />
                    : getInitials(comment.first_name, comment.last_name)
                  }
                </div>
                <div className="comment-body">
                  <span className="comment-author">
                    {comment.first_name} {comment.last_name}
                  </span>
                  {comment.content && <p className="comment-text">{comment.content}</p>}
                  {cmtMediaUrl && (
                    <MediaEmbed
                      url={cmtMediaUrl}
                      type={cmtMediaType === 'youtube' || cmtMediaType === 'vimeo' ? 'video' : cmtMediaType}
                      className="comment-media"
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Comment input with media */}
          <form onSubmit={handleComment} className="comment-form">
            <div className="comment-form-inner">
              <input
                type="text"
                placeholder="Write a comment… or paste an image/video link"
                value={commentText}
                onChange={handleCommentTextChange}
                className="comment-input"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleCommentFileSelect}
              />
              <button
                type="button"
                className="comment-media-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Attach image or video"
              >
                {uploading ? '…' : '📎'}
              </button>
              <button
                type="submit"
                className="comment-submit"
                disabled={submitting || (!commentText.trim() && !commentMedia.url)}
              >
                Post
              </button>
            </div>
            {commentMedia.url && (
              <div className="comment-media-preview">
                <button
                  type="button"
                  className="comment-media-remove"
                  onClick={clearCommentMedia}
                  title="Remove media"
                >
                  ✕
                </button>
                <MediaEmbed url={commentMedia.url} type={commentMedia.type} className="comment-media" />
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default PostCard;


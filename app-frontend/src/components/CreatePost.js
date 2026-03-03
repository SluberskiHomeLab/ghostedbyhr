import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MediaEmbed, { extractMediaUrl, detectMedia } from './MediaEmbed';
import './CreatePost.css';
import './MediaEmbed.css';

function CreatePost({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState('public');

  // @mention autocomplete
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);
  const mentionRef = useRef(null);
  const fileInputRef = useRef(null);
  const mentionTimerRef = useRef(null);

  // Close mention dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (mentionRef.current && !mentionRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setMentionSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Detect an embeddable URL pasted / typed in the textarea
  const handleContentChange = useCallback((e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(val);

    // @mention detection: find the most recent @ before cursor
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_.]*)$/);
    if (atMatch) {
      const q = atMatch[1];
      setMentionQuery(q);
      setMentionStart(cursor - atMatch[0].length);
      clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = setTimeout(async () => {
        if (q.length === 0) { setMentionSuggestions([]); return; }
        try {
          const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
          setMentionSuggestions((res.data || []).slice(0, 6));
        } catch { setMentionSuggestions([]); }
      }, 250);
    } else {
      setMentionSuggestions([]);
      setMentionQuery('');
      setMentionStart(-1);
    }

    // Only auto-detect link if no file has been attached already
    if (!mediaUrl || detectMedia(mediaUrl)?.kind === undefined) {
      const found = extractMediaUrl(val);
      if (found) {
        const info = detectMedia(found);
        if (info) {
          setMediaUrl(found);
          setMediaType(info.kind === 'youtube' || info.kind === 'vimeo' ? 'video' : info.kind);
        }
      } else {
        // Clear link-based preview but keep file-based one
        setMediaUrl((prev) => {
          // If prev URL is a relative /api/uploads path it came from a file, keep it
          if (prev && prev.startsWith('/api/uploads')) return prev;
          return '';
        });
        setMediaType('');
      }
    }
  }, [mediaUrl]);

  const handleMentionSelect = (username) => {
    // Replace from mentionStart up to cursor with @username + space
    const textarea = textareaRef.current;
    const cursor = textarea.selectionStart;
    const before = content.slice(0, mentionStart);
    const after = content.slice(cursor);
    const newVal = before + '@' + username + ' ' + after;
    setContent(newVal);
    setMentionSuggestions([]);
    setMentionQuery('');
    setMentionStart(-1);
    // Restore focus after React re-render
    setTimeout(() => {
      const pos = mentionStart + username.length + 2;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrl(res.data.url);
      setMediaType(res.data.type);
    } catch (err) {
      setUploadError('Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      // Reset so same file can be re-selected
      e.target.value = '';
    }
  };

  const clearMedia = () => {
    setMediaUrl('');
    setMediaType('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!content.trim() && !mediaUrl) || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/posts', {
        content: content.trim(),
        media_url: mediaUrl || undefined,
        media_type: mediaType || undefined,
        visibility,
      });
      setContent('');
      setMediaUrl('');
      setMediaType('');
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
    : '';

  const canSubmit = (content.trim() || mediaUrl) && !submitting && !uploading;

  return (
    <div className="create-post">
      <div className="create-post-header">
        <div className="create-post-avatar">
          {user?.avatar_url
            ? <img src={user.avatar_url} alt={user.first_name} className="create-post-avatar-img" />
            : initials
          }
        </div>
        <span className="create-post-greeting">
          What's on your mind, {user?.first_name}?
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="create-post-textarea-wrap">
          <textarea
            ref={textareaRef}
            className="create-post-textarea"
            placeholder="Share your job search experience, vent about ghosting, or celebrate a win... Paste an image/video link to embed it."
            value={content}
            onChange={handleContentChange}
            rows={3}
          />
          {mentionSuggestions.length > 0 && (
            <div className="mention-dropdown" ref={mentionRef}>
              {mentionSuggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="mention-suggestion"
                  onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(u.username); }}
                >
                  <span className="mention-suggestion-name">{u.first_name} {u.last_name}</span>
                  <span className="mention-suggestion-username">@{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Media preview */}
        {mediaUrl && (
          <div className="create-post-media-preview">
            <button
              type="button"
              className="create-post-media-remove"
              onClick={clearMedia}
              title="Remove media"
            >
              ✕
            </button>
            <MediaEmbed url={mediaUrl} type={mediaType} />
          </div>
        )}

        {uploadError && <p className="create-post-upload-error">{uploadError}</p>}

        <div className="create-post-footer">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="visibility-btn"
            onClick={() => setVisibility(v => v === 'public' ? 'connections' : 'public')}
            title="Toggle post visibility"
          >
            {visibility === 'public' ? '🌐 Public' : '👥 Connections'}
          </button>

          <button
            type="button"
            className="create-post-media-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach image or video"
          >
            {uploading ? (
              <span className="create-post-uploading">Uploading…</span>
            ) : (
              <>
                <span className="media-btn-icon">📎</span>
                <span className="media-btn-label">Photo / Video</span>
              </>
            )}
          </button>

          <button
            type="submit"
            className="create-post-btn"
            disabled={!canSubmit}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreatePost;


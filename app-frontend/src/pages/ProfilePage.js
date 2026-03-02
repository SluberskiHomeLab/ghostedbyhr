import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ProfilePage.css';

function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editForm, setEditForm] = useState({
    headline: '',
    bio: '',
    location: '',
  });
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const isOwnProfile =
    currentUser && (currentUser.id === parseInt(id, 10) || String(currentUser.id) === id);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get('/posts', { params: { user_id: id } }),
      ]);
      const profileData = profileRes.data;
      setProfile(profileData);
      const userPosts = Array.isArray(postsRes.data) ? postsRes.data : postsRes.data.posts || [];
      setPosts(userPosts);
      setEditForm({
        headline: profileData.headline || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    try {
      await api.put(`/users/${id}`, editForm);
      setEditing(false);
      fetchProfile();
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    const setter = type === 'avatar' ? setUploadingAvatar : setUploadingBanner;
    setter(true);
    try {
      await api.post(`/users/${id}/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchProfile();
      if (isOwnProfile) refreshUser();
    } catch (err) {
      console.error(`Failed to upload ${type}:`, err);
    } finally {
      setter(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <Navbar />
        <div className="profile-container">
          <div className="profile-loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <Navbar />
        <div className="profile-container">
          <div className="profile-loading">User not found.</div>
        </div>
      </div>
    );
  }

  const initials = `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase();

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-container">
        <div className="profile-header-card">

          {/* Banner */}
          <div
            className="profile-banner"
            style={{
              backgroundImage: profile.banner_url
                ? `url(${profile.banner_url})`
                : 'linear-gradient(135deg, #1a1a2e, #6c63ff)',
            }}
          >
            {isOwnProfile && (
              <>
                <button
                  className="upload-overlay-btn banner-upload-btn"
                  onClick={() => bannerInputRef.current.click()}
                  disabled={uploadingBanner}
                  title="Change banner image"
                >
                  {uploadingBanner ? '⏳' : '🖼 Change Banner'}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="upload-input-hidden"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'banner')}
                />
              </>
            )}
          </div>

          <div className="profile-header-content">
            {/* Avatar */}
            <div className="profile-avatar-wrapper">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="profile-avatar-large profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-large">{initials}</div>
              )}
              {isOwnProfile && (
                <>
                  <button
                    className="upload-overlay-btn avatar-upload-btn"
                    onClick={() => avatarInputRef.current.click()}
                    disabled={uploadingAvatar}
                    title="Change profile picture"
                  >
                    {uploadingAvatar ? '⏳' : '📷'}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="upload-input-hidden"
                    onChange={(e) => handleImageUpload(e.target.files[0], 'avatar')}
                  />
                </>
              )}
            </div>

            <div className="profile-info">
              <h1>
                {profile.first_name} {profile.last_name}
              </h1>
              {editing ? (
                <div className="profile-edit-form">
                  <input
                    type="text"
                    placeholder="Headline"
                    value={editForm.headline}
                    onChange={(e) =>
                      setEditForm({ ...editForm, headline: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                  />
                  <textarea
                    placeholder="Bio"
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    rows={3}
                  />
                  <div className="profile-edit-actions">
                    <button className="save-btn" onClick={handleSave}>
                      Save
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {profile.headline && (
                    <p className="profile-headline">{profile.headline}</p>
                  )}
                  {profile.location && (
                    <p className="profile-location">📍 {profile.location}</p>
                  )}
                  {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                  {isOwnProfile && (
                    <button
                      className="edit-profile-btn"
                      onClick={() => setEditing(true)}
                    >
                      Edit Profile
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="profile-posts-section">
          <h2>Posts</h2>
          {posts.length === 0 ? (
            <p className="no-posts">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={fetchProfile}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}


export default ProfilePage;

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ProfilePage.css';

function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    headline: '',
    bio: '',
    location: '',
  });

  const isOwnProfile =
    currentUser && (currentUser._id === id || currentUser.id === id);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/users/${id}/posts`).catch(() => ({ data: [] })),
      ]);
      const profileData = profileRes.data.user || profileRes.data;
      setProfile(profileData);
      setPosts(postsRes.data.posts || postsRes.data || []);
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

  const initials = `${(profile.firstName || '')[0] || ''}${(profile.lastName || '')[0] || ''}`.toUpperCase();

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-container">
        <div className="profile-header-card">
          <div className="profile-banner" />
          <div className="profile-header-content">
            <div className="profile-avatar-large">{initials}</div>
            <div className="profile-info">
              <h1>
                {profile.firstName} {profile.lastName}
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
                key={post._id || post.id}
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

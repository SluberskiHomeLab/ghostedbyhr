import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AccountSettingsPage.css';

function ChangeEmailForm({ currentEmail, onSuccess }) {
  const { refreshUser } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newEmail.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/auth/change-email', { newEmail: newEmail.trim(), password });
      setSuccess(`Email updated to ${res.data.email}`);
      setNewEmail('');
      setPassword('');
      await refreshUser();
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to update email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-card">
      <h2>Change Email</h2>
      <p className="settings-current-value">Current: <strong>{currentEmail}</strong></p>
      {error && <div className="settings-error">{error}</div>}
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label htmlFor="newEmail">New Email Address</label>
          <input
            id="newEmail"
            type="email"
            placeholder="new@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="emailPassword">Current Password</label>
          <input
            id="emailPassword"
            type="password"
            placeholder="Confirm with your current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="settings-form-footer">
          <button type="submit" className="settings-save-btn" disabled={loading}>
            {loading ? 'Saving…' : 'Update Email'}
          </button>
          {success && <span className="settings-success">✓ {success}</span>}
        </div>
      </form>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to update password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-card">
      <h2>Change Password</h2>
      {error && <div className="settings-error">{error}</div>}
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label htmlFor="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="settings-form-footer">
          <button type="submit" className="settings-save-btn" disabled={loading}>
            {loading ? 'Saving…' : 'Update Password'}
          </button>
          {success && <span className="settings-success">✓ {success}</span>}
        </div>
      </form>
    </div>
  );
}

function NotificationSettingsForm() {
  const defaultSettings = {
    web_notifications: true,
    email_notifications: false,
    notify_likes: true,
    notify_comments: true,
    notify_mentions: true,
    notify_connections: true,
  };
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/notifications/settings')
      .then(res => setSettings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.put('/notifications/settings', settings);
      setSuccess('Notification preferences saved.');
    } catch {
      setError('Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-card">
      <h2>Notification Preferences</h2>
      {loading ? <p>Loading…</p> : (
        <form onSubmit={handleSave} className="settings-form">
          {error && <div className="settings-error">{error}</div>}

          <div className="notif-settings-group">
            <h3 className="notif-settings-section">Delivery</h3>
            <label className="notif-toggle-row">
              <span>Web notifications (in-app)</span>
              <input type="checkbox" checked={settings.web_notifications} onChange={() => toggle('web_notifications')} />
            </label>
            <label className="notif-toggle-row">
              <span>Email notifications</span>
              <input type="checkbox" checked={settings.email_notifications} onChange={() => toggle('email_notifications')} />
            </label>
          </div>

          <div className="notif-settings-group">
            <h3 className="notif-settings-section">Notify me about</h3>
            <label className="notif-toggle-row">
              <span>Likes on my posts</span>
              <input type="checkbox" checked={settings.notify_likes} onChange={() => toggle('notify_likes')} />
            </label>
            <label className="notif-toggle-row">
              <span>Comments on my posts</span>
              <input type="checkbox" checked={settings.notify_comments} onChange={() => toggle('notify_comments')} />
            </label>
            <label className="notif-toggle-row">
              <span>Mentions</span>
              <input type="checkbox" checked={settings.notify_mentions} onChange={() => toggle('notify_mentions')} />
            </label>
            <label className="notif-toggle-row">
              <span>Connection requests &amp; acceptances</span>
              <input type="checkbox" checked={settings.notify_connections} onChange={() => toggle('notify_connections')} />
            </label>
          </div>

          <div className="settings-form-footer">
            <button type="submit" className="settings-save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save Preferences'}
            </button>
            {success && <span className="settings-success">✓ {success}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

function AccountSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="settings-page">
      <Navbar />
      <div className="settings-container">
        <h1>Account Settings</h1>
        <ChangeEmailForm currentEmail={user?.email || ''} />
        <ChangePasswordForm />
        <NotificationSettingsForm />
        <p className="smtp-note">
          Email confirmations are sent when you change your email or password, if your server has SMTP configured.
        </p>
      </div>
    </div>
  );
}

export default AccountSettingsPage;
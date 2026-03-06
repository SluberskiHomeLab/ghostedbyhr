import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Footer from '../components/Footer';
import './AccountPage.css';

// ─── Personal Info Tab ──────────────────────────────────────────────────────

function PersonalInfoForm() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    headline: user?.headline || '',
    bio: user?.bio || '',
    location: user?.location || '',
    address: user?.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, form);
      await refreshUser();
      setSuccess('Personal information updated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save personal information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="acct-card">
      <h2>Personal Information</h2>
      {error && <div className="acct-error">{error}</div>}
      <form onSubmit={handleSubmit} className="acct-form">
        <div className="acct-form-row">
          <div className="form-group">
            <label>First Name</label>
            <input name="first_name" value={form.first_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input name="last_name" value={form.last_name} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-group">
          <label>Headline</label>
          <input name="headline" value={form.headline} onChange={handleChange} placeholder="e.g. Software Engineer" />
        </div>
        <div className="form-group">
          <label>Bio</label>
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} placeholder="Tell us a little about yourself" />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input name="location" value={form.location} onChange={handleChange} placeholder="City, State" />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input name="address" value={form.address} onChange={handleChange} placeholder="Street address" />
        </div>
        <div className="acct-form-footer">
          <button type="submit" className="acct-save-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {success && <span className="acct-success">✓ {success}</span>}
        </div>
      </form>
    </div>
  );
}

function ChangeEmailForm() {
  const { user, refreshUser } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.put('/auth/change-email', { newEmail: newEmail.trim(), password });
      setSuccess(`Email updated to ${res.data.email}`);
      setNewEmail('');
      setPassword('');
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="acct-card">
      <h2>Change Email</h2>
      <p className="acct-current-value">Current: <strong>{user?.email}</strong></p>
      {error && <div className="acct-error">{error}</div>}
      <form onSubmit={handleSubmit} className="acct-form">
        <div className="form-group">
          <label>New Email Address</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" required />
        </div>
        <div className="form-group">
          <label>Current Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm with your password" required />
        </div>
        <div className="acct-form-footer">
          <button type="submit" className="acct-save-btn" disabled={loading}>{loading ? 'Saving…' : 'Update Email'}</button>
          {success && <span className="acct-success">✓ {success}</span>}
        </div>
      </form>
    </div>
  );
}

function ChangePasswordForm() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Email-code reset sub-flow
  const [resetMode, setResetMode] = useState(false); // false = normal, true = code flow
  const [resetStep, setResetStep] = useState('send'); // 'send' | 'verify'
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: user.email });
      setSuccess('A 6-digit reset code has been sent to your email.');
      setResetStep('verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (resetNewPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (resetNewPassword !== resetConfirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: user.email, code: resetCode, newPassword: resetNewPassword });
      setSuccess('Password reset successfully.');
      setResetMode(false);
      setResetStep('send');
      setResetCode(''); setResetNewPassword(''); setResetConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="acct-card">
      <h2>Change Password</h2>
      {error && <div className="acct-error">{error}</div>}
      {success && <div className="acct-success-banner">✓ {success}</div>}

      {!resetMode ? (
        <>
          <form onSubmit={handleSubmit} className="acct-form">
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required />
            </div>
            <div className="acct-form-footer">
              <button type="submit" className="acct-save-btn" disabled={loading}>{loading ? 'Saving…' : 'Update Password'}</button>
            </div>
          </form>
          <p className="acct-reset-link-row">
            Forgot your current password?{' '}
            <button type="button" className="acct-text-btn" onClick={() => { setResetMode(true); setResetStep('send'); setError(''); setSuccess(''); }}>
              Reset via email code
            </button>
          </p>
        </>
      ) : (
        <>
          {resetStep === 'send' ? (
            <form onSubmit={handleSendCode} className="acct-form">
              <p className="acct-reset-info">
                A 6-digit code will be sent to <strong>{user?.email}</strong>.
              </p>
              <div className="acct-form-footer">
                <button type="button" className="acct-text-btn" onClick={() => { setResetMode(false); setError(''); setSuccess(''); }}>Cancel</button>
                <button type="submit" className="acct-save-btn" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Code'}</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="acct-form">
              <div className="form-group">
                <label>6-Digit Reset Code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} placeholder="Enter code from your email" required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Repeat new password" required />
              </div>
              <div className="acct-form-footer">
                <button type="button" className="acct-text-btn" onClick={() => { setResetMode(false); setResetStep('send'); setError(''); setSuccess(''); }}>Cancel</button>
                <button type="submit" className="acct-save-btn" disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</button>
              </div>
            </form>
          )}
        </>
      )}
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
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.get('/notifications/settings')
      .then((res) => setSettings(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      await api.put('/notifications/settings', settings);
      setSuccess('Notification preferences saved.');
    } catch {
      setError('Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const ToggleRow = ({ label, field }) => (
    <label className="notif-toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={settings[field]} onChange={() => toggle(field)} />
    </label>
  );

  return (
    <div className="acct-card">
      <h2>Notification Preferences</h2>
      {loading ? <p>Loading…</p> : loadError ? (
        <div className="acct-error">
          Failed to load notification preferences.{' '}
          <button type="button" className="acct-save-btn" onClick={fetchSettings}>Retry</button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="acct-form">
          {error && <div className="acct-error">{error}</div>}
          <div className="notif-group">
            <h3 className="notif-section-label">Delivery</h3>
            <ToggleRow label="Web notifications (in-app)" field="web_notifications" />
            <ToggleRow label="Email notifications" field="email_notifications" />
          </div>
          <div className="notif-group">
            <h3 className="notif-section-label">Notify me about</h3>
            <ToggleRow label="Likes on my posts" field="notify_likes" />
            <ToggleRow label="Comments on my posts" field="notify_comments" />
            <ToggleRow label="Mentions" field="notify_mentions" />
            <ToggleRow label="Connection requests & acceptances" field="notify_connections" />
          </div>
          <div className="acct-form-footer">
            <button type="submit" className="acct-save-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</button>
            {success && <span className="acct-success">✓ {success}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Billing Tab ────────────────────────────────────────────────────────────

const PLANS = [
  {
    tier: 'basic',
    name: 'Basic',
    description: 'Essential access to the platform for individual job seekers.',
    features: ['Full community access', 'Post & comment', 'Connect with others', 'Notifications'],
  },
  {
    tier: 'standard',
    name: 'Standard',
    description: 'Everything in Basic plus enhanced profile tools.',
    features: ['Everything in Basic', 'Enhanced profile visibility', 'Advanced search filters', 'Priority support'],
  },
  {
    tier: 'professional',
    name: 'Professional',
    description: 'Built for serious job seekers who want every advantage.',
    features: ['Everything in Standard', 'Profile analytics', 'Highlighted posts', 'Early feature access'],
  },
  {
    tier: 'business',
    name: 'Business',
    description: 'For teams, recruiters, and organizations.',
    features: ['Everything in Professional', 'Multiple team members', 'Bulk messaging', 'Dedicated account manager'],
  },
];

function BillingTab({ user, refreshUser }) {
  const [billingStatus, setBillingStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const checkoutSuccess = searchParams.get('success') === '1';
  const checkoutCanceled = searchParams.get('canceled') === '1';

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/billing/status');
      setBillingStatus(res.data);
    } catch {
      setBillingStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (checkoutSuccess) {
      // Refresh until status becomes active (webhook may be slightly delayed)
      const interval = setInterval(async () => {
        await fetchStatus();
        await refreshUser();
      }, 2000);
      const timeout = setTimeout(() => clearInterval(interval), 30000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [checkoutSuccess, fetchStatus, refreshUser]);

  const handleSubscribe = async (tier) => {
    setError('');
    setCheckoutLoading(tier);
    try {
      const res = await api.post('/billing/checkout', { tier });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setError('');
    setPortalLoading(true);
    try {
      const res = await api.post('/billing/portal');
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open billing portal.');
      setPortalLoading(false);
    }
  };

  const isActive = ['active', 'trialing'].includes(billingStatus?.subscription_status);
  const currentTier = billingStatus?.subscription_tier;

  const statusDisplay = {
    active: { label: 'Active', className: 'status-active' },
    trialing: { label: 'Trial', className: 'status-trialing' },
    past_due: { label: 'Payment Past Due', className: 'status-past-due' },
    canceled: { label: 'Canceled', className: 'status-canceled' },
    inactive: { label: 'Not Subscribed', className: 'status-inactive' },
  };

  const status = billingStatus?.subscription_status || 'inactive';
  const statusInfo = statusDisplay[status] || statusDisplay.inactive;

  return (
    <div className="billing-tab">
      {checkoutSuccess && (
        <div className="acct-success-banner">
          🎉 Subscription confirmed! Your account is now active.
        </div>
      )}
      {checkoutCanceled && (
        <div className="acct-info-banner">
          Checkout was canceled. Choose a plan below to subscribe.
        </div>
      )}

      {/* Status summary */}
      <div className="acct-card billing-status-card">
        <h2>Subscription Status</h2>
        {loadingStatus ? (
          <p>Loading…</p>
        ) : (
          <div className="billing-status-row">
            <span className={`billing-status-badge ${statusInfo.className}`}>{statusInfo.label}</span>
            {currentTier && <span className="billing-tier-label">{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan</span>}
            {billingStatus?.subscription_expires_at && (
              <span className="billing-expiry">
                {status === 'canceled' ? 'Access until' : 'Renews'}: {new Date(billingStatus.subscription_expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
        {isActive && (
          <button className="acct-save-btn billing-portal-btn" onClick={handlePortal} disabled={portalLoading}>
            {portalLoading ? 'Opening…' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {error && <div className="acct-error">{error}</div>}

      {/* Plan cards */}
      {!isActive && (
        <>
          <h2 className="billing-plans-heading">Choose a Plan</h2>
          <p className="billing-plans-sub">All plans are billed annually.</p>
          <div className="billing-plans-grid">
            {PLANS.map((plan) => (
              <div key={plan.tier} className={`billing-plan-card ${currentTier === plan.tier ? 'current-plan' : ''}`}>
                <div className="plan-card-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  {currentTier === plan.tier && <span className="plan-badge">Current</span>}
                </div>
                <p className="plan-desc">{plan.description}</p>
                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <button
                  className="plan-subscribe-btn"
                  onClick={() => handleSubscribe(plan.tier)}
                  disabled={checkoutLoading === plan.tier}
                >
                  {checkoutLoading === plan.tier ? 'Redirecting…' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {isActive && (
        <div className="acct-card">
          <p className="billing-manage-note">
            Use <strong>Manage Subscription</strong> above to update your payment method, change plans, or cancel.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main AccountPage ────────────────────────────────────────────────────────

function AccountPage() {
  const { user, loading, showModal, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'billing' ? 'billing' : 'account');

  useEffect(() => {
    if (tabParam === 'billing') setActiveTab('billing');
  }, [tabParam]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    navigate(`/account${tab === 'billing' ? '?tab=billing' : ''}`, { replace: true });
  };

  useEffect(() => {
    if (!loading && !user) {
      showModal('login');
    }
  }, [loading, user, showModal]);

  if (loading) return <div className="acct-loading">Loading…</div>;
  if (!user) return null;

  return (
    <>
    <div className="acct-page">
      <div className="acct-container">
        <div className="acct-header">
          <h1>Account</h1>
          <div className="acct-tabs">
            <button
              className={`acct-tab ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => switchTab('account')}
            >
              Account Settings
            </button>
            <button
              className={`acct-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => switchTab('billing')}
            >
              Billing
            </button>
          </div>
        </div>

        {activeTab === 'account' && (
          <div className="acct-tab-content">
            <PersonalInfoForm />
            <ChangeEmailForm />
            <ChangePasswordForm />
            <NotificationSettingsForm />
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="acct-tab-content">
            <BillingTab user={user} refreshUser={refreshUser} />
          </div>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
}

export default AccountPage;

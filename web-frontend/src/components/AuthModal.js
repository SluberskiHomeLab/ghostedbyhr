import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AuthModal.css';

function AuthModal() {
  const { modal, login, register, hideModal } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(modal); // 'login' | 'register' | 'forgot' | 'reset'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (modal) setMode(modal);
  }, [modal]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') hideModal();
    },
    [hideModal]
  );

  useEffect(() => {
    if (modal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [modal, handleKeyDown]);

  if (!modal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        hideModal();
        const redirect = sessionStorage.getItem('post_login_redirect');
        if (redirect) {
          sessionStorage.removeItem('post_login_redirect');
          navigate(redirect);
        }
      } else if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await register(email, password, firstName, lastName);
        hideModal();
        const redirect = sessionStorage.getItem('post_login_redirect');
        if (redirect) {
          sessionStorage.removeItem('post_login_redirect');
          navigate(redirect);
        }
      } else if (mode === 'forgot') {
        await api.post('/auth/forgot-password', { email });
        setSuccess('If that email is registered, a 6-digit reset code has been sent. Check your inbox.');
        // Transition to reset step, keeping email pre-filled
        setMode('reset');
      } else if (mode === 'reset') {
        if (newPassword.length < 6) {
          setError('New password must be at least 6 characters.');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError('Passwords do not match.');
          return;
        }
        await api.post('/auth/reset-password', { email, code: resetCode, newPassword });
        setSuccess('Password reset successfully! You can now sign in.');
        setMode('login');
        setEmail('');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          (mode === 'login'
            ? 'Login failed. Check your credentials.'
            : mode === 'register'
            ? 'Registration failed. Please try again.'
            : mode === 'reset'
            ? 'Invalid or expired reset code.'
            : 'Something went wrong. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isForgotOrReset = mode === 'forgot' || mode === 'reset';

  return (
    <div className="auth-modal-overlay" onClick={hideModal} role="dialog" aria-modal="true">
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={hideModal} aria-label="Close">
          &times;
        </button>

        {!isForgotOrReset && (
          <div className="auth-modal-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
              type="button"
            >
              Sign Up
            </button>
          </div>
        )}

        {isForgotOrReset && (
          <div className="auth-modal-forgot-header">
            <button
              type="button"
              className="auth-back-link"
              onClick={() => switchMode('login')}
            >
              ← Back to Sign In
            </button>
            <h2 className="auth-modal-title">
              {mode === 'forgot' ? 'Reset Your Password' : 'Enter Reset Code'}
            </h2>
          </div>
        )}

        {error && <div className="auth-modal-error">{error}</div>}
        {success && <div className="auth-modal-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-modal-form">
          {/* ── Register fields ── */}
          {mode === 'register' && (
            <div className="auth-form-row">
              <div className="form-group">
                <label htmlFor="am-first-name">First Name</label>
                <input
                  id="am-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="am-last-name">Last Name</label>
                <input
                  id="am-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
          )}

          {/* ── Email field (all modes) ── */}
          <div className="form-group">
            <label htmlFor="am-email">Email</label>
            <input
              id="am-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              readOnly={mode === 'reset'}
            />
          </div>

          {/* ── Login / Register password ── */}
          {(mode === 'login' || mode === 'register') && (
            <div className="form-group">
              <label htmlFor="am-password">Password</label>
              <input
                id="am-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          )}

          {/* ── Register confirm password ── */}
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="am-confirm-password">Confirm Password</label>
              <input
                id="am-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          {/* ── Reset mode: code + new passwords ── */}
          {mode === 'reset' && (
            <>
              <div className="form-group">
                <label htmlFor="am-reset-code">6-Digit Reset Code</label>
                <input
                  id="am-reset-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter the code from your email"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="am-new-password">New Password</label>
                <input
                  id="am-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="am-confirm-new-password">Confirm New Password</label>
                <input
                  id="am-confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>
            </>
          )}

          {/* ── Forgot password link (login mode only) ── */}
          {mode === 'login' && (
            <div className="auth-forgot-row">
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => switchMode('forgot')}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className="auth-modal-submit" disabled={submitting}>
            {submitting
              ? '...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : mode === 'forgot'
              ? 'Send Reset Code'
              : 'Reset Password'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="auth-modal-switch">
            New here?{' '}
            <button type="button" className="auth-switch-link" onClick={() => switchMode('register')}>
              Create an account
            </button>
          </p>
        )}
        {mode === 'register' && (
          <p className="auth-modal-switch">
            Already have an account?{' '}
            <button type="button" className="auth-switch-link" onClick={() => switchMode('login')}>
              Sign in
            </button>
          </p>
        )}
        {mode === 'reset' && (
          <p className="auth-modal-switch">
            Didn't receive a code?{' '}
            <button type="button" className="auth-switch-link" onClick={() => switchMode('forgot')}>
              Resend code
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthModal;

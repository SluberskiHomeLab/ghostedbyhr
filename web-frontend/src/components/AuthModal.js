import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

function AuthModal() {
  const { modal, login, register, hideModal } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(modal);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
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
    setError('');
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
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await register(email, password, firstName, lastName);
      }
      hideModal();
      // Handle post-login redirect (e.g. from pricing page "Get Started")
      const redirect = sessionStorage.getItem('post_login_redirect');
      if (redirect) {
        sessionStorage.removeItem('post_login_redirect');
        navigate(redirect);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          (mode === 'login' ? 'Login failed. Check your credentials.' : 'Registration failed. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={hideModal} role="dialog" aria-modal="true">
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={hideModal} aria-label="Close">
          &times;
        </button>

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

        {error && <div className="auth-modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-modal-form">
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

          <div className="form-group">
            <label htmlFor="am-email">Email</label>
            <input
              id="am-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

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

          <button type="submit" className="auth-modal-submit" disabled={submitting}>
            {submitting
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        {mode === 'login' ? (
          <p className="auth-modal-switch">
            New here?{' '}
            <button type="button" className="auth-switch-link" onClick={() => switchMode('register')}>
              Create an account
            </button>
          </p>
        ) : (
          <p className="auth-modal-switch">
            Already have an account?{' '}
            <button type="button" className="auth-switch-link" onClick={() => switchMode('login')}>
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthModal;

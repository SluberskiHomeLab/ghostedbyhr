import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ForgotPasswordPage.css';

function ForgotPasswordPage() {
  const navigate = useNavigate();

  // 'request' → user enters email
  // 'reset'   → user enters code + new password
  const [step, setStep] = useState('request');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Step 1 – send the reset code
  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setInfo('If that email is registered, a 6-digit reset code has been sent. Check your inbox.');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 – verify code + set new password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      navigate('/login', { state: { resetSuccess: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-container">
        <div className="forgot-brand">
          <h1>👻 Ghosted By HR</h1>
          <p>Reset your password and get back to the community.</p>
        </div>

        <div className="forgot-card">
          {step === 'request' ? (
            <>
              <h2>Forgot Password</h2>
              <p className="forgot-subtitle">
                Enter your account email and we'll send you a 6-digit reset code.
              </p>
              {error && <div className="forgot-error">{error}</div>}
              <form onSubmit={handleRequest}>
                <div className="form-group">
                  <label htmlFor="fp-email">Email Address</label>
                  <input
                    id="fp-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <button type="submit" className="forgot-btn" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Enter Reset Code</h2>
              {info && <div className="forgot-info">{info}</div>}
              {error && <div className="forgot-error">{error}</div>}
              <form onSubmit={handleReset}>
                <div className="form-group">
                  <label htmlFor="fp-email-ro">Email Address</label>
                  <input
                    id="fp-email-ro"
                    type="email"
                    value={email}
                    readOnly
                    className="forgot-input-readonly"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fp-code">6-Digit Reset Code</label>
                  <input
                    id="fp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter the code from your email"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fp-new-password">New Password</label>
                  <input
                    id="fp-new-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fp-confirm-password">Confirm New Password</label>
                  <input
                    id="fp-confirm-password"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="forgot-btn" disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
              <p className="forgot-footer">
                Didn't receive a code?{' '}
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={() => { setStep('request'); setError(''); setInfo(''); setCode(''); setNewPassword(''); setConfirmPassword(''); }}
                >
                  Resend code
                </button>
              </p>
            </>
          )}

          <p className="forgot-footer">
            <Link to="/login">← Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

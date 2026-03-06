import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const { appLogin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.resetSuccess ? 'Password reset successfully. You can now sign in.' : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await appLogin(email, password);
      navigate('/');
    } catch (err) {
      if (err.subscriptionRequired && err.redirectUrl) {
        window.location.href = err.redirectUrl;
        return;
      }
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <h1>👻 Ghosted By HR</h1>
          <p>Connect with fellow job seekers. Share your experiences. You're not alone.</p>
        </div>
        <div className="login-card">
          <h2>Sign In</h2>
          {info && <div className="login-info">{info}</div>}
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="login-footer">
            <Link to="/forgot-password" className="login-forgot-link">Forgot password?</Link>
          </p>
          <p className="login-footer">
            New to Ghosted By HR? <Link to="/register">Join now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

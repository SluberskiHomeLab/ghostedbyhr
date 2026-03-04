import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Footer.css';

function Footer() {
  const { user, showModal } = useAuth();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-brand">👻 Ghosted By HR</h3>
          <p className="footer-tagline">A community for job seekers to share experiences and have fun.</p>
        </div>
        <div className="footer-section">
          <h4>Navigation</h4>
          <Link to="/" className="footer-link">Home</Link>
          <Link to="/features" className="footer-link">Features</Link>
          <Link to="/about" className="footer-link">About</Link>
        </div>
        <div className="footer-section">
          <h4>Account</h4>
          {user ? (
            <>
              <a href={config.APP_URL} className="footer-link">Go to App</a>
              <Link to="/account" className="footer-link">Account Settings</Link>
              <Link to="/account?tab=billing" className="footer-link">Billing</Link>
            </>
          ) : (
            <>
              <button className="footer-link footer-link-btn" onClick={() => showModal('login')}>Sign In</button>
              <button className="footer-link footer-link-btn" onClick={() => showModal('register')}>Sign Up</button>
            </>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Ghosted By HR. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;

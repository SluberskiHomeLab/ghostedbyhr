import React from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import './Footer.css';

function Footer() {
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
          <a href={`${config.APP_URL}/login`} className="footer-link">Sign In</a>
          <a href={`${config.APP_URL}/register`} className="footer-link">Sign Up</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Ghosted By HR. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;

import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          👻 Ghosted By HR
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/features" className="nav-link">Features</Link>
          <Link to="/about" className="nav-link">About</Link>
        </div>
        <div className="navbar-auth">
          <a href={`${APP_URL}/login`} className="btn btn-signin">Sign In</a>
          <a href={`${APP_URL}/register`} className="btn btn-signup">Sign Up</a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

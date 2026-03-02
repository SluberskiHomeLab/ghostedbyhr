import React from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import logo from '../assets/logo.jpg';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="Ghosted By HR" className="navbar-logo" />
          <span className="navbar-title">Ghosted By HR</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/features" className="nav-link">Features</Link>
          <Link to="/about" className="nav-link">About</Link>
        </div>
        <div className="navbar-auth">
          <a href={`${config.APP_URL}/login`} className="btn btn-signin">Sign In</a>
          <a href={`${config.APP_URL}/register`} className="btn btn-signup">Sign Up</a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

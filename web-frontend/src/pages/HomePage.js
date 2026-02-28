import React from 'react';
import Footer from '../components/Footer';
import config from '../config';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Tired of Being Ghosted by HR?</h1>
          <p className="hero-subtitle">
            You&apos;re not alone. Join a community of job seekers sharing their experiences,
            reviewing companies, and supporting each other through the job search process.
          </p>
          <a href={`${config.APP_URL}/register`} className="hero-cta">Get Started</a>
        </div>
      </section>

      {/* Features Overview */}
      <section className="features-overview">
        <h2 className="section-title">Why Ghosted By HR?</h2>
        <p className="section-subtitle">Everything you need to navigate your job search with confidence.</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Share Your Story</h3>
            <p>Post your ghosting experiences anonymously and let others know which companies leave candidates hanging.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Connect with Others</h3>
            <p>Find a supportive community of job seekers who understand the frustration of being left in the dark.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⭐</div>
            <h3>Company Reviews</h3>
            <p>Read and write honest reviews about company hiring practices so others can make informed decisions.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Job Search Support</h3>
            <p>Access resources, tips, and community wisdom to improve your job search strategy and land your next role.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Getting started is simple.</p>
        <div className="steps-grid">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create an Account</h3>
            <p>Sign up for free and join the community in seconds.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Share Your Experience</h3>
            <p>Post about companies that ghosted you or share positive hiring experiences.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Browse &amp; Connect</h3>
            <p>Explore stories from others, review companies, and find support from the community.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default HomePage;

import React from 'react';
import Footer from '../components/Footer';
import config from '../config';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About Ghosted By HR</h1>
        <p>Our mission is to expose shitty hiring practices.</p>
      </section>

      <section className="about-content">
        <div className="about-section">
          <h2>Our Mission</h2>
          <p>
            Ghosted By HR was born out of a shared frustration. Too many job seekers invest
            hours into applications, interviews, and follow-ups only to be met with silence.
            Too many Ghost Jobs on LinkedIn and Indeed, and no accountability for the companies that do it.
            We believe candidates deserve better, and that starts with transparency.
          </p>
          <p>
            Our platform empowers job seekers to share their experiences, hold companies
            accountable, and flat out taget and expose companies that have hiring practices that are
            beyond shitty.
          </p>
        </div>

        <div className="about-section">
          <h2>What We Stand For</h2>
          <div className="values-grid">
            <div className="value-card">
              <h3>🔍 Transparency</h3>
              <p>We believe every candidate deserves honest communication from potential employers.</p>
            </div>
            <div className="value-card">
              <h3>📖 Accountability </h3>
              <p>We give job seekers the tools and information to expose companies and ghost job postings.</p>
            </div>
            <div className="value-card">
              <h3>🤗 Freedom</h3>
              <p>Say what you want, share your experiences, and help make fun of shitty hiring practices.</p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>Join Us</h2>
          <p>
            Whether you’ve been ghosted by HR or are plagued with thousands of ghost job postings,
            we invite you to join our community and get some entertainment out of the shitty hiring process. 
            Share your stories, connect with others, and help us make fun of companies.
          </p>
          <a href={`${config.APP_URL}/register`} className="about-cta">Join the Community</a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default AboutPage;

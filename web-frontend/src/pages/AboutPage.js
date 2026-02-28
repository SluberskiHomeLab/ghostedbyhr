import React from 'react';
import Footer from '../components/Footer';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About Ghosted By HR</h1>
        <p>Our mission is to bring transparency to the hiring process.</p>
      </section>

      <section className="about-content">
        <div className="about-section">
          <h2>Our Mission</h2>
          <p>
            Ghosted By HR was born out of a shared frustration. Too many job seekers invest
            hours into applications, interviews, and follow-ups only to be met with silence.
            We believe candidates deserve better, and that starts with transparency.
          </p>
          <p>
            Our platform empowers job seekers to share their experiences, hold companies
            accountable, and support one another through the often stressful job search process.
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
              <h3>💪 Empowerment</h3>
              <p>We give job seekers the tools and information to make better career decisions.</p>
            </div>
            <div className="value-card">
              <h3>🤗 Community</h3>
              <p>We foster a supportive environment where shared experiences lead to collective strength.</p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>Join Us</h2>
          <p>
            Whether you have been ghosted once or a dozen times, your experience matters.
            Join our growing community and help us create a more transparent job market for everyone.
          </p>
          <a href="http://localhost:3000/register" className="about-cta">Join the Community</a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default AboutPage;

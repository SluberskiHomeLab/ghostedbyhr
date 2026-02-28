import React from 'react';
import Footer from '../components/Footer';
import './FeaturesPage.css';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

function FeaturesPage() {
  return (
    <div className="features-page">
      <section className="features-hero">
        <h1>Features</h1>
        <p>Discover everything Ghosted By HR has to offer.</p>
      </section>

      <section className="features-content">
        <div className="feature-detail">
          <div className="feature-detail-icon">📝</div>
          <div className="feature-detail-text">
            <h2>Share Your Story</h2>
            <p>
              Post your ghosting experiences and let the community know which companies
              leave candidates in the dark. Share timelines, communication breakdowns,
              and outcomes to help others set realistic expectations.
            </p>
          </div>
        </div>

        <div className="feature-detail reverse">
          <div className="feature-detail-icon">🤝</div>
          <div className="feature-detail-text">
            <h2>Connect with Others</h2>
            <p>
              Find a supportive community of job seekers who understand the frustration.
              Comment on posts, share advice, and build connections with people who
              have been through similar experiences.
            </p>
          </div>
        </div>

        <div className="feature-detail">
          <div className="feature-detail-icon">⭐</div>
          <div className="feature-detail-text">
            <h2>Company Reviews</h2>
            <p>
              Read honest reviews about company hiring practices. Our review system
              covers communication quality, interview process, timeline accuracy,
              and overall candidate experience.
            </p>
          </div>
        </div>

        <div className="feature-detail reverse">
          <div className="feature-detail-icon">🚀</div>
          <div className="feature-detail-text">
            <h2>Job Search Support</h2>
            <p>
              Access curated resources, resume tips, interview strategies, and
              community-driven wisdom to improve your job search and land your
              next role faster.
            </p>
          </div>
        </div>

        <div className="feature-detail">
          <div className="feature-detail-icon">📊</div>
          <div className="feature-detail-text">
            <h2>Company Insights</h2>
            <p>
              View aggregated data on company response rates, average time to hear back,
              and candidate satisfaction scores. Make informed decisions about where to
              apply next.
            </p>
          </div>
        </div>
      </section>

      <section className="features-cta-section">
        <h2>Ready to join the community?</h2>
        <p>Sign up today and start sharing your experiences.</p>
        <a href={`${APP_URL}/register`} className="features-cta">Get Started Free</a>
      </section>

      <Footer />
    </div>
  );
}

export default FeaturesPage;

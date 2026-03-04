import React from 'react';
import Footer from '../components/Footer';
import config from '../config';
import './FeaturesPage.css';

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
            <h2>Trash Talk Companies</h2>
            <p>
              Trash talk the companies that ghosted you. 
              Tell them to shove their hiring process up their asses.  
              Let the world know how you really feel about their hiring practices.
            </p>
          </div>
        </div>

        <div className="feature-detail reverse">
          <div className="feature-detail-icon">🚀</div>
          <div className="feature-detail-text">
            <h2>Familiar Experience</h2>
            <p>
              Ghosted By HR is designed to be intuitive and user-friendly, with a familiar social media-like interface.
              Post updates, comment on others' experiences, and engage with the community in a way that feels natural.
            </p>
          </div>
        </div>

        <div className="feature-detail">
          <div className="feature-detail-icon">📊</div>
          <div className="feature-detail-text">
            <h2>Company Sorting</h2>
            <p>
              Sort posts by company they are trashing.  
              Want to see all the posts trashing Google?  
              No problem.  Want to see all the posts trashing Amazon?  
              We got you.
            </p>
          </div>
        </div>
      </section>

      <section className="features-cta-section">
        <h2>Ready to join the community?</h2>
        <p>Sign up today and start sharing your experiences.</p>
        <a href={`${config.APP_URL}/register`} className="features-cta">Get Started</a>
      </section>

      <Footer />
    </div>
  );
}

export default FeaturesPage;

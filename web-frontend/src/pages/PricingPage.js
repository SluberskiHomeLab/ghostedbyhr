import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './PricingPage.css';

const PLANS = [
  {
    tier: 'basic',
    name: 'Basic',
    yearlyPrice: 9.99,
    monthlyEquiv: '0.83',
    highlight: false,
    badge: 'Best Value',
    description: 'Everything you need to join the conversation and share your story.',
    features: [
      'Full community access',
      'Post & comment freely',
      'Connect with fellow job seekers',
      'In-app notifications',
    ],
  },
  {
    tier: 'standard',
    name: 'Standard',
    yearlyPrice: 29.99,
    monthlyEquiv: '2.49',
    highlight: true,
    badge: 'Most Popular',
    description: 'Enhanced tools to make your voice stand out in the community.',
    features: [
      'Everything in Basic',
      'Enhanced profile visibility',
      'Advanced search filters',
      'Priority support',
    ],
  },
  {
    tier: 'professional',
    name: 'Professional',
    yearlyPrice: 49.99,
    monthlyEquiv: '4.17',
    highlight: false,
    badge: null,
    description: 'Built for serious job seekers who want every advantage.',
    features: [
      'Everything in Standard',
      'Profile analytics',
      'Highlighted posts',
      'Early feature access',
    ],
  },
  {
    tier: 'business',
    name: 'Business',
    yearlyPrice: 89.99,
    monthlyEquiv: '7.50',
    highlight: false,
    badge: null,
    description: 'For teams, recruiters, and organizations.',
    features: [
      'Everything in Professional',
      'Multiple team members',
      'Bulk messaging',
      'Dedicated account manager',
    ],
  },
];

function PricingPage() {
  const { user, showModal } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');

  const handleSubscribe = async (tier) => {
    setCheckoutError('');

    if (!user) {
      // Redirect to account billing tab after login
      sessionStorage.setItem('post_login_redirect', `/account?tab=billing&intent=${tier}`);
      showModal('register');
      return;
    }

    // Already subscribed — go to billing tab
    if (['active', 'trialing'].includes(user.subscription_status)) {
      navigate('/account?tab=billing');
      return;
    }

    setCheckoutLoading(tier);
    try {
      const res = await api.post('/billing/checkout', { tier });
      window.location.href = res.data.url;
    } catch (err) {
      setCheckoutError(err.response?.data?.error || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  };

  const isSubscribed = user && ['active', 'trialing'].includes(user.subscription_status);

  return (
    <div className="pricing-page">

      {/* Hero */}
      <section className="pricing-hero">
        <div className="pricing-hero-content">
          <span className="pricing-hero-eyebrow">Simple, transparent pricing</span>
          <h1>Less than a cup of coffee — for the whole year.</h1>
          <p>
            We built Ghosted By HR because job seekers deserve a place to speak honestly —
            without fear, without filter. Keeping the lights on means keeping our servers
            running and our community accountable. That's why we've set our entry price
            so low it's <strong>literally less than $1&nbsp;a month</strong>. No tricks, no
            algorithm-fuelled ad surveillance. Just a small, fair fee that covers
            infrastructure and ensures every voice in the community has real skin in the game.
          </p>
        </div>
      </section>

      {/* Why we charge */}
      <section className="pricing-why">
        <div className="pricing-why-inner">
          <div className="pricing-why-card">
            <div className="pricing-why-icon">🏗️</div>
            <h3>Infrastructure costs</h3>
            <p>
              Servers, databases, storage, and content delivery cost real money every
              month. Your subscription keeps everything fast, reliable, and ad-free.
            </p>
          </div>
          <div className="pricing-why-card">
            <div className="pricing-why-icon">🛡️</div>
            <h3>Accountability</h3>
            <p>
              A small barrier filters out throwaway accounts and bad actors. When
              members have invested — even a tiny amount — the community stays
              more civil, honest, and valuable for everyone.
            </p>
          </div>
          <div className="pricing-why-card">
            <div className="pricing-why-icon">🚀</div>
            <h3>Platform growth</h3>
            <p>
              Revenue from subscriptions funds new features, better moderation
              tools, and a support team that actually responds. You're not the
              product — you're the reason we exist.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pricing-plans-section">
        <h2 className="pricing-plans-heading">Choose your plan</h2>
        <p className="pricing-plans-sub">All plans billed annually. Cancel or manage any time via the billing portal.</p>

        {checkoutError && <div className="pricing-error">{checkoutError}</div>}

        <div className="pricing-plans-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`pricing-plan-card ${plan.highlight ? 'pricing-plan-featured' : ''}`}
            >
              {plan.badge && (
                <div className="pricing-plan-badge">{plan.badge}</div>
              )}
              <div className="pricing-plan-header">
                <h3 className="pricing-plan-name">{plan.name}</h3>
                <div className="pricing-plan-price">
                  <span className="pricing-plan-amount">${plan.yearlyPrice}</span>
                  <span className="pricing-plan-period">&nbsp;/ year</span>
                </div>
                <p className="pricing-plan-monthly">≈ ${plan.monthlyEquiv}&nbsp;/ month</p>
              </div>
              <p className="pricing-plan-desc">{plan.description}</p>
              <ul className="pricing-plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <span className="pricing-check">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`pricing-plan-btn ${plan.highlight ? 'pricing-plan-btn-featured' : ''}`}
                onClick={() => handleSubscribe(plan.tier)}
                disabled={checkoutLoading === plan.tier}
              >
                {checkoutLoading === plan.tier
                  ? 'Redirecting…'
                  : isSubscribed
                  ? 'Manage Subscription'
                  : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pricing-faq">
        <div className="pricing-faq-inner">
          <h2>Common questions</h2>
          <div className="pricing-faq-grid">
            <div className="pricing-faq-item">
              <h4>Can I cancel anytime?</h4>
              <p>
                Yes. Cancel from your account's billing tab at any time. You'll
                retain access until the end of your paid period.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h4>Is my payment secure?</h4>
              <p>
                Payments are processed by <strong>Stripe</strong>, a PCI-DSS
                Level 1 certified provider. We never store your card details.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h4>Can I upgrade or downgrade?</h4>
              <p>
                Absolutely. Use the Stripe billing portal — accessible from your
                account page — to switch plans at any time. Proration is handled
                automatically.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h4>Do you offer refunds?</h4>
              <p>
                If you're unhappy within 7 days of subscribing, reach out to
                support and we'll make it right. After that, refunds are at our
                discretion.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h4>What if I just want to browse?</h4>
              <p>
                You can create a free account to explore the platform. To post,
                comment, and interact with the community you'll need an active
                subscription.
              </p>
            </div>
            <div className="pricing-faq-item">
              <h4>How do I access the app after subscribing?</h4>
              <p>
                Once your subscription is active, click <strong>"Go to App"</strong>{' '}
                in the navigation bar and sign in with your account credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pricing-bottom-cta">
        <h2>Ready to stop being ghosted alone?</h2>
        <p>
          Join thousands of job seekers sharing real experiences for less than the
          cost of a single coin-op laundry load.
        </p>
        {!user && (
          <button className="pricing-cta-btn" onClick={() => showModal('register')}>
            Create your account
          </button>
        )}
        {user && !isSubscribed && (
          <button className="pricing-cta-btn" onClick={() => navigate('/account?tab=billing')}>
            Subscribe now
          </button>
        )}
        {isSubscribed && (
          <button className="pricing-cta-btn" onClick={() => navigate('/account?tab=billing')}>
            Manage subscription
          </button>
        )}
      </section>

      <Footer />
    </div>
  );
}

export default PricingPage;

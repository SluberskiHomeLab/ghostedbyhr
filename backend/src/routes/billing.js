const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_BASIC_YEARLY,
  STRIPE_PRICE_STANDARD_YEARLY,
  STRIPE_PRICE_PROFESSIONAL_YEARLY,
  STRIPE_PRICE_BUSINESS_YEARLY,
  WEB_FRONTEND_URL,
} = require('../config/secrets');

const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

const router = express.Router();

const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const TIER_PRICE_MAP = {
  basic: STRIPE_PRICE_BASIC_YEARLY,
  standard: STRIPE_PRICE_STANDARD_YEARLY,
  professional: STRIPE_PRICE_PROFESSIONAL_YEARLY,
  business: STRIPE_PRICE_BUSINESS_YEARLY,
};

// GET /api/billing/status
router.get('/status', billingLimiter, auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT subscription_status, subscription_tier, subscription_expires_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Billing status error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/billing/checkout
router.post('/checkout', billingLimiter, auth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  try {
    const { tier } = req.body;

    const isKnownTier = Object.prototype.hasOwnProperty.call(TIER_PRICE_MAP, tier);
    if (!isKnownTier) {
      return res.status(400).json({ error: 'Invalid subscription tier. Must be basic, standard, professional, or business.' });
    }

    const priceId = TIER_PRICE_MAP[tier];
    if (!priceId) {
      return res.status(503).json({ error: 'Subscription tier is configured but Stripe price is not set. Please try again later.' });
    }
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    // Create or reuse Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${WEB_FRONTEND_URL}/account?tab=billing&success=1`,
      cancel_url: `${WEB_FRONTEND_URL}/account?tab=billing&canceled=1`,
      metadata: { userId: String(user.id), tier },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/billing/portal
router.post('/portal', billingLimiter, auth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  try {
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { stripe_customer_id } = userResult.rows[0];

    if (!stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found. Please subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripe_customer_id,
      return_url: `${WEB_FRONTEND_URL}/account?tab=billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/billing/webhook  (raw body — mounted before express.json())
router.post('/webhook', billingLimiter, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.payment_status === 'paid') {
          const { userId, tier } = session.metadata || {};
          if (userId) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            const expiresAt = new Date(subscription.current_period_end * 1000);
            await pool.query(
              `UPDATE users
               SET subscription_status = $1, subscription_tier = $2, subscription_expires_at = $3
               WHERE id = $4`,
              ['active', tier, expiresAt, parseInt(userId, 10)]
            );
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const userId = customer.metadata?.userId;
        if (userId) {
          const status = sub.status; // active, trialing, past_due, canceled, etc.
          const expiresAt = new Date(sub.current_period_end * 1000);
          // Derive tier from price id
          const priceId = sub.items.data[0]?.price?.id;
          const tier = priceId
            ? (Object.entries(TIER_PRICE_MAP).find(([, v]) => v && v === priceId)?.[0] || null)
            : null;
          await pool.query(
            `UPDATE users
             SET subscription_status = $1, subscription_tier = $2, subscription_expires_at = $3
             WHERE id = $4`,
            [status, tier, expiresAt, parseInt(userId, 10)]
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const userId = customer.metadata?.userId;
        if (userId) {
          const expiresAt = new Date(sub.current_period_end * 1000);
          await pool.query(
            `UPDATE users
             SET subscription_status = 'canceled', subscription_expires_at = $1
             WHERE id = $2`,
            [expiresAt, parseInt(userId, 10)]
          );
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    res.status(500).json({ error: 'Server error processing webhook' });
  }
});

module.exports = router;

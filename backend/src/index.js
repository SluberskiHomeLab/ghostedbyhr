require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const { setupSocketIO } = require('./config/socketio');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const connectionRoutes = require('./routes/connections');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const hashtagRoutes = require('./routes/hashtags');
const billingRoutes = require('./routes/billing');

const app = express();
const httpServer = http.createServer(app);
setupSocketIO(httpServer);
const PORT = process.env.PORT || 5000;

// Trust the nginx reverse proxy so express-rate-limit reads the real
// client IP from X-Forwarded-For instead of the internal Docker IP.
app.set('trust proxy', 1);

let dbReady = false;

// Stripe webhook must receive raw body — mount before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors());
app.use(express.json());
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.get('/api/health', healthLimiter, async (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ status: 'unavailable', message: 'Database not connected' });
  }
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Ghosted By HR API is running' });
  } catch {
    res.status(503).json({ status: 'degraded', message: 'Database connection lost' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/billing', billingRoutes);

pool.connect()
  .then(async (client) => {
    console.log('Connected to PostgreSQL');
    client.release();
    // Migrate: add banner_url if this is an existing database
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500)`);
    // Migrate: add media support to posts and comments
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url VARCHAR(1000)`);
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type VARCHAR(20)`);
    await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_url VARCHAR(1000)`);
    await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_type VARCHAR(20)`);
    // Migrate: notifications tables
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(40) NOT NULL,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS user_notification_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      web_notifications BOOLEAN DEFAULT true,
      email_notifications BOOLEAN DEFAULT false,
      notify_likes BOOLEAN DEFAULT true,
      notify_comments BOOLEAN DEFAULT true,
      notify_mentions BOOLEAN DEFAULT true,
      notify_connections BOOLEAN DEFAULT true
    )`);
    // Migrate: username, visibility, hashtags
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)`);
    await pool.query(`UPDATE users SET username = LOWER(regexp_replace(first_name, '[^a-zA-Z0-9]', '', 'g') || '.' || regexp_replace(last_name, '[^a-zA-Z0-9]', '', 'g') || '.' || id) WHERE username IS NULL`);
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public'`);
    await pool.query(`CREATE TABLE IF NOT EXISTS hashtags (
      id SERIAL PRIMARY KEY,
      tag VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS post_hashtags (
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      hashtag_id INTEGER REFERENCES hashtags(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (post_id, hashtag_id)
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    // Migrate: subscription columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'inactive'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP`);
    // Migrate: address
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(500)`);
    // Migrate: password reset
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP`);
    dbReady = true;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  });

module.exports = { app, httpServer };

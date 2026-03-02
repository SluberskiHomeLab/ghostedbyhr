require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const connectionRoutes = require('./routes/connections');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

let dbReady = false;

app.use(cors());
app.use(express.json());
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', async (req, res) => {
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
    dbReady = true;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  });

module.exports = app;

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const connectionRoutes = require('./routes/connections');

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

pool.connect()
  .then(async (client) => {
    console.log('Connected to PostgreSQL');
    client.release();
    // Migrate: add banner_url if this is an existing database
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500)`);
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

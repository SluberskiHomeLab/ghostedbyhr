const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { JWT_SECRET } = require('../config/secrets');
const { sendMail } = require('../config/mailer');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for sensitive actions
});

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, username, headline, bio, location, avatar_url, created_at`,
      [email, password_hash, first_name, last_name]
    );

    const user = result.rows[0];

    // Auto-generate a unique username
    const baseUsername = (first_name + '.' + last_name).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const uniqueUsername = `${baseUsername}.${user.id}`;
    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [uniqueUsername, user.id]);
    user.username = uniqueUsername;

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /me
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, headline, bio, location, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /change-password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );

    // Notify via email (no-op if SMTP not configured)
    sendMail({
      to: user.email,
      subject: 'Your Ghosted By HR password was changed',
      html: `<p>Hi ${user.first_name},</p>
             <p>Your account password was just changed. If you did not do this, please contact support immediately.</p>`,
      text: `Hi ${user.first_name},\n\nYour account password was just changed. If you did not do this, please contact support immediately.`,
    }).catch((err) => console.error('Failed to send password-change email:', err.message));

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /change-email
router.put('/change-email', sensitiveActionLimiter, auth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ error: 'newEmail and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    const normalizedEmail = newEmail.toLowerCase().trim();
    if (normalizedEmail === user.email.toLowerCase()) {
      return res.status(400).json({ error: 'New email is the same as your current email' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'That email address is already in use' });
    }

    await pool.query(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [normalizedEmail, req.user.id]
    );

    // Notify old address (no-op if SMTP not configured)
    sendMail({
      to: user.email,
      subject: 'Your Ghosted By HR email address was changed',
      html: `<p>Hi ${user.first_name},</p>
             <p>The email address on your account was changed to <strong>${normalizedEmail}</strong>. If you did not do this, please contact support immediately.</p>`,
      text: `Hi ${user.first_name},\n\nThe email on your account was changed to ${normalizedEmail}. If you did not do this, please contact support immediately.`,
    }).catch((err) => console.error('Failed to send email-change notification:', err.message));

    res.json({ message: 'Email updated successfully', email: normalizedEmail });
  } catch (err) {
    console.error('Change email error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

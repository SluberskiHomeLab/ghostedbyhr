const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { JWT_SECRET, WEB_FRONTEND_URL } = require('../config/secrets');
const { sendMail, escapeHtml } = require('../config/mailer');

const router = express.Router();

const accountChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 account-change requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many account change attempts, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// POST /register
router.post('/register', authLimiter, async (req, res) => {
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
router.post('/login', authLimiter, async (req, res) => {
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
router.get('/me', readLimiter, auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, username, headline, bio, location, address, avatar_url, banner_url,
              subscription_status, subscription_tier, subscription_expires_at, created_at
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

// POST /app-login  — login gated by active subscription
router.post('/app-login', authLimiter, async (req, res) => {
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

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(user.subscription_status)) {
      return res.status(402).json({
        error: 'Please subscribe to use this platform',
        subscriptionRequired: true,
        redirectUrl: `${WEB_FRONTEND_URL}/account?tab=billing`,
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('App-login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /change-password
router.put('/change-password', accountChangeLimiter, auth, async (req, res) => {
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
router.put('/change-email', accountChangeLimiter, auth, async (req, res) => {
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
      html: `<p>Hi ${escapeHtml(user.first_name)},</p>
             <p>The email address on your account was changed to <strong>${escapeHtml(
               normalizedEmail
             )}</strong>. If you did not do this, please contact support immediately.</p>`,
      text: `Hi ${user.first_name},\n\nThe email on your account was changed to ${normalizedEmail}. If you did not do this, please contact support immediately.`,
    }).catch((err) => console.error('Failed to send email-change notification:', err.message));

    res.json({ message: 'Email updated successfully', email: normalizedEmail });
  } catch (err) {
    console.error('Change email error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /forgot-password
// Accepts { email }. Always returns 200 to prevent user enumeration.
// If the email is registered, generates a 6-digit reset code (bcrypt-hashed),
// stores it with a 30-minute expiry, and emails the plaintext code.
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [
      email.toLowerCase().trim(),
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Generate a 6-digit numeric code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const salt = await bcrypt.genSalt(10);
      const codeHash = await bcrypt.hash(code, salt);
      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [codeHash, expires, user.id]
      );

      sendMail({
        to: user.email,
        subject: 'Your Ghosted By HR password reset code',
        html: `<p>Hi ${escapeHtml(user.first_name)},</p>
               <p>Your password reset code is:</p>
               <h2 style="letter-spacing:4px;font-size:32px;">${escapeHtml(code)}</h2>
               <p>This code expires in <strong>30 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>`,
        text: `Hi ${user.first_name},\n\nYour password reset code is: ${code}\n\nThis code expires in 30 minutes. If you did not request this, you can safely ignore this email.`,
      }).catch((err) => console.error('Failed to send password reset email:', err.message));
    }

    // Always respond with success to prevent email enumeration
    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /reset-password
// Accepts { email, code, newPassword }.
// Validates the 6-digit code against the stored bcrypt hash and expiry,
// then updates the password and clears the reset token.
router.post('/reset-password', accountChangeLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'email, code, and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [
      email.toLowerCase().trim(),
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const user = result.rows[0];

    if (
      !user.password_reset_token ||
      !user.password_reset_expires ||
      new Date(user.password_reset_expires) < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const codeMatch = await bcrypt.compare(String(code).trim(), user.password_reset_token);
    if (!codeMatch) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE id = $2',
      [newHash, user.id]
    );

    sendMail({
      to: user.email,
      subject: 'Your Ghosted By HR password was reset',
      html: `<p>Hi ${escapeHtml(user.first_name)},</p>
             <p>Your account password was just reset. If you did not do this, please contact support immediately.</p>`,
      text: `Hi ${user.first_name},\n\nYour account password was just reset. If you did not do this, please contact support immediately.`,
    }).catch((err) => console.error('Failed to send password reset confirmation email:', err.message));

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

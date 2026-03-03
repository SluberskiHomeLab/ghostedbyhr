const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// GET / — list recent notifications for the current user
router.get('/', readLimiter, auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*,
              u.first_name AS actor_first_name,
              u.last_name  AS actor_last_name,
              u.avatar_url AS actor_avatar_url
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /unread-count
router.get('/unread-count', readLimiter, auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Unread count error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /read-all — mark all as read
router.put('/read-all', writeLimiter, auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Read all error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id/read — mark one as read
router.put('/:id/read', writeLimiter, auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark read error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /settings
router.get('/settings', readLimiter, auth, async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO user_notification_settings (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get notif settings error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /settings
router.put('/settings', writeLimiter, auth, async (req, res) => {
  try {
    const {
      web_notifications,
      email_notifications,
      notify_likes,
      notify_comments,
      notify_mentions,
      notify_connections,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO user_notification_settings
         (user_id, web_notifications, email_notifications, notify_likes, notify_comments, notify_mentions, notify_connections)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         web_notifications  = EXCLUDED.web_notifications,
         email_notifications= EXCLUDED.email_notifications,
         notify_likes       = EXCLUDED.notify_likes,
         notify_comments    = EXCLUDED.notify_comments,
         notify_mentions    = EXCLUDED.notify_mentions,
         notify_connections = EXCLUDED.notify_connections
       RETURNING *`,
      [
        req.user.id,
        web_notifications  ?? true,
        email_notifications ?? false,
        notify_likes       ?? true,
        notify_comments    ?? true,
        notify_mentions    ?? true,
        notify_connections ?? true,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update notif settings error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

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

// GET /trending - top hashtag for today, week, month
router.get('/trending', readLimiter, async (req, res) => {
  try {
    const periods = [
      { key: 'day',   interval: '1 day' },
      { key: 'week',  interval: '7 days' },
      { key: 'month', interval: '30 days' },
    ];

    const results = await Promise.all(periods.map(async ({ key, interval }) => {
      const r = await pool.query(
        `SELECT h.tag, COUNT(ph.post_id)::int AS count
         FROM post_hashtags ph
         JOIN hashtags h ON h.id = ph.hashtag_id
         WHERE ph.created_at >= NOW() - INTERVAL '${interval}'
         GROUP BY h.tag
         ORDER BY count DESC
         LIMIT 10`,
        []
      );
      return { period: key, tags: r.rows };
    }));

    res.json(results);
  } catch (err) {
    console.error('Trending hashtags error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /search?q= - search hashtags
router.get('/search', readLimiter, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const search = q.replace(/^#/, '').trim();
    if (!search) return res.json([]);

    const result = await pool.query(
      `SELECT h.tag, COUNT(ph.post_id)::int AS count
       FROM hashtags h
       LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
       WHERE h.tag ILIKE $1
       GROUP BY h.tag
       ORDER BY count DESC, h.tag ASC
       LIMIT 10`,
      [`%${search}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Hashtag search error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:tag/posts - posts for a given hashtag
router.get('/:tag/posts', readLimiter, async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase().replace(/^#/, '');
    const result = await pool.query(
      `SELECT p.*,
              u.first_name, u.last_name, u.username, u.headline, u.avatar_url,
              COALESCE(l.like_count, 0)::int AS like_count,
              COALESCE(c.comment_count, 0)::int AS comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       JOIN post_hashtags ph ON ph.post_id = p.id
       JOIN hashtags h ON h.id = ph.hashtag_id AND h.tag = $1
       LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM likes GROUP BY post_id) l ON p.id = l.post_id
       LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id
       WHERE p.visibility = 'public'
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [tag]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Hashtag posts error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

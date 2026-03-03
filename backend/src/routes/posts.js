const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { createNotification, extractMentions } = require('../utils/notify');

const router = express.Router();

// Optional auth — attaches user if valid token present, does not block
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../config/secrets');
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch { /* ignore */ }
  }
  next();
}

// Parse #hashtags from content and upsert into DB
async function syncHashtags(postId, content) {
  if (!content) return;
  const tags = [...new Set((content.match(/#([a-zA-Z0-9_]+)/g) || []).map(t => t.slice(1).toLowerCase()))];
  for (const tag of tags) {
    try {
      const h = await pool.query(
        `INSERT INTO hashtags (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag RETURNING id`,
        [tag]
      );
      await pool.query(
        `INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [postId, h.rows[0].id]
      );
    } catch { /* non-critical */ }
  }
}

const POST_SELECT = `p.*, u.first_name, u.last_name, u.username, u.headline, u.avatar_url,
  COALESCE(l.like_count, 0)::int AS like_count, COALESCE(c.comment_count, 0)::int AS comment_count`;

const POST_JOINS = `JOIN users u ON p.user_id = u.id
  LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM likes GROUP BY post_id) l ON p.id = l.post_id
  LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id`;

// GET / - Get posts
// Query params: user_id, feed=connections, sort=popular, hashtag, q
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { user_id, feed, sort, hashtag, q } = req.query;
    const params = [];
    const conditions = [];
    let extraJoins = '';

    if (user_id) {
      const parsedUserId = parseInt(user_id, 10);
      if (isNaN(parsedUserId)) return res.status(400).json({ error: 'user_id must be a valid integer' });
      params.push(parsedUserId);
      conditions.push(`p.user_id = $${params.length}`);
    } else if (feed === 'connections' && req.user) {
      params.push(req.user.id);
      const idx = params.length;
      conditions.push(`(p.user_id = $${idx} OR p.user_id IN (
        SELECT CASE WHEN requester_id = $${idx} THEN receiver_id ELSE requester_id END
        FROM connections
        WHERE (requester_id = $${idx} OR receiver_id = $${idx}) AND status = 'accepted'
      ))`);
    } else {
      conditions.push(`p.visibility = 'public'`);
    }

    if (hashtag) {
      const tag = hashtag.toLowerCase().replace(/^#/, '');
      params.push(tag);
      extraJoins = `JOIN post_hashtags _ph ON _ph.post_id = p.id JOIN hashtags _ht ON _ht.id = _ph.hashtag_id AND _ht.tag = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`p.content ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = sort === 'popular' ? `ORDER BY like_count DESC, p.created_at DESC` : `ORDER BY p.created_at DESC`;

    const result = await pool.query(
      `SELECT ${POST_SELECT} FROM posts p ${POST_JOINS} ${extraJoins} ${whereClause} ${orderClause} LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get posts error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST / - Create a post
router.post('/', auth, async (req, res) => {
  try {
    const { content, media_url, media_type, visibility = 'public' } = req.body;

    if (!content && !media_url) {
      return res.status(400).json({ error: 'Content or media is required' });
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, content, media_url, media_type, visibility)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, content || '', media_url || null, media_type || null, visibility]
    );
    const post = result.rows[0];

    // Sync hashtags (non-blocking)
    syncHashtags(post.id, content).catch(() => {});

    // Notify @username mentions
    if (content) {
      const mentionIds = await extractMentions(content, req.user.id);
      for (const mentionedId of mentionIds) {
        createNotification({ recipientId: mentionedId, actorId: req.user.id, type: 'mention', postId: post.id }).catch(() => {});
      }
    }

    res.status(201).json(post);
  } catch (err) {
    console.error('Create post error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - Get a single post
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${POST_SELECT} FROM posts p ${POST_JOINS} WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get post error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /:id - Delete own post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/like - Toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existing = await pool.query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      res.json({ message: 'Like removed' });
    } else {
      await pool.query(
        'INSERT INTO likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );
      // Notify post owner (don't notify self)
      const postOwner = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
      if (postOwner.rows.length > 0 && postOwner.rows[0].user_id !== userId) {
        createNotification({ recipientId: postOwner.rows[0].user_id, actorId: userId, type: 'like', postId: parseInt(postId) }).catch(() => {});
      }
      res.status(201).json({ message: 'Post liked' });
    }
  } catch (err) {
    console.error('Toggle like error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id/comments - Get comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.username, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get comments error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/comments - Add a comment
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content, media_url, media_type } = req.body;

    if (!content && !media_url) {
      return res.status(400).json({ error: 'Content or media is required' });
    }

    const post = await pool.query('SELECT id FROM posts WHERE id = $1', [req.params.id]);
    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content, media_url, media_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, req.user.id, content || '', media_url || null, media_type || null]
    );

    const postOwner = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (postOwner.rows.length > 0 && postOwner.rows[0].user_id !== req.user.id) {
      createNotification({ recipientId: postOwner.rows[0].user_id, actorId: req.user.id, type: 'comment', postId: parseInt(req.params.id), commentId: result.rows[0].id }).catch(() => {});
    }
    // Notify mentioned users
    if (content) {
      const mentionIds = await extractMentions(content, req.user.id);
      for (const mentionedId of mentionIds) {
        if (mentionedId !== (postOwner.rows[0] && postOwner.rows[0].user_id)) {
          createNotification({ recipientId: mentionedId, actorId: req.user.id, type: 'mention', postId: parseInt(req.params.id), commentId: result.rows[0].id }).catch(() => {});
        }
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add comment error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

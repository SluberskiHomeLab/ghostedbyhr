const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET / - Get all posts (optional ?user_id= filter)
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    const params = [];
    let whereClause = '';

    if (user_id) {
      const parsedUserId = parseInt(user_id, 10);
      if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
      }
      params.push(parsedUserId);
      whereClause = `WHERE p.user_id = $1`;
    }

    const result = await pool.query(
      `SELECT p.*,
              u.first_name, u.last_name, u.headline, u.avatar_url,
              COALESCE(l.like_count, 0)::int AS like_count,
              COALESCE(c.comment_count, 0)::int AS comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM likes GROUP BY post_id) l ON p.id = l.post_id
       LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id
       ${whereClause}
       ORDER BY p.created_at DESC`,
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
    const { content, media_url, media_type } = req.body;

    if (!content && !media_url) {
      return res.status(400).json({ error: 'Content or media is required' });
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, content, media_url, media_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, content || '', media_url || null, media_type || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create post error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - Get a single post
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
              u.first_name, u.last_name, u.headline, u.avatar_url,
              COALESCE(l.like_count, 0)::int AS like_count,
              COALESCE(c.comment_count, 0)::int AS comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM likes GROUP BY post_id) l ON p.id = l.post_id
       LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

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
      `SELECT c.*, u.first_name, u.last_name, u.avatar_url
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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add comment error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

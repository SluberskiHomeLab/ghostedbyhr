const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /:id - Get user profile
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, headline, bio, location, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - Update own profile
router.put('/:id', auth, async (req, res) => {
  try {
    if (parseInt(req.params.id, 10) !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const { first_name, last_name, headline, bio, location, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           headline = COALESCE($3, headline),
           bio = COALESCE($4, bio),
           location = COALESCE($5, location),
           avatar_url = COALESCE($6, avatar_url),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, first_name, last_name, headline, bio, location, avatar_url, created_at`,
      [first_name, last_name, headline, bio, location, avatar_url, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

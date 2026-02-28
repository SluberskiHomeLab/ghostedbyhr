const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// POST / - Send connection request
router.post('/', auth, async (req, res) => {
  try {
    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ error: 'receiver_id is required' });
    }

    if (receiver_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    const receiver = await pool.query('SELECT id FROM users WHERE id = $1', [receiver_id]);
    if (receiver.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = await pool.query(
      `SELECT id FROM connections
       WHERE (requester_id = $1 AND receiver_id = $2)
          OR (requester_id = $2 AND receiver_id = $1)`,
      [req.user.id, receiver_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Connection already exists' });
    }

    const result = await pool.query(
      `INSERT INTO connections (requester_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [req.user.id, receiver_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Send connection error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - Accept/reject connection
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be accepted or rejected' });
    }

    const connection = await pool.query(
      'SELECT * FROM connections WHERE id = $1',
      [req.params.id]
    );

    if (connection.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.rows[0].receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the receiver can update this connection' });
    }

    const result = await pool.query(
      `UPDATE connections SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update connection error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - Get all connections for current user
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              req.id AS requester_user_id, req.first_name AS requester_first_name,
              req.last_name AS requester_last_name, req.headline AS requester_headline,
              req.avatar_url AS requester_avatar_url,
              rec.id AS receiver_user_id, rec.first_name AS receiver_first_name,
              rec.last_name AS receiver_last_name, rec.headline AS receiver_headline,
              rec.avatar_url AS receiver_avatar_url
       FROM connections c
       JOIN users req ON c.requester_id = req.id
       JOIN users rec ON c.receiver_id = rec.id
       WHERE c.requester_id = $1 OR c.receiver_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get connections error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

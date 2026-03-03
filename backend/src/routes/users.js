const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer config — store to disk, one file per user per type
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder;
    const dir = path.join(__dirname, '../../uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.params.id}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /search?q= - Search users by name or username (must come before /:id)
router.get('/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json([]);
    const search = `%${q.trim()}%`;
    const result = await pool.query(
      `SELECT id, first_name, last_name, username, headline, avatar_url
       FROM users
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR username ILIKE $1
          OR (first_name || ' ' || last_name) ILIKE $1
       ORDER BY first_name, last_name
       LIMIT 10`,
      [search]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('User search error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - Get user profile
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, username, headline, bio, location, avatar_url, banner_url, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - Update own profile
router.put('/:id', auth, async (req, res) => {
  try {
    if (parseInt(req.params.id, 10) !== req.user.id)
      return res.status(403).json({ error: 'Not authorized to update this profile' });

    const { first_name, last_name, username, headline, bio, location, avatar_url, banner_url } = req.body;

    // Validate username if provided
    if (username !== undefined) {
      if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-30 characters: letters, numbers, dots, underscores only' });
      }
      const existing = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, req.params.id]
      );
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           username   = COALESCE($3, username),
           headline   = COALESCE($4, headline),
           bio        = COALESCE($5, bio),
           location   = COALESCE($6, location),
           avatar_url = COALESCE($7, avatar_url),
           banner_url = COALESCE($8, banner_url),
           updated_at = NOW()
       WHERE id = $9
       RETURNING id, email, first_name, last_name, username, headline, bio, location, avatar_url, banner_url, created_at`,
      [first_name, last_name, username || null, headline, bio, location, avatar_url, banner_url, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/avatar - Upload profile picture
router.post('/:id/avatar', auth, (req, res, next) => {
  if (parseInt(req.params.id, 10) !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  req.uploadFolder = 'avatars';
  next();
}, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const url = `/api/uploads/avatars/${req.file.filename}`;
    await pool.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [url, req.params.id]
    );
    res.json({ avatar_url: url });
  } catch (err) {
    console.error('Avatar upload error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/banner - Upload banner image
router.post('/:id/banner', auth, (req, res, next) => {
  if (parseInt(req.params.id, 10) !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  req.uploadFolder = 'banners';
  next();
}, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const url = `/api/uploads/banners/${req.file.filename}`;
    await pool.query(
      'UPDATE users SET banner_url = $1, updated_at = NOW() WHERE id = $2',
      [url, req.params.id]
    );
    res.json({ banner_url: url });
  } catch (err) {
    console.error('Banner upload error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

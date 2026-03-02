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

// GET /:id - Get user profile
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, headline, bio, location, avatar_url, banner_url, created_at
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

    const { first_name, last_name, headline, bio, location, avatar_url, banner_url } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           headline = COALESCE($3, headline),
           bio = COALESCE($4, bio),
           location = COALESCE($5, location),
           avatar_url = COALESCE($6, avatar_url),
           banner_url = COALESCE($7, banner_url),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, first_name, last_name, headline, bio, location, avatar_url, banner_url, created_at`,
      [first_name, last_name, headline, bio, location, avatar_url, banner_url, req.params.id]
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

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// In-memory fallback if MongoDB is not running
let inMemoryUsers = [];

const isDbConnected = () => {
  try {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
};

const getUser = () => {
  if (isDbConnected()) {
    return require('../models/User');
  }
  return null;
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be 6+ characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    const secret = process.env.JWT_SECRET || 'dreamhome_fallback_secret_key';

    try {
      const User = getUser();

      if (User) {
        let user = await User.findOne({ email });
        if (user) {
          return res.status(400).json({ msg: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({ name, email, password: hashedPassword });
        await user.save();

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, secret, { expiresIn: '7d' });
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
      } else {
        const existing = inMemoryUsers.find((u) => u.email === email);
        if (existing) {
          return res.status(400).json({ msg: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = { id: Date.now().toString(), name, email, password: hashedPassword };
        inMemoryUsers.push(user);

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, secret, { expiresIn: '7d' });
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const secret = process.env.JWT_SECRET || 'dreamhome_fallback_secret_key';

    try {
      const User = getUser();
      let user;

      if (User) {
        user = await User.findOne({ email });
      } else {
        user = inMemoryUsers.find((u) => u.email === email);
      }

      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      const payload = { user: { id: user.id || user._id } };
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id || user._id, name: user.name, email: user.email } });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// GET /api/auth/user
router.get('/user', auth, async (req, res) => {
  try {
    const User = getUser();
    if (User) {
      const user = await User.findById(req.user.id).select('-password');
      return res.json(user);
    } else {
      const user = inMemoryUsers.find((u) => u.id === req.user.id);
      if (user) {
        const { password, ...userData } = user;
        return res.json(userData);
      } else {
        return res.status(404).json({ msg: 'User not found' });
      }
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

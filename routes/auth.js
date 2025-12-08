const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../server');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Test database connection
    try {
      await pool.query('SELECT 1');
      console.log('Database connection OK');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    console.log('User lookup result:', result.rows.length > 0 ? 'User found' : 'User not found');

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('User found:', user.username, 'Role:', user.role);

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password check result:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    console.log('Login successful for:', user.username);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role
    }
  });
});

// Check authentication middleware (for frontend use)
router.get('/check', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, role: req.session.role });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;

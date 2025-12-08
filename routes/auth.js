const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../server');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);
    console.log('Password provided:', !!password);

    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Test database connection
    try {
      const testResult = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('Database OK, total users:', testResult.rows[0].count);
    } catch (dbError) {
      console.error('Database connection failed:', dbError.message);
      return res.status(500).json({ error: 'Database connection failed', details: dbError.message });
    }

    // Get user from database
    console.log('Looking up user:', username);
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    console.log('Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('User found:', { id: user.id, username: user.username, role: user.role });

    // Check password
    console.log('Checking password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Password correct, setting session...');

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    console.log('Session set:', { userId: req.session.userId, username: req.session.username });

    console.log('Login successful!');

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

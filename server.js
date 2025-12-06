// server.js
const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Create table if it doesn't exist yet
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id SERIAL PRIMARY KEY,
      requester TEXT NOT NULL,
      channel TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      request_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Database initialised (support_requests table ready)');
}

// API: get all requests (latest first)
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM support_requests ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: add a new request
app.post('/api/requests', async (req, res) => {
  try {
    const { requester, channel, description, status, request_date } = req.body;

    if (!requester) {
      return res.status(400).json({ error: 'Requester is required' });
    }

    const dateToUse = request_date || new Date().toISOString().slice(0, 10);
    const statusToUse = status || 'Open';
    const channelToUse = channel || 'Teams Chat';

    const result = await pool.query(
      `INSERT INTO support_requests
        (requester, channel, description, status, request_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        requester,
        channelToUse,
        description || '',
        statusToUse,
        dateToUse
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Root route: serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server after DB is ready
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialise DB:', err);
    process.exit(1);
  });
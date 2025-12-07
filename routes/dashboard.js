const express = require('express');
const { pool } = require('../server');
const { requireAuth } = require('../middleware/auth');
const aiService = require('../utils/ai-service');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Get dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    // Total requests
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM support_requests');
    const total = parseInt(totalResult.rows[0].total);

    // Today's requests
    const todayResult = await pool.query(`
      SELECT COUNT(*) as today_count
      FROM support_requests
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayCount = parseInt(todayResult.rows[0].today_count);

    // Open vs closed
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM support_requests
      GROUP BY status
    `);

    const statusCounts = {
      open: 0,
      closed: 0,
      in_progress: 0
    };

    statusResult.rows.forEach(row => {
      statusCounts[row.status] = parseInt(row.count);
    });

    // Recent requests (last 10)
    const recentResult = await pool.query(`
      SELECT sr.id, sr.requester_name, sr.description, sr.status, sr.created_at,
             c.name as category_name, u.username as created_by_username
      FROM support_requests sr
      LEFT JOIN categories c ON sr.category_id = c.id
      LEFT JOIN users u ON sr.created_by = u.id
      ORDER BY sr.created_at DESC
      LIMIT 10
    `);

    res.json({
      total,
      todayCount,
      statusCounts,
      recentRequests: recentResult.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get category breakdown
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.name, COUNT(sr.id) as count
      FROM categories c
      LEFT JOIN support_requests sr ON c.id = sr.category_id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily summary (AI-generated)
router.get('/daily-summary/:date?', async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];

    const summary = await aiService.generateDailySummary(date);

    res.json({ date, summary });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get requests by date range
router.get('/requests-by-date', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM support_requests
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND DATE(created_at) >= $' + (params.length + 1);
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(created_at) <= $' + (params.length + 1);
      params.push(endDate);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching requests by date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

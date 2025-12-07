const express = require('express');
const { pool } = require('../server');
const { requireAuth, requireAgent } = require('../middleware/auth');
const aiService = require('../utils/ai-service');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all support requests
router.get('/', async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT sr.*, c.name as category_name, u.username as created_by_username
      FROM support_requests sr
      LEFT JOIN categories c ON sr.category_id = c.id
      LEFT JOIN users u ON sr.created_by = u.id
    `;

    const params = [];
    const conditions = [];

    if (status) {
      conditions.push(`sr.status = $${params.length + 1}`);
      params.push(status);
    }

    if (category) {
      conditions.push(`sr.category_id = $${params.length + 1}`);
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sr.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single request
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT sr.*, c.name as category_name, u.username as created_by_username
      FROM support_requests sr
      LEFT JOIN categories c ON sr.category_id = c.id
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE sr.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new request (agents only)
router.post('/', requireAgent, async (req, res) => {
  try {
    const { requester_name, channel, description } = req.body;

    if (!requester_name || !channel || !description) {
      return res.status(400).json({ error: 'Requester name, channel, and description are required' });
    }

    // AI categorization
    let category_id = null;
    let severity = 'medium';
    let ai_recommendation = null;

    try {
      const aiResult = await aiService.categorizeRequest(description);
      if (aiResult.category) {
        const categoryResult = await pool.query('SELECT id FROM categories WHERE name = $1', [aiResult.category]);
        if (categoryResult.rows.length > 0) {
          category_id = categoryResult.rows[0].id;
        }
      }
      severity = aiResult.severity || 'medium';
      ai_recommendation = aiResult.recommendation;
    } catch (aiError) {
      console.warn('AI categorization failed:', aiError.message);
      // Continue without AI categorization
    }

    const result = await pool.query(`
      INSERT INTO support_requests (requester_name, channel, description, category_id, severity, ai_recommendation, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [requester_name, channel, description, category_id, severity, ai_recommendation, req.session.userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update request (agents only)
router.put('/:id', requireAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, solution, is_kb_article } = req.body;

    const updates = [];
    const params = [id];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${++paramCount}`);
      params.push(status);
    }

    if (solution !== undefined) {
      updates.push(`solution = $${++paramCount}`);
      params.push(solution);
    }

    if (is_kb_article !== undefined) {
      updates.push(`is_kb_article = $${++paramCount}`);
      params.push(is_kb_article);
    }

    if (status === 'closed') {
      updates.push(`closed_at = CURRENT_TIMESTAMP`);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const query = `
      UPDATE support_requests
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // If solution was added and marked as KB article, create KB entry
    if (solution && is_kb_article) {
      try {
        await pool.query(`
          INSERT INTO kb_articles (problem_summary, solution, category_id, created_by)
          VALUES ($1, $2, $3, $4)
        `, [result.rows[0].description, solution, result.rows[0].category_id, req.session.userId]);
      } catch (kbError) {
        console.warn('Failed to create KB article:', kbError);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate AI reply for request
router.post('/:id/generate-reply', requireAgent, async (req, res) => {
  try {
    const { id } = req.params;

    const requestResult = await pool.query(`
      SELECT sr.*, c.name as category_name
      FROM support_requests sr
      LEFT JOIN categories c ON sr.category_id = c.id
      WHERE sr.id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    const aiReply = await aiService.generateReply(request);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('Error generating AI reply:', error);
    res.status(500).json({ error: 'Failed to generate AI reply' });
  }
});

module.exports = router;

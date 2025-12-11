const express = require('express');
const { pool } = require('../server');
const { requireAuth, requireAgent } = require('../middleware/auth');
const aiService = require('../utils/ai-service');

const router = express.Router();

// Teams integration endpoint (no auth required)
router.post('/teams/create', async (req, res) => {
  try {
    console.log('🔄 Teams webhook called with payload:', JSON.stringify(req.body, null, 2));

    const {
      message,
      userName,
      userId,
      channelId,
      teamId,
      channelName,
      teamName
    } = req.body;

    console.log('👤 Looking for admin user...');
    // Get admin user for created_by (since this is automated)
    const adminResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    console.log('👤 Admin user result:', adminResult.rows);

    const createdBy = adminResult.rows[0]?.id || 1;
    console.log('👤 Using createdBy ID:', createdBy);

    // Create ticket from Teams message
    const ticketQuery = `
      INSERT INTO support_requests
      (requester_name, channel, description, status, severity, created_by, teams_user_id, teams_channel_id, teams_team_id, teams_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const ticketValues = [
      userName || 'Teams User',
      'teams_chat',  // Changed from 'teams' to allowed value
      message || 'Ticket created from Teams',
      'open',
      'medium',
      createdBy,
      userId,
      channelId,
      teamId,
      JSON.stringify({
        channelName,
        teamName,
        originalMessage: message
      })
    ];

    const ticketResult = await pool.query(ticketQuery, ticketValues);
    const ticketId = ticketResult.rows[0].id;

    console.log(`✅ Ticket #${ticketId} created from Teams by ${userName}`);

    res.json({
      success: true,
      ticketId,
      message: `Ticket #${ticketId} created successfully from Teams`,
      ticketUrl: `${process.env.APP_URL || 'http://localhost:3000'}#requests`
    });

  } catch (error) {
    console.error('❌ Error creating ticket from Teams:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create ticket from Teams',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Apply auth middleware to all other routes
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
    const { requester_name, channel, category_id, severity, description } = req.body;

    if (!requester_name || !channel || !category_id || !severity || !description) {
      return res.status(400).json({ error: 'All fields are required: requester name, channel, category, severity, and description' });
    }

    // Validate category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [category_id]);
    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid category selected' });
    }

    // Optional AI recommendation (not automatic categorization)
    let ai_recommendation = null;
    try {
      const aiResult = await aiService.categorizeRequest(description);
      ai_recommendation = aiResult.recommendation; // Only get recommendation, not category/severity
    } catch (aiError) {
      console.warn('AI recommendation failed:', aiError.message);
      // Continue without AI recommendation
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
    const { status, solution, is_kb_article, requester_name, channel, description, severity, category_id } = req.body;

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

    if (category_id) {
      updates.push(`category_id = $${++paramCount}`);
      params.push(category_id);
    }

    if (requester_name) {
      updates.push(`requester_name = $${++paramCount}`);
      params.push(requester_name);
    }

    if (channel) {
      updates.push(`channel = $${++paramCount}`);
      params.push(channel);
    }

    if (description) {
      updates.push(`description = $${++paramCount}`);
      params.push(description);
    }

    if (severity) {
      updates.push(`severity = $${++paramCount}`);
      params.push(severity);
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

// Recategorize request with AI
router.post('/:id/recategorize', requireAgent, async (req, res) => {
  console.log('=== AI RECATEGORIZE REQUEST ===');
  console.log('Request ID:', req.params.id);

  try {
    const { id } = req.params;

    // Get current request
    const requestResult = await pool.query('SELECT * FROM support_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];
    console.log('Recategorizing request:', request.description.substring(0, 100) + '...');

    // Run AI categorization
    const categorization = await aiService.categorizeRequest(request.description);
    console.log('AI categorization result:', categorization);

    // Update request with new categorization
    const updates = [];
    const params = [id];
    let paramCount = 1;

    if (categorization.category) {
      // Find category ID
      const categoryResult = await pool.query('SELECT id FROM categories WHERE name = $1', [categorization.category]);
      if (categoryResult.rows.length > 0) {
        updates.push(`category_id = $${++paramCount}`);
        params.push(categoryResult.rows[0].id);
      }
    }

    if (categorization.severity) {
      updates.push(`severity = $${++paramCount}`);
      params.push(categorization.severity);
    }

    if (categorization.recommendation) {
      updates.push(`ai_recommendation = $${++paramCount}`);
      params.push(categorization.recommendation);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 0) {
      const query = `UPDATE support_requests SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
      const result = await pool.query(query, params);
      console.log('Request updated with new categorization');
    }

    res.json({
      success: true,
      categorization: categorization
    });

  } catch (error) {
    console.error('=== AI RECATEGORIZE ERROR ===');
    console.error('Error:', error.message);

    res.status(500).json({
      error: 'Failed to recategorize request',
      details: error.message
    });
  }
});

// Delete request (agents and admins only)
router.delete('/:id', requireAgent, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if request exists
    const requestCheck = await pool.query('SELECT id, requester_name FROM support_requests WHERE id = $1', [id]);
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestCheck.rows[0];

    // Delete the request
    await pool.query('DELETE FROM support_requests WHERE id = $1', [id]);

    console.log(`Request ${id} deleted by user ${req.session.userId}`);

    res.json({
      message: 'Request deleted successfully',
      deleted_request: {
        id: request.id,
        requester_name: request.requester_name
      }
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
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

    console.log('Calling AI service...');
    const aiReply = await aiService.generateReply(request);
    console.log('AI reply generated successfully');

    // Save the AI reply to the database
    console.log('Saving AI reply to database...');
    await pool.query(
      'UPDATE support_requests SET ai_reply = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [aiReply, id]
    );
    console.log('AI reply saved to database');

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('Error generating AI reply:', error.message);

    // Provide specific error messages for different failure types
    let errorMessage = 'Failed to generate AI reply';
    let errorDetails = '';

    if (error.message.includes('API key not configured')) {
      errorMessage = 'AI features not configured';
      errorDetails = 'Please configure your Grok API key in the Admin panel → AI Settings';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'AI service unavailable';
      errorDetails = 'Unable to connect to AI service. Please check your API key and try again.';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'AI service rate limited';
      errorDetails = 'Too many requests. Please try again in a moment.';
    }

    res.status(500).json({
      error: errorMessage,
      details: errorDetails,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

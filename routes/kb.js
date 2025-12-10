const express = require('express');
const { pool } = require('../server');
const { requireAuth, requireAgent } = require('../middleware/auth');
const aiService = require('../utils/ai-service');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all KB articles
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT kb.*, c.name as category_name, u.username as created_by_username
      FROM kb_articles kb
      LEFT JOIN categories c ON kb.category_id = c.id
      LEFT JOIN users u ON kb.created_by = u.id
    `;

    const params = [];
    const conditions = [];

    if (category) {
      conditions.push(`kb.category_id = $${params.length + 1}`);
      params.push(category);
    }

    if (search) {
      conditions.push(`(kb.problem_summary ILIKE $${params.length + 1} OR kb.solution ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY kb.confidence DESC, kb.updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KB articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single KB article
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT kb.*, c.name as category_name, u.username as created_by_username
      FROM kb_articles kb
      LEFT JOIN categories c ON kb.category_id = c.id
      LEFT JOIN users u ON kb.created_by = u.id
      WHERE kb.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KB article not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching KB article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create KB article (agents only)
router.post('/', requireAgent, async (req, res) => {
  try {
    const { problem_summary, solution, category_id, tags } = req.body;

    if (!problem_summary || !solution) {
      return res.status(400).json({ error: 'Problem summary and solution are required' });
    }

    // AI improvement
    let improved = { improved_problem: problem_summary, improved_solution: solution, confidence: 3 };

    try {
      improved = await aiService.improveKBArticle(problem_summary, solution);
    } catch (aiError) {
      console.warn('AI KB improvement failed:', aiError.message);
    }

    // Process tags - convert to array and clean
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    const result = await pool.query(`
      INSERT INTO kb_articles (problem_summary, solution, category_id, tags, confidence, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [improved.improved_problem, improved.improved_solution, category_id, processedTags, improved.confidence, req.session.userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating KB article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update KB article (agents only)
router.put('/:id', requireAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { problem_summary, solution, category_id, confidence, tags } = req.body;

    const updates = [];
    const params = [id];
    let paramCount = 1;

    if (problem_summary !== undefined) {
      updates.push(`problem_summary = $${++paramCount}`);
      params.push(problem_summary);
    }

    if (solution !== undefined) {
      updates.push(`solution = $${++paramCount}`);
      params.push(solution);
    }

    if (category_id !== undefined) {
      updates.push(`category_id = $${++paramCount}`);
      params.push(category_id);
    }

    if (tags !== undefined) {
      // Process tags - convert to array and clean
      let processedTags = [];
      if (Array.isArray(tags)) {
        processedTags = tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      updates.push(`tags = $${++paramCount}`);
      params.push(processedTags);
    }

    if (confidence !== undefined) {
      updates.push(`confidence = $${++paramCount}`);
      params.push(confidence);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const query = `
      UPDATE kb_articles
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KB article not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating KB article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete KB article (agents only)
router.delete('/:id', requireAgent, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM kb_articles WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KB article not found' });
    }

    res.json({ message: 'KB article deleted successfully' });
  } catch (error) {
    console.error('Error deleting KB article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search KB articles
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;

    const result = await pool.query(`
      SELECT kb.*, c.name as category_name,
             ts_rank_cd(to_tsvector('english', kb.problem_summary || ' ' || kb.solution),
                       plainto_tsquery('english', $1)) as rank
      FROM kb_articles kb
      LEFT JOIN categories c ON kb.category_id = c.id
      WHERE to_tsvector('english', kb.problem_summary || ' ' || kb.solution) @@ plainto_tsquery('english', $1)
         OR EXISTS (SELECT 1 FROM unnest(kb.tags) AS tag WHERE tag ILIKE '%' || $1 || '%')
      ORDER BY rank DESC, kb.confidence DESC
      LIMIT 20
    `, [query]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching KB:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

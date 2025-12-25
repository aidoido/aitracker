const express = require('express');
const { pool } = require('../server');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get AI settings
router.get('/ai-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_settings LIMIT 1');

    if (result.rows.length === 0) {
      // Create default settings if none exist
      await pool.query('INSERT INTO ai_settings DEFAULT VALUES');
      const newResult = await pool.query('SELECT * FROM ai_settings LIMIT 1');
      return res.json(newResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update AI settings
router.put('/ai-settings', async (req, res) => {
  try {
    const {
      provider,
      api_key,
      model_name,
      temperature,
      max_tokens,
      categorization_enabled,
      replies_enabled,
      summaries_enabled,
      kb_enabled
    } = req.body;

    // Basic validation
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
    }

    if (max_tokens !== undefined && max_tokens < 1) {
      return res.status(400).json({ error: 'Max tokens must be positive' });
    }

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (provider !== undefined) {
      updates.push(`provider = $${++paramCount}`);
      params.push(provider);
    }

    if (api_key !== undefined) {
      // In production, encrypt this
      updates.push(`api_key_encrypted = $${++paramCount}`);
      params.push(api_key);
    }

    if (model_name !== undefined) {
      updates.push(`model_name = $${++paramCount}`);
      params.push(model_name);
    }

    if (temperature !== undefined) {
      updates.push(`temperature = $${++paramCount}`);
      params.push(temperature);
    }

    if (max_tokens !== undefined) {
      updates.push(`max_tokens = $${++paramCount}`);
      params.push(max_tokens);
    }

    if (categorization_enabled !== undefined) {
      updates.push(`categorization_enabled = $${++paramCount}`);
      params.push(categorization_enabled);
    }

    if (replies_enabled !== undefined) {
      updates.push(`replies_enabled = $${++paramCount}`);
      params.push(replies_enabled);
    }

    if (summaries_enabled !== undefined) {
      updates.push(`summaries_enabled = $${++paramCount}`);
      params.push(summaries_enabled);
    }

    if (kb_enabled !== undefined) {
      updates.push(`kb_enabled = $${++paramCount}`);
      params.push(kb_enabled);
    }

    updates.push(`updated_by = $${++paramCount}`);
    params.push(req.session.userId);

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `UPDATE ai_settings SET ${updates.join(', ')} WHERE id = (SELECT id FROM ai_settings LIMIT 1)`;

    await pool.query(query, params);

    // Return updated settings (without API key)
    const result = await pool.query(`
      SELECT id, provider, model_name, temperature, max_tokens,
             categorization_enabled, replies_enabled, summaries_enabled, kb_enabled,
             updated_by, updated_at
      FROM ai_settings LIMIT 1
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug AI settings (admin only) - doesn't expose API key
router.get('/ai-debug', async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, model_name, temperature, max_tokens, categorization_enabled, replies_enabled, summaries_enabled, kb_enabled, updated_at FROM ai_settings LIMIT 1');

    if (result.rows.length === 0) {
      return res.json({ error: 'No AI settings found. Please configure AI settings first.' });
    }

    const settings = result.rows[0];
    const hasApiKey = !!(await pool.query('SELECT api_key_encrypted FROM ai_settings LIMIT 1')).rows[0]?.api_key_encrypted;

    res.json({
      configured: true,
      hasApiKey: hasApiKey,
      provider: settings.provider,
      model_name: settings.model_name,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      features: {
        categorization_enabled: settings.categorization_enabled,
        replies_enabled: settings.replies_enabled,
        summaries_enabled: settings.summaries_enabled,
        kb_enabled: settings.kb_enabled
      },
      last_updated: settings.updated_at
    });
  } catch (error) {
    console.error('Error getting AI debug info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['admin', 'agent', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, role, created_at
    `, [username, email, hashedPassword, role]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update user (admin only)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, password } = req.body;

    const updates = [];
    const params = [id];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${++paramCount}`);
      params.push(email);
    }

    if (role !== undefined) {
      if (!['admin', 'agent', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push(`role = $${++paramCount}`);
      params.push(role);
    }

    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${++paramCount}`);
      params.push(hashedPassword);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING id, username, email, role, updated_at`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete user (admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all categories (admin only)
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category (admin only)
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Category name already exists' });
    } else {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update category (admin only)
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Category name already exists' });
    } else {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete category (admin only)
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is being used by requests
    const usageCheck = await pool.query('SELECT COUNT(*) as count FROM support_requests WHERE category_id = $1', [id]);
    if (usageCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category that is being used by existing requests' });
    }

    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

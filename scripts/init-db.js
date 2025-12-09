const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'agent', 'viewer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User sessions table (for connect-pg-simple)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR PRIMARY KEY COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions(expire);
    `);

    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Support requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_requests (
        id SERIAL PRIMARY KEY,
        requester_name VARCHAR(100) NOT NULL,
        channel VARCHAR(50) NOT NULL CHECK (channel IN ('teams_chat', 'teams_call', 'email', 'other')),
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'in_progress')),
        category_id INTEGER REFERENCES categories(id),
        severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
        ai_recommendation TEXT,
        ai_reply TEXT,
        solution TEXT,
        is_kb_article BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
      );
    `);

    // Knowledge base articles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kb_articles (
        id SERIAL PRIMARY KEY,
        problem_summary TEXT NOT NULL,
        solution TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        confidence INTEGER DEFAULT 1 CHECK (confidence >= 1 AND confidence <= 5),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // AI settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_settings (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) DEFAULT 'grok',
        api_key_encrypted TEXT,
        model_name VARCHAR(100) DEFAULT 'grok-beta',
        temperature DECIMAL(3,2) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 1000,
        categorization_enabled BOOLEAN DEFAULT TRUE,
        replies_enabled BOOLEAN DEFAULT TRUE,
        summaries_enabled BOOLEAN DEFAULT TRUE,
        kb_enabled BOOLEAN DEFAULT TRUE,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default categories
    await pool.query(`
      INSERT INTO categories (name, description) VALUES
      ('Oracle Fusion - Access Issue', 'Login and access problems with Oracle Fusion'),
      ('Oracle Fusion - PR/PO', 'Purchase Request and Purchase Order issues'),
      ('Finance / Invoice', 'Financial and invoicing related issues'),
      ('Network / VPN', 'Network connectivity and VPN problems'),
      ('Teams / Communication', 'Microsoft Teams and communication issues'),
      ('Training Needed', 'Users requiring training or guidance'),
      ('General IT', 'General IT support requests')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Insert default admin user (password: admin123 - change in production!)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await pool.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@company.com', $1, 'admin')
      ON CONFLICT (username) DO NOTHING;
    `, [hashedPassword]);

    // Insert default AI settings
    await pool.query(`
      INSERT INTO ai_settings DEFAULT VALUES
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
};

createTables();

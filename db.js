// db.js
const { Pool } = require('pg');

// Uses DATABASE_URL env variable (works locally and on Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
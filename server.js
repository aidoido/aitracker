const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000; // Railway uses 8080

// Database connection - Initialize FIRST
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  query_timeout: 10000,
  statement_timeout: 10000,
  idle_in_transaction_session_timeout: 10000
});

// Export pool immediately after creation
module.exports = { pool };

// Test database connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://*.jsdelivr.net"], // Allow CDN connections for source maps
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Session configuration
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Disable secure for Railway (uses HTTPS proxy)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Allow cross-site requests
  },
  name: 'aitracker.sid' // Custom session name
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes - Load AFTER pool is initialized
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/kb', require('./routes/kb'));
app.use('/api/admin', require('./routes/admin'));

// Frontend routes
app.get('/', (req, res) => {
  console.log('Dashboard access - Session check:', {
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.role,
    sessionID: req.session.id
  });

  if (!req.session.userId) {
    console.log('No session found, redirecting to login');
    return res.redirect('/login');
  }

  console.log('Session found, serving dashboard');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  console.log('Login page access - Session check:', {
    userId: req.session.userId,
    username: req.session.username,
    sessionID: req.session.id
  });

  // If already logged in, redirect to dashboard
  if (req.session.userId) {
    console.log('Already logged in, redirecting to dashboard');
    return res.redirect('/');
  }

  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  console.log('Admin access - Session check:', {
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.role,
    sessionID: req.session.id
  });

  if (!req.session.userId || req.session.role !== 'admin') {
    console.log('Admin access denied, redirecting to login');
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error handling - Prevent headers already sent errors
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Only send response if headers haven't been sent
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Something went wrong!',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
    const userCount = result.rows[0].user_count;

    res.json({
      status: 'Database connected successfully',
      user_count: userCount,
      database_url: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'Database connection failed',
      error: error.message,
      database_url: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
  }
});

// Test session endpoint
app.get('/api/test-session', (req, res) => {
  req.session.test = 'working';
  res.json({
    status: 'Session working',
    session_id: req.session.id,
    test_value: req.session.test
  });
});

// Test API endpoint
app.get('/api/test-api', (req, res) => {
  res.json({
    status: 'API routes working',
    timestamp: new Date().toISOString(),
    routes: ['/api/auth', '/api/requests', '/api/dashboard', '/api/kb', '/api/admin']
  });
});

// Test AI configuration
app.get('/api/test-ai', async (req, res) => {
  try {
    const aiService = require('./utils/ai-service');
    const settings = await aiService.getSettings();

    // Test basic AI categorization without making API call
    const hasApiKey = !!settings.api_key_encrypted;
    const categorizationEnabled = settings.categorization_enabled;
    const repliesEnabled = settings.replies_enabled;
    const summariesEnabled = settings.summaries_enabled;

    res.json({
      status: 'AI configuration check',
      api_key_configured: hasApiKey,
      categorization_enabled: categorizationEnabled,
      replies_enabled: repliesEnabled,
      summaries_enabled: summariesEnabled,
      model_name: settings.model_name || 'grok-beta',
      temperature: settings.temperature || 0.7
    });
  } catch (error) {
    res.status(500).json({
      status: 'AI configuration error',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  pool.end(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

module.exports = { pool };

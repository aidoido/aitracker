#!/usr/bin/env node

/**
 * Voice Ticket Migration Script
 * Adds voice processing capabilities to Ticktz
 *
 * Run with: node run-voice-migration.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🎤 Starting Voice Ticket Migration for Ticktz...\n');

  // Import database connection directly
  let pool;
  try {
    const { Pool } = require('pg');
    require('dotenv').config();

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Could not connect to database.');
    console.error('Error:', error.message);
    console.error('Make sure DATABASE_URL is set in your environment.');
    process.exit(1);
  }

  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, 'fix-voice-tickets.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Read migration file successfully');

    // Split SQL into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        try {
          await pool.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Ignore "already exists" errors for safety
          if (error.code === '42701' || error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} skipped (column already exists)`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n🎉 Voice Ticket Migration Completed Successfully!');
    console.log('\n📋 New Features Added:');
    console.log('  ✅ voice_transcript - Stores speech-to-text content');
    console.log('  ✅ ai_confidence - AI processing confidence level');
    console.log('  ✅ sentiment - User sentiment analysis');
    console.log('  ✅ urgency_keywords - Extracted urgent terms');
    console.log('  ✅ voice_tags - AI-generated tags');
    console.log('  ✅ key_phrases - Important extracted phrases');
    console.log('  ✅ audio_file_path - Optional audio storage');
    console.log('  ✅ voice_processing_metadata - Additional AI data');

    console.log('\n🔧 Next Steps:');
    console.log('  1. Set VOICE_TICKETS_ENABLED=true in your environment');
    console.log('  2. Restart your Ticktz server');
    console.log('  3. Voice ticket button will appear in requests section');
    console.log('  4. Test voice recording and AI processing');

    console.log('\n🛡️  Rollback:');
    console.log('  - Set VOICE_TICKETS_ENABLED=false to disable');
    console.log('  - Run cleanup_voice_data() function to remove voice data');
    console.log('  - Voice columns remain for future re-enablement');

  } catch (error) {
    console.error('\n❌ Migration Failed!');
    console.error('Error:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('  - Check database connection');
    console.error('  - Verify DATABASE_URL environment variable');
    console.error('  - Ensure PostgreSQL is running');
    process.exit(1);
  } finally {
    // Close database connection
    if (pool) {
      await pool.end();
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Voice Ticket Migration Script for Ticktz');
  console.log('');
  console.log('Usage: node run-voice-migration.js');
  console.log('');
  console.log('This script adds voice ticket processing capabilities to your Ticktz database.');
  console.log('It adds new columns to the support_requests table for voice data storage.');
  console.log('');
  console.log('Requirements:');
  console.log('  - PostgreSQL database connection');
  console.log('  - DATABASE_URL environment variable set');
  console.log('  - Node.js access to database');
  console.log('');
  console.log('Safety:');
  console.log('  - Uses IF NOT EXISTS to prevent conflicts');
  console.log('  - Can be run multiple times safely');
  console.log('  - Voice features can be disabled with VOICE_TICKETS_ENABLED=false');
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🧪 Dry Run Mode - Would execute migration but not actually run it');
  console.log('Remove --dry-run to execute the actual migration');
  process.exit(0);
}

// Run the migration
runMigration().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

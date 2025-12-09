-- Fix user_sessions table for Railway deployment
-- Run this in Railway PostgreSQL Query tab

-- Step 1: Drop existing table if it exists
DROP TABLE IF EXISTS user_sessions;

-- Step 2: Create table with correct schema
CREATE TABLE user_sessions (
    sid VARCHAR PRIMARY KEY COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Step 3: Create required index
CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions(expire);

-- Step 4: Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

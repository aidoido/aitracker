-- FORCE FIX: Complete user_sessions table recreation
-- Run this in Railway PostgreSQL Query tab - ONE COMMAND AT A TIME

-- Command 1: Check current table structure
SELECT tablename, schemaname FROM pg_tables WHERE tablename = 'user_sessions';

-- Command 2: Drop table completely (this will log out all current sessions)
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Command 3: Create table with EXPLICIT primary key
CREATE TABLE user_sessions (
    sid VARCHAR(255) PRIMARY KEY NOT NULL,
    sess JSONB NOT NULL,
    expire TIMESTAMP WITH TIME ZONE NOT NULL
) WITH (OIDS=FALSE);

-- Command 4: Create index on expire column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);

-- Command 5: Verify table was created correctly
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_sessions';

-- Command 6: Check column details
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

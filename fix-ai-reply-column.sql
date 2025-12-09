-- Add ai_reply column to existing support_requests table
-- Run this in Railway PostgreSQL Query tab

ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS ai_reply TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'support_requests' AND column_name = 'ai_reply';

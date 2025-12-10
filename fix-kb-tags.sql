-- Add tags column to kb_articles table for better searchability
ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add index on tags for better search performance
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON kb_articles USING GIN (tags);

-- Update existing articles with default empty tags array
UPDATE kb_articles SET tags = '{}' WHERE tags IS NULL;

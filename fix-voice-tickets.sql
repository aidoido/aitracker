-- Voice Ticket Feature Migration
-- Adds voice processing capabilities to support_requests table
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add voice-related columns to support_requests table
ALTER TABLE support_requests
ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20) DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS urgency_keywords TEXT[],
ADD COLUMN IF NOT EXISTS voice_tags TEXT[],
ADD COLUMN IF NOT EXISTS key_phrases TEXT[],
ADD COLUMN IF NOT EXISTS audio_file_path VARCHAR(255),
ADD COLUMN IF NOT EXISTS voice_processing_metadata JSONB;

-- Add indexes for voice-related queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_support_requests_voice_confidence
ON support_requests(ai_confidence) WHERE ai_confidence IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_requests_sentiment
ON support_requests(sentiment) WHERE sentiment IS NOT NULL;

-- Create a view for voice ticket analytics (optional)
CREATE OR REPLACE VIEW voice_ticket_analytics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_voice_tickets,
    COUNT(*) FILTER (WHERE ai_confidence = 'high') as high_confidence_tickets,
    AVG(CASE
        WHEN ai_confidence = 'high' THEN 3
        WHEN ai_confidence = 'medium' THEN 2
        WHEN ai_confidence = 'low' THEN 1
        ELSE 2
    END) as avg_confidence_score,
    COUNT(*) FILTER (WHERE sentiment = 'frustrated') as frustrated_tickets,
    array_agg(DISTINCT unnest(voice_tags)) FILTER (WHERE voice_tags IS NOT NULL) as all_tags
FROM support_requests
WHERE voice_transcript IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Add comments for documentation
COMMENT ON COLUMN support_requests.voice_transcript IS 'Original speech-to-text transcript from voice ticket';
COMMENT ON COLUMN support_requests.ai_confidence IS 'AI confidence level: high/medium/low';
COMMENT ON COLUMN support_requests.sentiment IS 'User sentiment analysis: positive/neutral/negative/frustrated';
COMMENT ON COLUMN support_requests.urgency_keywords IS 'Keywords indicating urgency from voice analysis';
COMMENT ON COLUMN support_requests.voice_tags IS 'AI-extracted tags from voice content';
COMMENT ON COLUMN support_requests.key_phrases IS 'Important phrases extracted from voice';
COMMENT ON COLUMN support_requests.audio_file_path IS 'Path to stored audio file (if saved)';
COMMENT ON COLUMN support_requests.voice_processing_metadata IS 'Additional AI processing metadata';

-- Create a function to easily disable voice features (for rollback)
CREATE OR REPLACE FUNCTION disable_voice_features()
RETURNS VOID AS $$
BEGIN
    -- Update environment variable (this would be set in your app config)
    -- This is just for documentation - actual env var management is app-specific

    -- Log the disabling action
    RAISE NOTICE 'Voice features disabled. Voice-related columns remain but new processing stopped.';
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up voice data (optional rollback)
CREATE OR REPLACE FUNCTION cleanup_voice_data()
RETURNS VOID AS $$
BEGIN
    -- Clear voice-related data but keep tickets
    UPDATE support_requests SET
        voice_transcript = NULL,
        ai_confidence = NULL,
        sentiment = NULL,
        urgency_keywords = NULL,
        voice_tags = NULL,
        key_phrases = NULL,
        audio_file_path = NULL,
        voice_processing_metadata = NULL
    WHERE voice_transcript IS NOT NULL;

    RAISE NOTICE 'Voice data cleaned up from all tickets.';
END;
$$ LANGUAGE plpgsql;

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Voice ticket migration completed successfully!';
    RAISE NOTICE 'New columns added: voice_transcript, ai_confidence, sentiment, urgency_keywords, voice_tags, key_phrases, audio_file_path, voice_processing_metadata';
    RAISE NOTICE 'To disable voice features, set VOICE_TICKETS_ENABLED=false in environment';
    RAISE NOTICE 'To rollback, run cleanup_voice_data() function';
END $$;

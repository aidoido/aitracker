-- Add Teams integration fields to support_requests table
ALTER TABLE support_requests 
ADD COLUMN IF NOT EXISTS teams_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS teams_channel_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS teams_team_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS teams_message JSONB;

-- Add indexes for Teams fields
CREATE INDEX IF NOT EXISTS idx_support_requests_teams_user_id ON support_requests(teams_user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_teams_channel_id ON support_requests(teams_channel_id);

-- Add comment to explain Teams fields
COMMENT ON COLUMN support_requests.teams_user_id IS 'Microsoft Teams user ID of the requester';
COMMENT ON COLUMN support_requests.teams_channel_id IS 'Microsoft Teams channel ID where ticket was created';
COMMENT ON COLUMN support_requests.teams_team_id IS 'Microsoft Teams team ID';
COMMENT ON COLUMN support_requests.teams_message IS 'Additional Teams message metadata (channel name, team name, etc.)';

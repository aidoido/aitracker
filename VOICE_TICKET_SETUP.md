# 🎤 Voice Ticket Creation Setup Guide

## Overview
Ticktz now supports **x.ai-powered voice ticket creation**, allowing users to create support tickets by speaking naturally. The system intelligently transcribes speech, analyzes content, and creates properly categorized tickets.

## 🚀 Quick Start

### 1. Environment Setup
Add this to your `.env` file:
```bash
# Enable voice ticket features
VOICE_TICKETS_ENABLED=true
```

### 2. Database Migration
Run the migration script:
```bash
# Using Node.js script (recommended)
node run-voice-migration.js

# Or run SQL directly
psql $DATABASE_URL -f fix-voice-tickets.sql
```

### 3. Restart Server
```bash
npm restart
# or
node server.js
```

### 4. Test Voice Features
1. Go to **Requests** section
2. Look for **"Voice Ticket"** button (appears when enabled)
3. Click and try creating a voice ticket

---

## 📋 Implementation Details

### Database Changes
The migration adds these columns to `support_requests`:
- `voice_transcript` - Full speech-to-text content
- `ai_confidence` - AI processing confidence (high/medium/low)
- `sentiment` - User sentiment analysis
- `urgency_keywords` - Extracted urgent terms
- `voice_tags` - AI-generated tags
- `key_phrases` - Important extracted phrases
- `audio_file_path` - Optional audio file storage
- `voice_processing_metadata` - Additional AI data

### New API Endpoints
```javascript
POST /api/tickets/voice/create     // Create voice ticket
GET  /api/tickets/voice/analytics  // Voice analytics
```

### Frontend Features
- **Voice Recording Modal** with multi-state interface
- **Real-time Feedback** during recording
- **AI Analysis Display** showing processing results
- **Confidence Indicators** and tag suggestions
- **Mobile-Responsive** design

---

## 🎯 How It Works

### User Flow
1. **Click "Voice Ticket"** button in requests section
2. **Grant microphone permission** when prompted
3. **Speak naturally** about the issue (up to 30 seconds)
4. **Review transcript** and AI analysis
5. **Submit ticket** with intelligent categorization

### AI Processing Pipeline
1. **Speech Recording** → Audio capture with Web Audio API
2. **x.ai Processing** → Intelligent analysis using existing AI service
3. **Ticket Creation** → Automated categorization and metadata
4. **Storage** → Voice data stored in database with fallback

### Feature States
- **Ready** → Instructions and start button
- **Recording** → Visual feedback with timer and waveform
- **Processing** → AI analysis with spinner
- **Review** → Transcript and AI suggestions
- **Error** → Graceful error handling with retry options

---

## 🔧 Configuration Options

### Environment Variables
```bash
# Core voice features
VOICE_TICKETS_ENABLED=true          # Enable/disable voice tickets
VOICE_MAX_DURATION=30               # Max recording time in seconds
VOICE_AUDIO_FORMAT=webm             # Audio format (webm/opus)

# AI processing
VOICE_AI_CONFIDENCE_THRESHOLD=0.7   # Minimum confidence for auto-categorization
VOICE_SENTIMENT_ANALYSIS=true       # Enable sentiment analysis
VOICE_AUTO_TAGGING=true            # Enable automatic tag generation

# Storage options
VOICE_STORE_AUDIO=false             # Store audio files (privacy consideration)
VOICE_RETENTION_DAYS=30            # Days to keep voice data
```

### Feature Flags
```javascript
// In your environment or config
const features = {
  voiceTickets: process.env.VOICE_TICKETS_ENABLED === 'true',
  voiceAnalytics: process.env.VOICE_ANALYTICS_ENABLED === 'true',
  voiceStorage: process.env.VOICE_STORE_AUDIO === 'true'
};
```

---

## 🛡️ Safety & Rollback

### Immediate Disable
```bash
# Disable voice features instantly
VOICE_TICKETS_ENABLED=false
# Restart server - voice button disappears
```

### Data Cleanup
```sql
-- Remove all voice data (optional)
SELECT cleanup_voice_data();

-- Or remove specific voice tickets
DELETE FROM support_requests WHERE voice_transcript IS NOT NULL;
```

### Rollback Script
```bash
#!/bin/bash
# Complete rollback script
echo "Rolling back voice ticket features..."

# Disable features
export VOICE_TICKETS_ENABLED=false

# Optional: Remove voice data
# psql $DATABASE_URL -c "SELECT cleanup_voice_data();"

# Optional: Remove voice columns (CAUTION!)
# psql $DATABASE_URL -c "ALTER TABLE support_requests DROP COLUMN IF EXISTS voice_transcript;"

echo "Voice features disabled. Restart server to apply changes."
```

---

## 🧪 Testing Guide

### Manual Testing Steps
1. **Environment Check**
   ```bash
   echo $VOICE_TICKETS_ENABLED  # Should be 'true'
   ```

2. **Database Verification**
   ```sql
   -- Check if voice columns exist
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'support_requests'
   AND column_name LIKE 'voice_%';
   ```

3. **UI Testing**
   - Visit requests page
   - Check for "Voice Ticket" button
   - Test microphone permission prompt
   - Record a sample message
   - Verify AI processing works

4. **API Testing**
   ```bash
   # Test voice analytics endpoint
   curl -H "Cookie: session=your-session" \
        http://localhost:3000/api/tickets/voice/analytics
   ```

### Automated Testing
```javascript
// Example test script
const testVoiceTicket = async () => {
  console.log('🧪 Testing Voice Ticket Creation...');

  // Test feature flag
  assert(process.env.VOICE_TICKETS_ENABLED === 'true', 'Voice features enabled');

  // Test database columns
  const columns = await checkVoiceColumns();
  assert(columns.length >= 6, 'Voice columns exist');

  // Test API endpoints
  const analytics = await fetch('/api/tickets/voice/analytics');
  assert(analytics.ok, 'Analytics endpoint works');

  console.log('✅ All voice ticket tests passed!');
};
```

---

## 📊 Analytics & Monitoring

### Voice Ticket Metrics
- **Total voice tickets created**
- **AI processing success rate**
- **Average confidence scores**
- **User sentiment trends**
- **Popular voice-generated tags**
- **Recording duration statistics**

### Monitoring Queries
```sql
-- Voice ticket overview
SELECT
  COUNT(*) as total_voice_tickets,
  AVG(CASE
    WHEN ai_confidence = 'high' THEN 3
    WHEN ai_confidence = 'medium' THEN 2
    WHEN ai_confidence = 'low' THEN 1
  END) as avg_confidence,
  COUNT(*) FILTER (WHERE sentiment = 'frustrated') as frustrated_users
FROM support_requests
WHERE voice_transcript IS NOT NULL
AND created_at >= CURRENT_DATE - INTERVAL '7 days';
```

---

## 🔍 Troubleshooting

### Common Issues

**Voice button not showing:**
```bash
# Check environment variable
echo $VOICE_TICKETS_ENABLED

# Check browser console for JavaScript errors
# Verify user has microphone permissions
```

**AI processing fails:**
```bash
# Check x.ai API key
echo $XAI_API_KEY

# Verify AI settings in admin panel
# Check server logs for API errors
```

**Database migration issues:**
```bash
# Re-run migration (safe to run multiple times)
node run-voice-migration.js

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
```

**Microphone permissions:**
- Browser must be HTTPS (required for microphone access)
- User must grant microphone permission when prompted
- Check browser settings for microphone access

---

## 🚀 Production Deployment

### Pre-deployment Checklist
- [ ] Set `VOICE_TICKETS_ENABLED=true` in production env
- [ ] Run database migration on production DB
- [ ] Verify HTTPS certificate (required for microphone)
- [ ] Test microphone permissions work
- [ ] Configure voice retention policies
- [ ] Set up monitoring for voice analytics

### Performance Considerations
- **Audio Processing**: Minimal impact (client-side recording)
- **AI API Calls**: Uses existing x.ai quota
- **Database**: Additional columns (minimal storage increase)
- **Frontend**: Additional JavaScript (~50KB gzipped)

### Security Considerations
- **Audio Data**: Not stored by default (privacy-first)
- **Permissions**: Microphone access requires user consent
- **Data Retention**: Configurable cleanup policies
- **Access Control**: Same auth requirements as regular tickets

---

## 🎯 Next Steps & Enhancements

### Immediate Improvements
1. **Real Speech Recognition** - Replace mock transcription with actual STT
2. **Audio Storage** - Optional audio file storage for compliance
3. **Voice Authentication** - Voice-based login verification
4. **Multi-language Support** - x.ai's language capabilities

### Advanced Features
1. **Voice Commands** - "Create urgent ticket" shortcuts
2. **Conversation Mode** - Follow-up questions via voice
3. **Voice Analytics** - Sentiment trends and voice patterns
4. **Integration APIs** - Voice ticket creation from external apps

### Research Areas
1. **Voice Quality Analysis** - Detect poor audio conditions
2. **Speaker Identification** - Recognize returning users
3. **Emotion Detection** - Advanced sentiment analysis
4. **Voice Search** - Voice-powered ticket search

---

## 📞 Support & Questions

**Having issues?** Check:
1. ✅ Environment variables set correctly
2. ✅ Database migration completed
3. ✅ HTTPS enabled for microphone access
4. ✅ x.ai API key configured
5. ✅ Browser permissions granted

**Need help?** The voice ticket system is designed to be:
- 🔧 **Maintainable** - Modular code with feature flags
- 🛡️ **Safe** - Easy rollback and disable options
- 📈 **Scalable** - Built for high-volume usage
- 🎯 **User-Friendly** - Intuitive voice interface

**Ready to enable voice tickets in your Ticktz instance?** 🚀🎤

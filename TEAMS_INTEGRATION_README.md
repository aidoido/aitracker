# Microsoft Teams Integration Guide

This guide shows how to integrate Microsoft Teams with your AiTracker to automatically create tickets from Teams messages.

## 🎯 Integration Overview

**Teams → AiTracker**: Automatically create support tickets when users send direct messages (DMs) in Teams.

## 🚀 Setup Instructions

### Step 1: Power Automate Flow Setup

1. **Go to Power Automate**: https://flow.microsoft.com
2. **Sign in** with your Microsoft account
3. **Create new flow**: Click "Create" → "Automated cloud flow"
4. **Choose trigger**: "When a new message is posted (preview)"

### Step 2: Configure the Trigger

```
Trigger Settings:
- Scopes: Personal (for direct messages only) - NOT Team/GroupChat
- Keywords: support, help, issue, ticket (optional - leave empty for all messages)
```

**Important:** Select **Personal** scope to trigger only on direct messages (DMs) with users, not channel messages.

**Why Personal scope?**
- Direct messages are more private for support requests
- Avoids cluttering team channels with automated responses
- Users can have confidential conversations with support

### Step 3: Add HTTP Action

Add a new step: **HTTP** (not "HTTP Webhook")

```
Method: POST
URI: https://your-app-url.com/api/requests/teams/create
Headers:
  Content-Type: application/json
Body:
{
  "message": "@{triggerOutputs()?['body/content']}",
  "userName": "@{triggerOutputs()?['body/from/user/displayName']}",
  "userId": "@{triggerOutputs()?['body/from/user/id']}",
  "channelId": "@{triggerOutputs()?['body/channelId']}",
  "teamId": "@{triggerOutputs()?['body/teamId']}",
  "channelName": "@{triggerOutputs()?['body/channelData/channel/name']}",
  "teamName": "@{triggerOutputs()?['body/channelData/team/name']}"
}
```

### Step 4: Add Response Action

Add another step: **Post message** (to send confirmation back to Teams)

```
Post in: [Same channel as trigger]
Message: 
🎫 **Support Ticket Created!**

@{body('HTTP')['message']}

**Ticket Details:**
- **ID:** #@{body('HTTP')['ticketId']}
- **Status:** Open
- **View:** @{body('HTTP')['ticketUrl']}
```

### Step 5: Save and Test

1. **Save** the flow
2. **Test** by sending a message in the Teams channel
3. **Check** your AiTracker for the new ticket

## 🔧 Advanced Configuration

### Multiple Channels

Create separate flows for different support categories:

- `#it-support` → IT category
- `#hr-support` → HR category  
- `#general` → General category

### Keywords Filtering

Use keywords to control when tickets are created:
- `support`, `help`, `issue` - Create tickets
- `question`, `ask` - Create tickets
- Skip casual conversation

### Custom Logic

Add conditions to:
- Auto-assign based on channel
- Set priority based on keywords (urgent, emergency)
- Tag specific team members

## 📊 API Endpoint Details

**Endpoint:** `POST /api/requests/teams/create`

**Request Body:**
```json
{
  "message": "User's Teams message",
  "userName": "John Doe",
  "userId": "29:1XYZ...",
  "channelId": "19:abcdef...",
  "teamId": "team-uuid",
  "channelName": "IT Support",
  "teamName": "Company Support"
}
```

**Response:**
```json
{
  "success": true,
  "ticketId": 123,
  "message": "Ticket #123 created successfully from Teams",
  "ticketUrl": "https://yourapp.com#requests"
}
```

## 🛠️ Troubleshooting

### Flow Not Triggering
- Check if Power Automate has Teams permissions
- Verify the channel selection
- Test with different keywords

### API Errors
- Check your app URL is accessible
- Verify the endpoint path
- Check server logs for errors

### Authentication Issues
- Ensure your app allows CORS from Power Automate
- Check if the endpoint requires authentication (it shouldn't for Teams integration)

## 🎯 Best Practices

1. **Use dedicated channels** for support requests
2. **Set clear expectations** about response times
3. **Train users** on how to submit support requests
4. **Monitor the flow** regularly for issues
5. **Create escalation paths** for urgent issues

## 🔄 Two-Way Integration

For full two-way integration, you can also set up notifications back to Teams:

1. Use Teams **Incoming Webhooks** 
2. Configure webhook URLs in your app settings
3. Send notifications when tickets are updated

This creates a complete Teams ↔ AiTracker integration!

---

## 📞 Support

If you encounter issues:
1. Check the Power Automate run history for error details
2. Review your app's server logs
3. Verify all URLs and credentials
4. Test the API endpoint directly with a tool like Postman

**Happy integrating! 🚀**

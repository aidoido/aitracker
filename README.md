# Ticktz

A lightweight, AI-assisted internal support tracking system designed to replace ad-hoc chat-based support with structured, auditable data and actionable insights.

## 🚀 Features

### Core Functionality
- **Request Logging**: Log support requests from MS Teams, email, and other channels
- **AI-Powered Categorization**: Automatically categorize requests with severity assessment
- **Smart Dashboard**: Real-time metrics showing request volume, status breakdown, and trends
- **Knowledge Base**: Build and maintain a searchable internal knowledge base
- **Role-Based Access**: Admin, Agent, and Viewer roles with appropriate permissions

### AI Integration
- **Auto-Categorization**: Classify requests into predefined categories
- **AI-Generated Replies**: Professional, context-aware responses for Teams copy-paste
- **Daily Summaries**: AI-generated reports for management and stand-ups
- **KB Enhancement**: AI-assisted knowledge base article improvement

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **AI**: Grok API (xAI) with OpenRouter fallback
- **Deployment**: Railway
- **Security**: Session-based authentication, bcrypt password hashing

### Database Schema
- `users`: User accounts with roles (admin/agent/viewer)
- `support_requests`: Support tickets with categorization and AI recommendations
- `categories`: Request categories (Oracle Fusion, Teams, Network, etc.)
- `kb_articles`: Knowledge base articles with confidence ratings
- `ai_settings`: Configurable AI provider settings
- `user_sessions`: Session management

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ms-teams-support-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and session secret
   ```

4. **Initialize the database**
   ```bash
   npm run init-db
   ```

5. **Start the application**
   ```bash
   npm start
   # Or for development with auto-restart:
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:3000
   - Default login: `admin` / `admin123`

## 🔧 Configuration

### AI Settings
Configure AI features through the admin panel:
- **Provider**: Grok (xAI) or OpenRouter
- **API Key**: Securely stored and encrypted
- **Model**: grok-beta or custom models
- **Temperature**: Response creativity (0.0-2.0)
- **Feature Toggles**: Enable/disable individual AI features

### User Management
Admins can create and manage users through the admin panel:
- **Admin**: Full access including settings and user management
- **Agent**: Can log requests, manage solutions, generate AI replies
- **Viewer**: Read-only access to dashboards and knowledge base

## 📊 Usage

### For Support Agents
1. **Log Requests**: Use the "New Request" button to log incoming support requests
2. **AI Assistance**: Click "Generate AI Reply" for professional response suggestions
3. **Track Progress**: Update request status as you work through issues
4. **Build Knowledge**: Mark solutions as KB articles for future reference

### For Management
1. **Monitor Volume**: Dashboard shows daily request counts and trends
2. **Track Performance**: Open vs. closed request metrics
3. **Review Categories**: See which types of issues are most common
4. **Generate Reports**: Use AI summaries for stand-ups and reports

## 🔒 Security

- **Session-based authentication** with secure cookies
- **Password hashing** using bcrypt
- **Role-based access control** on all endpoints
- **Input validation** and sanitization
- **Rate limiting** to prevent abuse
- **API keys encrypted** in database
- **No secrets in Git** - all sensitive data via environment variables

## 🚀 Deployment

### Railway Deployment (Recommended)

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)
   - Connect your GitHub account

2. **Create New Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repository
   - Railway will automatically detect Node.js and PostgreSQL needs

3. **Database Setup**
   - Railway automatically provisions PostgreSQL
   - The `DATABASE_URL` environment variable is set automatically

4. **Environment Variables**
   Set these in Railway dashboard (Variables tab):
   ```bash
   SESSION_SECRET=your-super-secure-random-string-here
   NODE_ENV=production
   ```

5. **Database Initialization**
   After first deployment, run the database setup:
   ```bash
   railway run npm run init-db
   ```

6. **Access Your App**
   - Railway provides a URL like `https://ms-teams-support-tracker.up.railway.app`
   - Default login: `admin` / `admin123` (change immediately!)

### Manual Deployment

If not using Railway:

1. **Set up PostgreSQL database**
   ```bash
   # Local PostgreSQL or cloud provider (Heroku, AWS RDS, etc.)
   createdb ms_teams_support
   ```

2. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/ms_teams_support
   SESSION_SECRET=your-secure-session-secret
   NODE_ENV=production
   PORT=3000
   ```

3. **Deploy to your preferred platform**
   - Heroku, Vercel, DigitalOcean, etc.
   - Ensure PostgreSQL is available
   - Set environment variables in your platform's dashboard

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Requests
- `GET /api/requests` - List requests with filtering
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request
- `POST /api/requests/:id/generate-reply` - Generate AI reply

### Dashboard
- `GET /api/dashboard/metrics` - Dashboard metrics
- `GET /api/dashboard/daily-summary/:date` - AI-generated daily summary

### Knowledge Base
- `GET /api/kb` - List KB articles
- `POST /api/kb` - Create KB article
- `PUT /api/kb/:id` - Update KB article

### Admin (Admin only)
- `GET /api/admin/ai-settings` - Get AI settings
- `PUT /api/admin/ai-settings` - Update AI settings
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## 🤖 AI Features

### Request Categorization
Automatically categorizes requests into:
- Oracle Fusion - Access Issue
- Oracle Fusion - PR/PO
- Finance / Invoice
- Network / VPN
- Teams / Communication
- Training Needed
- General IT

### Reply Generation
Creates professional, Teams-ready responses that are:
- 3-6 lines maximum
- User-facing and polite
- Context-aware
- No AI mentions
- Include clarifying questions when needed

### Knowledge Base Enhancement
Improves KB articles by:
- Refining problem summaries
- Enhancing solution clarity
- Suggesting confidence ratings
- Identifying reusable content

## 📈 Future Enhancements

- **Charts & Analytics**: Visual trend analysis and reporting
- **Teams Integration**: Direct webhook ingestion from Teams messages
- **SLA Tracking**: Response time and resolution metrics
- **Multi-Team Support**: Support for multiple projects/teams
- **Advanced Search**: Full-text search with filters
- **Export Features**: Excel/CSV export capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the knowledge base first
2. Review existing GitHub issues
3. Create a new issue with detailed information

---

**Built with ❤️ for efficient, AI-assisted support operations**

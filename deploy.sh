#!/bin/bash

# Ticktz - Deployment Script
# This script helps with Railway deployment setup

echo "🚀 Ticktz Deployment"
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔑 Please login to Railway first:"
    railway login
fi

echo "✅ Railway CLI ready"

# Check if in git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please initialize git first:"
    echo "git init"
    echo "git add ."
    echo "git commit -m 'Initial commit'"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    echo "git add ."
    echo "git commit -m 'Ready for deployment'"
    exit 1
fi

echo "✅ Git repository ready"

# Create Railway project
echo "🏗️  Creating Railway project..."
railway init ms-teams-support-tracker

# Add PostgreSQL
echo "🗄️  Adding PostgreSQL database..."
railway add postgresql

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Go to Railway dashboard and set environment variables:"
echo "   - SESSION_SECRET: $(openssl rand -hex 32)"
echo "   - NODE_ENV: production"
echo "2. After first deployment, run: railway run npm run init-db"
echo "3. Access your app at the URL shown in Railway dashboard"
echo "4. Default login: admin / admin123 (CHANGE THIS IMMEDIATELY!)"

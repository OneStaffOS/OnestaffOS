#!/bin/bash

# OneStaffOS Deployment Script
# Run this script from the parent directory of OnestaffOS

echo "🚀 Starting OneStaffOS Deployment..."

# Navigate to project directory
cd OnestaffOS || { echo "❌ Failed to cd into OnestaffOS"; exit 1; }

# Pull latest changes
echo "📥 Pulling latest changes from main..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# Stop all PM2 processes
echo "⏹️  Stopping PM2 processes..."
pm2 stop all

# Build Backend
echo "🔧 Building Backend..."
cd Backend || { echo "❌ Failed to cd into Backend"; exit 1; }
echo "📦 Installing Backend dependencies..."
npm install || { echo "❌ Backend npm install failed"; exit 1; }
npm run build || { echo "❌ Backend build failed"; exit 1; }

# Build Frontend
echo "🔧 Building Frontend..."
cd ../frontend || { echo "❌ Failed to cd into frontend"; exit 1; }
echo "📦 Installing Frontend dependencies..."
npm install || { echo "❌ Frontend npm install failed"; exit 1; }
npm run build || { echo "❌ Frontend build failed"; exit 1; }

# Restart all PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 restart all

echo "✅ Deployment completed successfully!"

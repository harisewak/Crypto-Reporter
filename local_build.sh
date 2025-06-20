#!/bin/bash

echo "🏠 Starting local build..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install || { echo "❌ Installation failed"; exit 1; }

# Build the project
echo "🔨 Building project..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Start preview server
echo "🚀 Starting preview server..."
echo "🌐 Your app will be available at: http://localhost:4173"
echo "⏹️  Press Ctrl+C to stop the server"

npm run preview 
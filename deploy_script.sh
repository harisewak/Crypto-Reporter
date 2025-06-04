#!/bin/bash

echo "🚀 Starting deployment..."

# Build the project
echo "📦 Building project..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Deploy to GitHub Pages
echo "📤 Deploying to GitHub Pages..."
npm run deploy || { echo "❌ Deployment failed"; exit 1; }

echo "✅ Deployment complete!"
echo "🌐 Your site will be live in a few minutes at: https://harisewak.github.io/Crypto-Reporter/" 
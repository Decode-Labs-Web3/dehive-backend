#!/bin/bash

# Dehive Backend Quick Start Script
echo "🚀 Starting Dehive Backend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "🔨 Building project..."
    npm run build
fi

# Kill any existing processes
echo "🛑 Stopping existing services..."
npm run kill:all 2>/dev/null || true

# Wait a moment
sleep 2

# Start all services
echo "🎯 Starting all services..."
npm run start:all

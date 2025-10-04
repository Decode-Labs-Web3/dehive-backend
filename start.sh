#!/bin/bash

# Dehive Backend Quick Start Script
echo "🚀 Starting Dehive Backend..."

# Run setup script first
echo "🔧 Running setup..."
npm run setup

# Check if setup was successful
if [ $? -ne 0 ]; then
    echo "❌ Setup failed. Please check the errors above."
    exit 1
fi

# Kill any existing processes
echo "🛑 Stopping existing services..."
npm run kill:all 2>/dev/null || true

# Wait a moment
sleep 2

# Start all services
echo "🎯 Starting all services..."
npm run start:all

#!/usr/bin/env bash
# Build script for Render.com

# 1. Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Setup backend
echo "Setting up backend..."
cd backend
npm install
cd ..

echo "Build complete!"

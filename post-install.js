#!/usr/bin/env node

/**
 * Post-install script to automatically setup the project
 * This runs after npm install to ensure everything is ready
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Dehive Backend...');

try {
  // Check if dist folder exists
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed!');
  } else {
    console.log('✅ Dist folder already exists');
  }

  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed!');
  } else {
    console.log('✅ Dependencies already installed');
  }

  console.log('🎉 Setup completed! You can now run:');
  console.log('   npm run start:all');
  console.log('   npm run start:all:setup');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  console.log('Please run manually:');
  console.log('   npm install');
  console.log('   npm run build');
  console.log('   npm run start:all');
  process.exit(1);
}

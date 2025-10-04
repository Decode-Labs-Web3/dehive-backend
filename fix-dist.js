#!/usr/bin/env node

/**
 * Quick fix script for missing dist files
 * Run this when you get "Cannot find module" errors
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing missing dist files...');

try {
  // Kill any running processes first
  console.log('🛑 Stopping existing services...');
  try {
    execSync('pkill -f "nest start"', { stdio: 'ignore' });
  } catch (e) {
    // Ignore if no processes to kill
  }

  // Clean dist folder
  console.log('🧹 Cleaning dist folder...');
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Rebuild everything
  console.log('🔨 Rebuilding project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Verify build
  console.log('🔍 Verifying build...');
  const services = ['auth', 'user-dehive-server', 'server', 'channel-messaging', 'direct-messaging'];

  for (const service of services) {
    const mainJsPath = path.join(__dirname, 'dist', 'apps', service, 'main.js');
    if (fs.existsSync(mainJsPath)) {
      console.log(`✅ ${service}/main.js exists`);
    } else {
      console.log(`❌ ${service}/main.js missing - build may have failed`);
    }
  }

  console.log('🎉 Fix completed! You can now run:');
  console.log('   npm run start:all');

} catch (error) {
  console.error('❌ Fix failed:', error.message);
  console.log('Please run manually:');
  console.log('   npm run build');
  console.log('   npm run start:all');
  process.exit(1);
}

#!/usr/bin/env node

/**
 * Safe setup script for Dehive Backend
 * This script only builds, doesn't install dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Dehive Backend Safe Setup');
console.log('============================');

function runCommand(command, description) {
  try {
    console.log(`📦 ${description}...`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    console.log(`✅ ${description} completed!`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function checkAndCreateDist() {
  const distPath = path.join(__dirname, 'dist');
  const appsPath = path.join(distPath, 'apps');

  console.log('🔍 Checking dist folder...');

  if (!fs.existsSync(distPath)) {
    console.log('📁 Creating dist folder...');
    fs.mkdirSync(distPath, { recursive: true });
  }

  if (!fs.existsSync(appsPath)) {
    console.log('📁 Creating dist/apps folder...');
    fs.mkdirSync(appsPath, { recursive: true });
  }

  // Check if main.js files exist in dist
  const services = ['auth', 'user-dehive-server', 'server', 'channel-messaging', 'direct-messaging'];
  let needsBuild = false;

  for (const service of services) {
    const mainJsPath = path.join(distPath, 'apps', service, 'main.js');
    if (!fs.existsSync(mainJsPath)) {
      console.log(`⚠️  Missing ${service}/main.js`);
      needsBuild = true;
    }
  }

  return needsBuild;
}

async function main() {
  try {
    // Step 1: Check Node.js version
    console.log('🔍 Checking Node.js version...');
    const nodeVersion = process.version;
    console.log(`Node.js version: ${nodeVersion}`);

    // Step 2: Check if node_modules exists
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('❌ node_modules not found!');
      console.log('Please run: npm install');
      process.exit(1);
    } else {
      console.log('✅ Dependencies found');
    }

    // Step 3: Check and build
    const needsBuild = checkAndCreateDist();

    if (needsBuild) {
      console.log('🔨 Building project...');
      try {
        execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
        console.log('✅ Build completed!');
      } catch (error) {
        console.log('❌ Build failed, trying to fix...');
        console.log('🔧 Running fix script...');
        try {
          execSync('node fix-dist.js', { stdio: 'inherit', cwd: __dirname });
          console.log('✅ Fix completed!');
        } catch (fixError) {
          console.log('❌ Fix also failed');
          console.log('Please run manually:');
          console.log('   npm run build');
          console.log('   npm run start:all');
          process.exit(1);
        }
      }
    } else {
      console.log('✅ All compiled files exist');
    }

    // Step 4: Verify build
    console.log('🔍 Verifying build...');
    const services = ['auth', 'user-dehive-server', 'server', 'channel-messaging', 'direct-messaging'];
    let allGood = true;

    for (const service of services) {
      const mainJsPath = path.join(__dirname, 'dist', 'apps', service, 'main.js');
      if (fs.existsSync(mainJsPath)) {
        console.log(`✅ ${service}/main.js exists`);
      } else {
        console.log(`❌ ${service}/main.js missing`);
        allGood = false;
      }
    }

    if (allGood) {
      console.log('🎉 Setup completed successfully!');
      console.log('');
      console.log('🚀 You can now run:');
      console.log('   npm run start:all');
    } else {
      console.log('❌ Setup incomplete. Please run:');
      console.log('   npm run build');
      console.log('   npm run start:all');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('');
    console.log('🔧 Manual setup:');
    console.log('   npm run build');
    console.log('   npm run start:all');
    process.exit(1);
  }
}

main();

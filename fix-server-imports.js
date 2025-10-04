#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix server main.js import paths
const mainJsPath = 'dist/apps/server/main.js';

if (fs.existsSync(mainJsPath)) {
  let content = fs.readFileSync(mainJsPath, 'utf8');

  // Fix import paths
  content = content.replace(
    /require\("\.\/server\.module"\)/g,
    'require("./src/server.module")'
  );

  content = content.replace(
    /require\("\.\.\/interfaces\/transform\.interface"\)/g,
    'require("./interfaces/transform.interface")'
  );

  fs.writeFileSync(mainJsPath, content);
  console.log('✅ Fixed server main.js import paths');
} else {
  console.log('❌ Server main.js not found');
}

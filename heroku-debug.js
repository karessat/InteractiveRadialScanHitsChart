#!/usr/bin/env node

// Debug script to help troubleshoot Heroku deployment
console.log('=== Heroku Environment Debug ===');
console.log('Node version:', process.version);
console.log('NPM version:', process.env.npm_config_user_agent);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'undefined');

console.log('\n=== Package.json Scripts ===');
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
console.log('Available scripts:', Object.keys(packageJson.scripts));

console.log('\n=== Dependencies Check ===');
console.log('Production dependencies:', Object.keys(packageJson.dependencies || {}));
console.log('Dev dependencies:', Object.keys(packageJson.devDependencies || {}));

console.log('\n=== File System Check ===');
console.log('package.json exists:', fs.existsSync('./package.json'));
console.log('postcss.config.js exists:', fs.existsSync('./postcss.config.js'));
console.log('tailwind.config.js exists:', fs.existsSync('./tailwind.config.js'));
console.log('vite.config.js exists:', fs.existsSync('./vite.config.js'));

console.log('\n=== PostCSS Config ===');
if (fs.existsSync('./postcss.config.js')) {
  console.log('PostCSS config content:', fs.readFileSync('./postcss.config.js', 'utf8'));
}

console.log('\n=== Tailwind Config ===');
if (fs.existsSync('./tailwind.config.js')) {
  console.log('Tailwind config content:', fs.readFileSync('./tailwind.config.js', 'utf8'));
}

console.log('\n=== Procfile ===');
if (fs.existsSync('./Procfile')) {
  console.log('Procfile content:', fs.readFileSync('./Procfile', 'utf8'));
}

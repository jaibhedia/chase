// Simple script to generate PWA icons
const fs = require('fs');
const path = require('path');

// Create a simple SVG that can be converted to PNG
const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#8B5CF6"/>
  <text x="96" y="120" font-family="Arial, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="white">C</text>
</svg>`;

const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#8B5CF6"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="220" font-weight="bold" text-anchor="middle" fill="white">C</text>
</svg>`;

// For now, just create SVG versions as placeholders
fs.writeFileSync(path.join(__dirname, '../public/icon-192.svg'), svg192);
fs.writeFileSync(path.join(__dirname, '../public/icon-512.svg'), svg512);

console.log('Icon SVGs generated successfully');

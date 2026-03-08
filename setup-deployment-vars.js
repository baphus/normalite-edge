#!/usr/bin/env node

/**
 * Script to generate and display environment variable templates for deployment
 * Usage: node setup-deployment-vars.js
 */

const crypto = require('crypto');

function generateSecret() {
    return crypto.randomBytes(32).toString('hex');
}

function generateEnvFile(name, vars) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${name} ENVIRONMENT VARIABLES`);
    console.log(`${'='.repeat(60)}\n`);
    
    console.log(vars.map(v => `${v.key}=${v.value}`).join('\n'));
    console.log('\n');
}

// Generate secrets
const accessSecret = generateSecret();
const refreshSecret = generateSecret();

console.log('\n🔐 NORMALITE EDGE - PRODUCTION ENVIRONMENT SETUP\n');

// Render Environment Variables
const renderVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '3000' },
    { key: 'DATABASE_URL', value: 'postgresql://user:password@host:port/db?sslmode=require' },
    { key: 'JWT_ACCESS_SECRET', value: accessSecret },
    { key: 'JWT_REFRESH_SECRET', value: refreshSecret },
    { key: 'JWT_ACCESS_EXPIRES_IN', value: '15m' },
    { key: 'JWT_REFRESH_EXPIRES_IN', value: '7d' },
    { key: 'GOOGLE_CLIENT_ID', value: 'your-google-client-id (optional)' },
    { key: 'GOOGLE_CLIENT_SECRET', value: 'your-google-client-secret (optional)' },
    { key: 'CLIENT_URL', value: 'https://your-vercel-app.vercel.app' },
    { key: 'CLOUDINARY_CLOUD_NAME', value: 'your-cloudinary-name (optional)' },
    { key: 'CLOUDINARY_API_KEY', value: 'your-cloudinary-key (optional)' },
    { key: 'CLOUDINARY_API_SECRET', value: 'your-cloudinary-secret (optional)' },
];

// Vercel Environment Variables
const vercelVars = [
    { key: 'VITE_API_URL', value: 'https://normalite-edge-api.onrender.com/api/v1' },
];

generateEnvFile('RENDER BACKEND', renderVars);
generateEnvFile('VERCEL FRONTEND', vercelVars);

console.log('📋 SETUP INSTRUCTIONS:\n');
console.log('1. Copy each environment variable above');
console.log('2. Go to your deployment platform dashboard:');
console.log('   - For Render: Dashboard > Your Service > Environment');
console.log('   - For Vercel: Project Settings > Environment Variables');
console.log('3. Add each variable individually');
console.log('4. Required fields (marked mandatory):');
console.log('   - NODE_ENV (Render)');
console.log('   - PORT (Render)');
console.log('   - DATABASE_URL (Render) - from Supabase');
console.log('   - JWT_ACCESS_SECRET (Render) - generated above');
console.log('   - JWT_REFRESH_SECRET (Render) - generated above');
console.log('   - CLIENT_URL (Render) - your Vercel domain');
console.log('   - VITE_API_URL (Vercel) - your Render domain\n');

console.log('⚠️  IMPORTANT NOTES:\n');
console.log('• Generated JWT secrets above are ONE-TIME secrets');
console.log('• If you close this window, run the script again to generate new ones');
console.log('• Database password in DATABASE_URL must be URL-encoded if it contains special characters');
console.log('• CLIENT_URL must include protocol (https://) and be exact');
console.log('• VITE_API_URL must include /api/v1 path');
console.log('• Optional fields (Google, Cloudinary) can be left empty initially\n');

console.log('🔗 DEPLOYMENT GUIDES:\n');
console.log('• Full Guide: see DEPLOYMENT.md');
console.log('• Checklist: see DEPLOYMENT_CHECKLIST.md');
console.log('• Local Setup: see LOCAL_SETUP.md\n');

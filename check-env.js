#!/usr/bin/env node
require('dotenv').config();

console.log('=== Environment Configuration Check ===\n');

// Check required environment variables
const requiredVars = [
  'IDX_TOKEN',
  'VOW_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalVars = [
  'IDX_BASE_URL',
  'VOW_BASE_URL', 
  'MEDIA_BASE_URL',
  'MEDIA_URL',
  'BATCH_SIZE',
  'NODE_ENV',
  'MEDIA_SYNC_START_DATE'
];

console.log('Required Environment Variables:');
let allRequiredPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allRequiredPresent = false;
  }
});

console.log('\nOptional Environment Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: NOT SET (using default)`);
  }
});

console.log('\n=== Configuration Summary ===');
if (allRequiredPresent) {
  console.log('✅ All required environment variables are set!');
  console.log('✅ Ready to run sync operations');
} else {
  console.log('❌ Missing required environment variables');
  console.log('❌ Please set the missing variables in your .env file');
  process.exit(1);
}

// Show current configuration
console.log('\n=== Current Configuration ===');
console.log(`IDX Base URL: ${process.env.IDX_BASE_URL || 'https://query.ampre.ca/odata/Property (default)'}`);
console.log(`VOW Base URL: ${process.env.VOW_BASE_URL || 'https://query.ampre.ca/odata/Property (default)'}`);
console.log(`Media Base URL: ${process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media (default)'}`);
console.log(`Batch Size: ${process.env.BATCH_SIZE || '5000 (default)'}`);
console.log(`Node Environment: ${process.env.NODE_ENV || 'development (default)'}`);

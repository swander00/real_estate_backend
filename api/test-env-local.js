// test-env-local.js - Test environment variables locally
import 'dotenv/config';

console.log('🔍 Environment Variables Check:');
console.log('================================');

// Check all your environment variables
const envVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY', 
  'IDX_URL',
  'IDX_TOKEN',
  'VOW_URL',
  'VOW_TOKEN',
  'FREEHOLD_URL',
  'CONDO_URL',
  'LEASE_URL',
  'OPENHOUSE_URL',
  'MEDIA_URL',
  'ROOMS_URL',
  'CRON_SECRET'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const length = value ? `(${value.length} chars)` : '(not set)';
  
  console.log(`${status} ${varName}: ${length}`);
  
  // Show first few characters for verification (except sensitive tokens)
  if (value && !varName.includes('TOKEN') && !varName.includes('KEY') && !varName.includes('SECRET')) {
    console.log(`   Preview: ${value.substring(0, 30)}...`);
  }
});

console.log('\n🚀 Testing Sync Functions:');
console.log('=========================');

// Test if sync functions can be imported
try {
  const { syncListingsIdx } = await import('./syncListingsIdx.js');
  console.log('✅ syncListingsIdx imported successfully');
} catch (error) {
  console.log('❌ syncListingsIdx import failed:', error.message);
}

try {
  const { syncListingsVow } = await import('./syncListingsVow.js');
  console.log('✅ syncListingsVow imported successfully');
} catch (error) {
  console.log('❌ syncListingsVow import failed:', error.message);
}

console.log('\n📝 Notes:');
console.log('- CRON_SECRET should be set locally in your .env file for testing');
console.log('- In production, it will be set in Vercel environment variables');
console.log('- If CRON_SECRET is missing, generate one and add it to your .env file');
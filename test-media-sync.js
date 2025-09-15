#!/usr/bin/env node
require('dotenv').config();

const logger = require('./lib/utils/logger');
const { fetchMediaRecords } = require('./lib/sync/mediaSync');

async function testMediaSync() {
  console.log('=== Media Sync Test ===\n');
  
  try {
    // Check environment variables first
    console.log('1. Checking environment configuration...');
    const mediaUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
    const token = process.env.IDX_TOKEN;
    
    if (!token) {
      throw new Error('IDX_TOKEN not set in environment');
    }
    
    console.log(`✅ Media URL: ${mediaUrl}`);
    console.log(`✅ Token: ${token.substring(0, 20)}...`);
    console.log('✅ Environment configuration looks good\n');
    
    // Initialize database first
    console.log('2. Initializing database connection...');
    const { initializeDatabase } = require('./lib/utils/db');
    await initializeDatabase();
    console.log('✅ Database initialized successfully\n');
    
    // Test incremental sync (smaller dataset)
    console.log('3. Testing incremental media sync...');
    console.log('   This will fetch only recent media records\n');
    
    const startTime = Date.now();
    const result = await fetchMediaRecords(true); // incremental = true
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n=== Test Results ===');
    console.log(`✅ Media sync completed successfully in ${duration}s`);
    console.log(`📊 Total records fetched: ${result.totalFetched}`);
    console.log(`📊 Total unique records: ${result.totalUnique}`);
    console.log(`📊 Total records upserted: ${result.totalUpserted}`);
    console.log(`📊 Latest timestamp: ${result.latestTimestamp || 'None'}`);
    
    if (result.totalFetched > 0) {
      console.log('\n✅ Media sync is working correctly!');
      console.log('✅ Environment variables are properly configured');
      console.log('✅ API connection is successful');
      console.log('✅ Database operations are working');
    } else {
      console.log('\n⚠️  No records were fetched');
      console.log('   This could mean:');
      console.log('   - No recent media updates (normal for incremental sync)');
      console.log('   - API endpoint might be different');
      console.log('   - Token might not have access to media feed');
    }
    
  } catch (error) {
    console.error('\n❌ Media sync test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('not set in environment')) {
      console.error('\n💡 Solution: Set the required environment variables in your .env file');
      console.error('   Run: cp env.example .env');
      console.error('   Then edit .env with your actual values');
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n💡 Solution: Check your IDX_TOKEN - it might be invalid or expired');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.error('\n💡 Solution: Check your MEDIA_BASE_URL - the endpoint might be incorrect');
    } else if (error.message.includes('Supabase') || error.message.includes('database')) {
      console.error('\n💡 Solution: Check your Supabase configuration (SUPABASE_URL, SUPABASE_ANON_KEY)');
    }
    
    console.error('\n📋 Full error details:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testMediaSync().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testMediaSync };

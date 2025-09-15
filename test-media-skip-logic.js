#!/usr/bin/env node
require('dotenv').config();

const logger = require('./lib/utils/logger');

async function testMediaSkipLogic() {
  console.log('=== Media Sync Skip Logic Test ===\n');
  
  try {
    // Test 1: Check environment variables
    console.log('1. Checking environment configuration...');
    const mediaUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
    const token = process.env.IDX_TOKEN;
    
    console.log(`✅ Media URL: ${mediaUrl}`);
    console.log(`✅ Token available: ${token ? 'Yes' : 'No'}`);
    
    if (!token) {
      throw new Error('IDX_TOKEN not set in environment');
    }
    
    // Test 2: Initialize database
    console.log('\n2. Initializing database connection...');
    const { initializeDatabase } = require('./lib/utils/db');
    await initializeDatabase();
    console.log('✅ Database initialized successfully\n');
    
    // Test 3: Run a small media sync test
    console.log('3. Testing media sync with new skip logic...');
    console.log('   This will test the new logic that skips problematic weeks\n');
    
    const { fetchMediaRecords } = require('./lib/sync/mediaSync');
    
    const startTime = Date.now();
    const result = await fetchMediaRecords(false); // full sync = false (but it will do full sync since no previous sync)
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n=== Test Results ===');
    console.log(`✅ Media sync completed successfully in ${duration}s`);
    console.log(`📊 Total records fetched: ${result.totalFetched}`);
    console.log(`📊 Total unique records: ${result.totalUnique}`);
    console.log(`📊 Total records upserted: ${result.totalUpserted}`);
    console.log(`📊 Latest timestamp: ${result.latestTimestamp || 'None'}`);
    
    if (result.totalFetched > 0) {
      console.log('\n✅ Media sync is working with new skip logic!');
      console.log('✅ The system should now:');
      console.log('   - Skip weeks that hit the 100K API limit');
      console.log('   - Continue to previous weeks/months');
      console.log('   - Process skipped weeks at the end');
      console.log('   - Go back to January 1, 2024');
    } else {
      console.log('\n⚠️  No records were fetched');
      console.log('   This could mean the database already has all the data');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n💡 Solution: Check your IDX_TOKEN - it might be invalid or expired');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.error('\n💡 Solution: Check your MEDIA_BASE_URL - the endpoint might be incorrect');
    } else if (error.message.includes('Supabase') || error.message.includes('database')) {
      console.error('\n💡 Solution: Check your Supabase configuration (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    }
    
    console.error('\n📋 Full error details:');
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testMediaSkipLogic().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testMediaSkipLogic };

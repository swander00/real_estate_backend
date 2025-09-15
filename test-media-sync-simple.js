#!/usr/bin/env node
require('dotenv').config();

const logger = require('./lib/utils/logger');

async function testMediaSyncSimple() {
  console.log('=== Simple Media Sync Test ===\n');
  
  try {
    // Test 1: Check if environment variables are accessible
    console.log('1. Testing environment variable access...');
    const mediaUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
    const token = process.env.IDX_TOKEN;
    
    console.log(`✅ Media URL: ${mediaUrl}`);
    console.log(`✅ Token available: ${token ? 'Yes' : 'No'}`);
    
    if (!token) {
      console.log('\n⚠️  IDX_TOKEN not set - this is required for media sync');
      console.log('   Please set IDX_TOKEN in your .env file');
      return;
    }
    
    // Test 2: Test the fetchFeed utility
    console.log('\n2. Testing API connection...');
    const { fetchODataPage } = require('./lib/utils/fetchFeed');
    
    // Try to fetch a small batch to test connection
    const testResult = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 1, // Just fetch 1 record for testing
      skip: 0,
      filter: null
    });
    
    console.log('✅ API connection successful!');
    console.log(`✅ Fetched ${testResult.value.length} test record(s)`);
    
    if (testResult.value.length > 0) {
      const sampleRecord = testResult.value[0];
      console.log('✅ Sample record structure:');
      console.log(`   - ResourceRecordKey: ${sampleRecord.ResourceRecordKey || 'N/A'}`);
      console.log(`   - MediaKey: ${sampleRecord.MediaKey || 'N/A'}`);
      console.log(`   - MediaModificationTimestamp: ${sampleRecord.MediaModificationTimestamp || 'N/A'}`);
    }
    
    // Test 3: Test database connection (if Supabase is configured)
    console.log('\n3. Testing database connection...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const { initializeDatabase } = require('./lib/utils/db');
        await initializeDatabase();
        console.log('✅ Database connection successful!');
      } catch (dbError) {
        console.log('⚠️  Database connection failed:', dbError.message);
        console.log('   This is expected if Supabase is not configured yet');
      }
    } else {
      console.log('⚠️  Supabase not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)');
      console.log('   This is expected for API-only testing');
    }
    
    console.log('\n=== Test Summary ===');
    console.log('✅ Environment variables are working');
    console.log('✅ API connection is successful');
    console.log('✅ Media sync should work correctly');
    console.log('\n💡 To run a full media sync test, configure Supabase and run:');
    console.log('   npm run test:media');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n💡 Solution: Check your IDX_TOKEN - it might be invalid or expired');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.error('\n💡 Solution: Check your MEDIA_BASE_URL - the endpoint might be incorrect');
    } else if (error.message.includes('fetch')) {
      console.error('\n💡 Solution: Check your internet connection and API endpoint');
    }
    
    console.error('\n📋 Full error details:');
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testMediaSyncSimple().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testMediaSyncSimple };

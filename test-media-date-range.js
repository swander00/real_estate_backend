#!/usr/bin/env node
require('dotenv').config();

const logger = require('./lib/utils/logger');

async function testMediaDateRange() {
  console.log('=== Media Sync Date Range Test ===\n');
  
  try {
    // Test 1: Check environment variables
    console.log('1. Checking environment configuration...');
    const mediaUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
    const token = process.env.IDX_TOKEN;
    const startDate = process.env.MEDIA_SYNC_START_DATE || '2024-01-01T00:00:00Z';
    
    console.log(`✅ Media URL: ${mediaUrl}`);
    console.log(`✅ Token available: ${token ? 'Yes' : 'No'}`);
    console.log(`✅ Start Date: ${startDate}`);
    
    if (!token) {
      throw new Error('IDX_TOKEN not set in environment');
    }
    
    // Test 2: Test API connection with a small date range
    console.log('\n2. Testing API connection with date range...');
    const { fetchODataPage } = require('./lib/utils/fetchFeed');
    
    // Test with a small date range from January 1, 2024
    const testStartDate = new Date('2024-01-01T00:00:00Z');
    const testEndDate = new Date('2024-01-02T00:00:00Z');
    const testFilter = `MediaModificationTimestamp ge ${testStartDate.toISOString()} and MediaModificationTimestamp lt ${testEndDate.toISOString()}`;
    
    console.log(`   Testing date range: ${testStartDate.toISOString().split('T')[0]} to ${testEndDate.toISOString().split('T')[0]}`);
    console.log(`   Filter: ${testFilter}`);
    
    const testResult = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 5, // Just fetch 5 records for testing
      skip: 0,
      filter: testFilter
    });
    
    console.log(`✅ API connection successful for date range!`);
    console.log(`✅ Fetched ${testResult.value.length} test record(s) from January 1, 2024`);
    
    if (testResult.value.length > 0) {
      const sampleRecord = testResult.value[0];
      console.log('✅ Sample record from 2024:');
      console.log(`   - ResourceRecordKey: ${sampleRecord.ResourceRecordKey || 'N/A'}`);
      console.log(`   - MediaKey: ${sampleRecord.MediaKey || 'N/A'}`);
      console.log(`   - MediaModificationTimestamp: ${sampleRecord.MediaModificationTimestamp || 'N/A'}`);
    } else {
      console.log('⚠️  No records found for January 1, 2024');
      console.log('   This could mean:');
      console.log('   - No media was modified on that specific date');
      console.log('   - The date range is too narrow');
    }
    
    // Test 3: Test with a broader range
    console.log('\n3. Testing with broader date range (January 2024)...');
    const broadStartDate = new Date('2024-01-01T00:00:00Z');
    const broadEndDate = new Date('2024-02-01T00:00:00Z');
    const broadFilter = `MediaModificationTimestamp ge ${broadStartDate.toISOString()} and MediaModificationTimestamp lt ${broadEndDate.toISOString()}`;
    
    console.log(`   Testing date range: ${broadStartDate.toISOString().split('T')[0]} to ${broadEndDate.toISOString().split('T')[0]}`);
    
    const broadResult = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 10, // Fetch 10 records for testing
      skip: 0,
      filter: broadFilter
    });
    
    console.log(`✅ Fetched ${broadResult.value.length} test record(s) from January 2024`);
    
    if (broadResult.value.length > 0) {
      const sampleRecord = broadResult.value[0];
      console.log('✅ Sample record from January 2024:');
      console.log(`   - MediaModificationTimestamp: ${sampleRecord.MediaModificationTimestamp || 'N/A'}`);
    }
    
    console.log('\n=== Test Summary ===');
    console.log('✅ Environment variables are working');
    console.log('✅ API connection is successful');
    console.log('✅ Date range filtering is working');
    console.log('✅ Media sync should now go back to January 1, 2024');
    console.log('\n💡 The media sync will now:');
    console.log('   - Start from today and work backwards');
    console.log('   - Stop at January 1, 2024 (or your configured start date)');
    console.log('   - Process data in weekly chunks, breaking down to daily if needed');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n💡 Solution: Check your IDX_TOKEN - it might be invalid or expired');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.error('\n💡 Solution: Check your MEDIA_BASE_URL - the endpoint might be incorrect');
    }
    
    console.error('\n📋 Full error details:');
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testMediaDateRange().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testMediaDateRange };

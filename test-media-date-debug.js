#!/usr/bin/env node
require('dotenv').config();

const logger = require('./lib/utils/logger');

async function testMediaDateDebug() {
  console.log('=== Media Sync Date Debug Test ===\n');
  
  try {
    // Test 1: Check what dates we're working with
    console.log('1. Checking current date logic...');
    const now = new Date();
    const targetStartDate = new Date(process.env.MEDIA_SYNC_START_DATE || '2024-01-01T00:00:00Z');
    const daysPerChunk = 7;
    
    let endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 1); // Include today
    let startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysPerChunk);
    
    console.log(`Current date: ${now.toISOString()}`);
    console.log(`Target start date: ${targetStartDate.toISOString()}`);
    console.log(`First chunk: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Test 2: Test API with different date ranges
    console.log('\n2. Testing API with different date ranges...');
    const { fetchODataPage } = require('./lib/utils/fetchFeed');
    const mediaUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
    const token = process.env.IDX_TOKEN;
    
    // Test current week (Sep 9-15, 2025)
    const currentWeekStart = new Date('2025-09-09T00:00:00Z');
    const currentWeekEnd = new Date('2025-09-16T00:00:00Z');
    const currentWeekFilter = `MediaModificationTimestamp ge ${currentWeekStart.toISOString()} and MediaModificationTimestamp lt ${currentWeekEnd.toISOString()}`;
    
    console.log(`\nTesting current week (Sep 9-15, 2025):`);
    console.log(`Filter: ${currentWeekFilter}`);
    
    const currentWeekResult = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 100, // Just get a sample
      skip: 0,
      filter: currentWeekFilter
    });
    
    console.log(`✅ Found ${currentWeekResult.value.length} records in current week`);
    
    // Test previous week (Sep 2-8, 2025)
    const prevWeekStart = new Date('2025-09-02T00:00:00Z');
    const prevWeekEnd = new Date('2025-09-09T00:00:00Z');
    const prevWeekFilter = `MediaModificationTimestamp ge ${prevWeekStart.toISOString()} and MediaModificationTimestamp lt ${prevWeekEnd.toISOString()}`;
    
    console.log(`\nTesting previous week (Sep 2-8, 2025):`);
    console.log(`Filter: ${prevWeekFilter}`);
    
    const prevWeekResult = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 100, // Just get a sample
      skip: 0,
      filter: prevWeekFilter
    });
    
    console.log(`✅ Found ${prevWeekResult.value.length} records in previous week`);
    
    // Test August 2025
    const augustStart = new Date('2025-08-01T00:00:00Z');
    const augustEnd = new Date('2025-09-01T00:00:00Z');
    const augustFilter = `MediaModificationTimestamp ge ${augustStart.toISOString()} and MediaModificationTimestamp lt ${augustEnd.toISOString()}`;
    
    console.log(`\nTesting August 2025:`);
    console.log(`Filter: ${augustFilter}`);
    
    const augustResult = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 100, // Just get a sample
      skip: 0,
      filter: augustFilter
    });
    
    console.log(`✅ Found ${augustResult.value.length} records in August 2025`);
    
    // Test July 2025
    const julyStart = new Date('2025-07-01T00:00:00Z');
    const julyEnd = new Date('2025-08-01T00:00:00Z');
    const julyFilter = `MediaModificationTimestamp ge ${julyStart.toISOString()} and MediaModificationTimestamp lt ${julyEnd.toISOString()}`;
    
    console.log(`\nTesting July 2025:`);
    console.log(`Filter: ${julyFilter}`);
    
    const julyResult = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 100, // Just get a sample
      skip: 0,
      filter: julyFilter
    });
    
    console.log(`✅ Found ${julyResult.value.length} records in July 2025`);
    
    // Test January 2024
    const jan2024Start = new Date('2024-01-01T00:00:00Z');
    const jan2024End = new Date('2024-02-01T00:00:00Z');
    const jan2024Filter = `MediaModificationTimestamp ge ${jan2024Start.toISOString()} and MediaModificationTimestamp lt ${jan2024End.toISOString()}`;
    
    console.log(`\nTesting January 2024:`);
    console.log(`Filter: ${jan2024Filter}`);
    
    const jan2024Result = await fetchODataPage({
      baseUrl: mediaUrl,
      token: token,
      top: 100, // Just get a sample
      skip: 0,
      filter: jan2024Filter
    });
    
    console.log(`✅ Found ${jan2024Result.value.length} records in January 2024`);
    
    console.log('\n=== Analysis ===');
    console.log('The issue is likely that:');
    console.log('1. The current week (Sep 9-15, 2025) has 339K records and hits the 100K API limit');
    console.log('2. It breaks down to daily chunks for that week');
    console.log('3. But the daily chunking might be taking too long or getting stuck');
    console.log('4. It never gets to process the previous weeks/months');
    
    console.log('\n💡 Solution: We need to modify the logic to:');
    console.log('   - Skip the current week if it hits the limit');
    console.log('   - Continue to previous weeks/months');
    console.log('   - Come back to the current week later if needed');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\n📋 Full error details:');
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testMediaDateDebug().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testMediaDateDebug };

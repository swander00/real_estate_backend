#!/usr/bin/env node

// check_feed_completion.js - Check if we've reached the end of all data feeds
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from './lib/fetchFeed.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const DEBUG = true;

// Table configurations
const FEED_TABLES = [
  {
    name: 'common_fields',
    url: process.env.IDX_URL,
    token: process.env.IDX_TOKEN,
    displayName: 'IDX Common Fields'
  },
  {
    name: 'residential_freehold',
    url: process.env.IDX_FREEHOLD_URL,
    token: process.env.IDX_TOKEN,
    displayName: 'IDX Freehold'
  },
  {
    name: 'residential_condo',
    url: process.env.IDX_CONDO_URL,
    token: process.env.IDX_TOKEN,
    displayName: 'IDX Condo'
  },
  {
    name: 'residential_lease',
    url: process.env.IDX_LEASE_URL,
    token: process.env.IDX_TOKEN,
    displayName: 'IDX Lease'
  },
  {
    name: 'property_media',
    url: process.env.IDX_MEDIA_URL,
    token: process.env.IDX_TOKEN,
    displayName: 'IDX Media'
  },
  {
    name: 'property_openhouse',
    url: process.env.IDX_OPENHOUSE_URL,
    token: process.env.IDX_TOKEN,
    displayName: 'IDX OpenHouse'
  },
  {
    name: 'property_rooms',
    url: process.env.IDX_ROOMS_URL,
    token: process.env.IDX_TOKEN,
    displayName: 'IDX Rooms'
  }
];

/**
 * Check if a feed has more data available
 * @param {Object} feedConfig - Feed configuration
 * @param {number} currentSkip - Current skip position
 * @returns {Promise<Object>} Feed status information
 */
async function checkFeedStatus(feedConfig) {
  const { name, url, token, displayName } = feedConfig;
  
  try {
    // Get current record count in database
    const { count: dbCount, error: countError } = await supabase
      .from(name)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      return {
        name,
        displayName,
        status: 'error',
        error: countError.message,
        dbCount: 0,
        feedAvailable: false
      };
    }

    const currentSkip = dbCount || 0;
    
    // Try to fetch a small batch from the feed to see if there's more data
    const testBatchSize = 10;
    const { records, error: fetchError } = await fetchODataPage({
      baseUrl: url,
      token,
      top: testBatchSize,
      skip: currentSkip
    });

    if (fetchError) {
      // Check if it's an API limit error
      if (fetchError.message.includes('exceeds 100000') || fetchError.message.includes('1108')) {
        return {
          name,
          displayName,
          status: 'api_limit',
          dbCount: currentSkip,
          feedAvailable: false,
          message: `API limit reached (skip ${currentSkip} + batch > 100,000)`
        };
      }
      
      return {
        name,
        displayName,
        status: 'error',
        error: fetchError.message,
        dbCount: currentSkip,
        feedAvailable: false
      };
    }

    const hasMoreData = records && records.length > 0;
    const recordsAvailable = records ? records.length : 0;

    return {
      name,
      displayName,
      status: hasMoreData ? 'has_data' : 'complete',
      dbCount: currentSkip,
      feedAvailable: hasMoreData,
      recordsAvailable,
      message: hasMoreData 
        ? `${recordsAvailable} records available at skip ${currentSkip}`
        : `No more data available (tried skip ${currentSkip})`
    };

  } catch (error) {
    return {
      name,
      displayName,
      status: 'error',
      error: error.message,
      dbCount: 0,
      feedAvailable: false
    };
  }
}

/**
 * Check completion status of all feeds
 */
async function checkAllFeedsCompletion() {
  console.log('🔍 Checking completion status of all data feeds...');
  console.log('');

  const results = [];
  let totalDbRecords = 0;
  let feedsWithData = 0;
  let feedsComplete = 0;
  let feedsAtLimit = 0;
  let feedsWithErrors = 0;

  for (const feed of FEED_TABLES) {
    console.log(`📊 Checking ${feed.displayName}...`);
    const status = await checkFeedStatus(feed);
    results.push(status);
    
    totalDbRecords += status.dbCount || 0;
    
    switch (status.status) {
      case 'has_data':
        feedsWithData++;
        console.log(`  ✅ ${status.message}`);
        break;
      case 'complete':
        feedsComplete++;
        console.log(`  🎯 ${status.message}`);
        break;
      case 'api_limit':
        feedsAtLimit++;
        console.log(`  🛑 ${status.message}`);
        break;
      case 'error':
        feedsWithErrors++;
        console.log(`  ❌ Error: ${status.error}`);
        break;
    }
    
    console.log('');
  }

  // Summary
  console.log('📈 FEED COMPLETION SUMMARY');
  console.log('========================');
  console.log(`📊 Total records in database: ${totalDbRecords.toLocaleString()}`);
  console.log(`🔄 Feeds with more data: ${feedsWithData}`);
  console.log(`🎯 Feeds complete (no more data): ${feedsComplete}`);
  console.log(`🛑 Feeds at API limit: ${feedsAtLimit}`);
  console.log(`❌ Feeds with errors: ${feedsWithErrors}`);
  console.log('');

  // Detailed breakdown
  console.log('📋 DETAILED STATUS:');
  results.forEach(result => {
    const statusIcon = {
      'has_data': '🔄',
      'complete': '🎯',
      'api_limit': '🛑',
      'error': '❌'
    }[result.status] || '❓';
    
    console.log(`  ${statusIcon} ${result.displayName}: ${result.dbCount.toLocaleString()} records - ${result.message}`);
  });
  console.log('');

  // Recommendations
  console.log('💡 RECOMMENDATIONS:');
  
  if (feedsWithData > 0) {
    console.log(`  🔄 ${feedsWithData} feeds still have data - continue syncing`);
  }
  
  if (feedsComplete > 0) {
    console.log(`  🎯 ${feedsComplete} feeds are complete - no more data available`);
  }
  
  if (feedsAtLimit > 0) {
    console.log(`  🛑 ${feedsAtLimit} feeds hit API limits - consider archiving old data`);
  }
  
  if (feedsWithErrors > 0) {
    console.log(`  ❌ ${feedsWithErrors} feeds have errors - check configuration`);
  }

  // Overall status
  const allComplete = feedsWithData === 0 && feedsWithErrors === 0;
  if (allComplete) {
    console.log('');
    console.log('🎉 ALL FEEDS COMPLETE!');
    console.log('   You have successfully synced all available data from the feeds.');
    console.log('   No more records are available to sync.');
  } else {
    console.log('');
    console.log('🔄 SYNC IN PROGRESS');
    console.log('   Some feeds still have data available for syncing.');
  }

  return {
    totalDbRecords,
    feedsWithData,
    feedsComplete,
    feedsAtLimit,
    feedsWithErrors,
    allComplete,
    results
  };
}

// Run the check
checkAllFeedsCompletion()
  .then((summary) => {
    console.log('');
    console.log('✅ Feed completion check finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error checking feed completion:', error);
    process.exit(1);
  });

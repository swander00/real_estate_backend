#!/usr/bin/env node

// analyze_common_fields.js - Detailed analysis of common_fields table
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function analyzeCommonFields() {
  console.log('🔍 Detailed analysis of common_fields table...');
  console.log('');

  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('common_fields')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log(`❌ Error getting count: ${countError.message}`);
      return;
    }

    console.log(`📊 Total records: ${totalCount}`);
    console.log('');

    // Get sample of records to see what's in there
    const { data: sampleRecords, error: sampleError } = await supabase
      .from('common_fields')
      .select('ListingKey, DataSource, CreatedAt, UpdatedAt')
      .order('CreatedAt', { ascending: false })
      .limit(10);

    if (sampleError) {
      console.log(`❌ Error getting sample: ${sampleError.message}`);
      return;
    }

    console.log('📋 Sample records (most recent):');
    sampleRecords?.forEach((record, idx) => {
      console.log(`  ${idx + 1}. ListingKey: ${record.ListingKey}, DataSource: ${record.DataSource}, Created: ${record.CreatedAt}`);
    });
    console.log('');

    // Check for duplicates
    const { data: duplicates, error: dupError } = await supabase
      .from('common_fields')
      .select('ListingKey')
      .order('ListingKey');

    if (dupError) {
      console.log(`❌ Error checking duplicates: ${dupError.message}`);
      return;
    }

    const listingKeys = duplicates?.map(r => r.ListingKey) || [];
    const uniqueKeys = new Set(listingKeys);
    const duplicateCount = listingKeys.length - uniqueKeys.size;

    console.log(`🔍 Duplicate analysis:`);
    console.log(`  Total records: ${listingKeys.length}`);
    console.log(`  Unique ListingKeys: ${uniqueKeys.size}`);
    console.log(`  Duplicates: ${duplicateCount}`);
    console.log('');

    // Check data sources
    const { data: dataSources, error: dsError } = await supabase
      .from('common_fields')
      .select('DataSource')
      .order('DataSource');

    if (dsError) {
      console.log(`❌ Error checking data sources: ${dsError.message}`);
      return;
    }

    const sourceCounts = {};
    dataSources?.forEach(record => {
      const source = record.DataSource || 'NULL';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    console.log(`📊 Records by DataSource:`);
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} records`);
    });
    console.log('');

    // Check date ranges
    const { data: dateRange, error: dateError } = await supabase
      .from('common_fields')
      .select('CreatedAt')
      .order('CreatedAt', { ascending: true })
      .limit(1);

    if (dateError) {
      console.log(`❌ Error checking date range: ${dateError.message}`);
      return;
    }

    const oldestRecord = dateRange?.[0];
    const newestRecord = sampleRecords?.[0];

    console.log(`📅 Date range:`);
    console.log(`  Oldest record: ${oldestRecord?.CreatedAt}`);
    console.log(`  Newest record: ${newestRecord?.CreatedAt}`);
    console.log('');

    console.log('💡 Recommendations:');
    if (duplicateCount > 0) {
      console.log(`  - Clean up ${duplicateCount} duplicate records`);
    }
    if (totalCount > 50000) {
      console.log(`  - Consider archiving old records to reduce table size`);
    }
    console.log(`  - The sync will start from skip=${totalCount} to avoid reprocessing existing data`);

  } catch (error) {
    console.error('❌ Error in analysis:', error);
  }
}

analyzeCommonFields();

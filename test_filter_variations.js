#!/usr/bin/env node

// test_filter_variations.js - Test different filter variations
import 'dotenv/config';
import { fetchODataPage } from './lib/fetchFeed.js';

async function testFilterVariations() {
  try {
    console.log('🧪 Testing Different Filter Variations');
    console.log('=====================================');
    
    const filters = [
      null, // No filter
      "ResourceName eq 'Property'",
      "ImageSizeDescription eq 'Largest'",
      "ResourceName eq 'Property' and ImageSizeDescription eq 'Largest'",
      "ImageSizeDescription eq 'Largest' and ResourceName eq 'Property'"
    ];
    
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      console.log(`\n${i + 1}️⃣ Testing filter: ${filter || 'No filter'}`);
      
      try {
        const { records, error } = await fetchODataPage({
          baseUrl: process.env.IDX_MEDIA_URL,
          token: process.env.IDX_TOKEN,
          skip: 0,
          top: 10,
          filter: filter
        });
        
        if (error) {
          console.log(`❌ Error: ${error.message}`);
          continue;
        }
        
        if (!records) {
          console.log('⚠️  No records returned');
          continue;
        }
        
        console.log(`✅ Success: ${records.length} records`);
        
        if (records.length > 0) {
          const sample = records[0];
          console.log(`   Sample ResourceName: ${sample.ResourceName || 'null'}`);
          console.log(`   Sample ImageSizeDescription: ${sample.ImageSizeDescription || 'null'}`);
          console.log(`   Sample MediaCategory: ${sample.MediaCategory || 'null'}`);
        }
        
      } catch (err) {
        console.log(`❌ Exception: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testFilterVariations();

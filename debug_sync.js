#!/usr/bin/env node

// debug_sync.js - Enhanced debugging script for real estate data sync
import 'dotenv/config';

// Set debug environment variables
process.env.DEBUG_MAPPING = 'true';

console.log('🔍 Starting enhanced debugging for real estate data sync...');
console.log('📊 Debug environment variables set:');
console.log('   - DEBUG_MAPPING=true (enables detailed mapper logging)');
console.log('   - DEBUG=true (enables sync process logging)');
console.log('');

// Import sync functions
import { syncVOWComplete } from './lib/syncVow.js';
import { syncIdxComplete } from './lib/syncIdx.js';

async function runDebugSync() {
  try {
    console.log('🚀 Starting VOW sync with enhanced debugging...');
    await syncVOWComplete();
    
    console.log('\n🚀 Starting IDX sync with enhanced debugging...');
    await syncIdxComplete();
    
    console.log('\n✅ Debug sync completed successfully!');
  } catch (error) {
    console.error('\n❌ Debug sync failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug sync
runDebugSync();

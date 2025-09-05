// test-sync-progress.js - Test sync with progress tracking
import { syncService } from './api/services/syncService.js';

console.log('🚀 Testing Sync with Progress Tracking');
console.log('=====================================');

// Mock progress tracking
let progress = {
  overall: 0,
  currentTable: '',
  tables: {
    common_fields: { status: 'pending', fetched: 0, processed: 0, failed: 0 },
    residential_freehold: { status: 'pending', fetched: 0, processed: 0, failed: 0 },
    residential_condo: { status: 'pending', fetched: 0, processed: 0, failed: 0 },
    residential_lease: { status: 'pending', fetched: 0, processed: 0, failed: 0 },
    property_media: { status: 'pending', fetched: 0, processed: 0, failed: 0 },
    property_openhouse: { status: 'pending', fetched: 0, processed: 0, failed: 0 },
    property_rooms: { status: 'pending', fetched: 0, processed: 0, failed: 0 }
  }
};

function updateProgress(tableName, status, fetched = 0, processed = 0, failed = 0) {
  if (progress.tables[tableName]) {
    progress.tables[tableName] = { status, fetched, processed, failed };
  }
  
  // Calculate overall progress
  const totalTables = Object.keys(progress.tables).length;
  const completedTables = Object.values(progress.tables).filter(t => t.status === 'completed').length;
  progress.overall = Math.round((completedTables / totalTables) * 100);
  
  console.log(`📊 ${tableName}: ${status} | Fetched: ${fetched} | Processed: ${processed} | Failed: ${failed} | Overall: ${progress.overall}%`);
}

// Simulate sync progress
async function simulateSync() {
  console.log('🔄 Starting simulated sync...\n');
  
  // Simulate common_fields sync
  updateProgress('common_fields', 'in-progress');
  await new Promise(resolve => setTimeout(resolve, 1000));
  updateProgress('common_fields', 'completed', 1000, 1000, 0);
  
  // Simulate residential_freehold sync
  updateProgress('residential_freehold', 'in-progress');
  await new Promise(resolve => setTimeout(resolve, 800));
  updateProgress('residential_freehold', 'completed', 1000, 1000, 0);
  
  // Simulate residential_condo sync
  updateProgress('residential_condo', 'in-progress');
  await new Promise(resolve => setTimeout(resolve, 600));
  updateProgress('residential_condo', 'completed', 500, 500, 0);
  
  // Simulate residential_lease sync
  updateProgress('residential_lease', 'in-progress');
  await new Promise(resolve => setTimeout(resolve, 400));
  updateProgress('residential_lease', 'completed', 200, 200, 0);
  
  // Simulate property_media sync
  updateProgress('property_media', 'in-progress');
  await new Promise(resolve => setTimeout(resolve, 1200));
  updateProgress('property_media', 'completed', 2000, 2000, 0);
  
  // Simulate property_openhouse sync
  updateProgress('property_openhouse', 'in-progress');
  await new Promise(resolve => setTimeout(resolve, 300));
  updateProgress('property_openhouse', 'completed', 50, 50, 0);
  
  // Simulate property_rooms sync
  updateProgress('property_rooms', 'in-progress');
  await new Promise(resolve => setTimeout(resolve, 500));
  updateProgress('property_rooms', 'completed', 100, 100, 0);
  
  console.log('\n✅ Sync completed successfully!');
  console.log(`📈 Final Progress: ${progress.overall}%`);
  console.log('📊 Summary:');
  Object.entries(progress.tables).forEach(([table, data]) => {
    console.log(`   ${table}: ${data.fetched} fetched, ${data.processed} processed, ${data.failed} failed`);
  });
}

// Run the simulation
simulateSync().catch(console.error);

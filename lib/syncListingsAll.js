// lib/syncListingsAll.js - Combined IDX + VOW Sync with Cron
import 'dotenv/config';
import cron from 'node-cron';
import { syncListingsIdx } from './syncListingsIdx.js';
import { syncListingsVow } from './syncListingsVow.js';

async function syncAll(testMode = false, incrementalMode = false) {
  const startTime = new Date();
  console.log(`🚀 Starting complete MLS sync (${testMode ? 'test' : incrementalMode ? 'incremental' : 'full'} mode)`);

  try {
    // Sync IDX first (active listings)
    console.log('\n📊 Running IDX sync...');
    await syncListingsIdx(testMode, incrementalMode);
    console.log('✅ IDX sync completed');

    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Sync VOW (sold properties)
    console.log('\n📊 Running VOW sync...');
    await syncListingsVow(testMode, incrementalMode);
    console.log('✅ VOW sync completed');

    const duration = Math.round((new Date() - startTime) / 1000);
    console.log(`\n🎯 Complete sync finished successfully in ${duration}s`);

  } catch (error) {
    console.error(`❌ Sync failed: ${error.message}`);
    throw error;
  }
}

// Cron job - runs every 2 hours
function startCronJob() {
  console.log('🕐 Starting cron job - runs every 2 hours');
  
  cron.schedule('0 */2 * * *', async () => {
    console.log(`\n🕐 Cron triggered at ${new Date().toISOString()}`);
    try {
      await syncAll(false, true); // Incremental sync every 2 hours
    } catch (error) {
      console.error('🕐 Cron sync failed:', error.message);
    }
  });

  console.log('🕐 Cron scheduler started. Press Ctrl+C to exit.');
}

export { syncAll };

// Command line execution
if (process.argv[1] && process.argv[1].endsWith('syncListingsAll.js')) {
  const args = process.argv.slice(2);
  
  if (args.includes('--cron')) {
    startCronJob();
  } else {
    const testMode = args.includes('--test');
    const incrementalMode = args.includes('--incremental');
    
    syncAll(testMode, incrementalMode)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}
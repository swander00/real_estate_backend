#!/usr/bin/env node
// scripts/backfill.js - Database backfill script
import { syncService } from '../api/services/syncService.js';
import { environmentValidator } from '../config/validation.js';

const PROVIDERS = ['idx', 'vow'];
const TYPES = ['full', 'incremental'];

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('🚀 Real Estate Backend - Database Backfill Tool');
  console.log('===============================================\n');

  try {
    // Validate environment
    console.log('🔍 Validating environment configuration...');
    environmentValidator.validate();
    console.log('✅ Environment validation passed\n');

    // Initialize sync service
    console.log('🔧 Initializing sync service...');
    await syncService.initialize();
    console.log('✅ Sync service initialized\n');

    // Parse command line arguments
    const providers = options.providers || PROVIDERS;
    const type = options.type || 'full';
    const force = options.force || false;

    console.log('📋 Backfill Configuration:');
    console.log(`   Providers: ${providers.join(', ')}`);
    console.log(`   Type: ${type}`);
    console.log(`   Force: ${force}`);
    console.log('');

    // Validate providers
    const invalidProviders = providers.filter(p => !PROVIDERS.includes(p));
    if (invalidProviders.length > 0) {
      throw new Error(`Invalid providers: ${invalidProviders.join(', ')}. Valid providers: ${PROVIDERS.join(', ')}`);
    }

    // Validate type
    if (!TYPES.includes(type)) {
      throw new Error(`Invalid type: ${type}. Valid types: ${TYPES.join(', ')}`);
    }

    // Check if providers are configured
    for (const provider of providers) {
      const urlVar = `${provider.toUpperCase()}_API_URL`;
      const keyVar = `${provider.toUpperCase()}_API_KEY`;
      
      if (!process.env[urlVar] || !process.env[keyVar]) {
        console.warn(`⚠️  ${provider.toUpperCase()} API not configured (${urlVar}, ${keyVar})`);
      }
    }

    console.log('🚀 Starting backfill process...\n');

    // Trigger sync jobs
    const jobIds = [];
    for (const provider of providers) {
      console.log(`📡 Triggering ${type} sync for ${provider.toUpperCase()}...`);
      
      const jobId = await syncService.triggerSync(provider, {
        incremental: type === 'incremental',
        force,
        isBackfill: true,
        requestedBy: 'backfill-script'
      });

      jobIds.push(jobId);
      console.log(`   Job ID: ${jobId}`);
    }

    console.log(`\n✅ Backfill jobs triggered successfully!`);
    console.log(`📊 Job IDs: ${jobIds.join(', ')}`);
    console.log(`\n🔍 Monitor progress:`);
    console.log(`   API: GET /api/sync/status`);
    console.log(`   Dashboard: http://localhost:${process.env.PORT || 3000}/dashboard.html`);
    console.log(`\n📝 Individual job details:`);
    for (const jobId of jobIds) {
      console.log(`   GET /api/sync/job/${jobId}`);
    }

  } catch (error) {
    console.error(`\n❌ Backfill failed: ${error.message}`);
    process.exit(1);
  }
}

function parseArgs(args) {
  const options = {
    providers: null,
    type: null,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--providers':
      case '-p':
        if (i + 1 < args.length) {
          options.providers = args[i + 1].split(',').map(p => p.trim().toLowerCase());
          i++;
        }
        break;
        
      case '--type':
      case '-t':
        if (i + 1 < args.length) {
          options.type = args[i + 1].toLowerCase();
          i++;
        }
        break;
        
      case '--force':
      case '-f':
        options.force = true;
        break;
        
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
        
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          showHelp();
          process.exit(1);
        }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Usage: node scripts/backfill.js [options]

Options:
  -p, --providers <list>    Comma-separated list of providers (idx,vow)
  -t, --type <type>         Sync type: full or incremental (default: full)
  -f, --force              Force sync even if data exists
  -h, --help               Show this help message

Examples:
  node scripts/backfill.js                           # Full backfill for both providers
  node scripts/backfill.js -p idx -t full            # Full backfill for IDX only
  node scripts/backfill.js -p vow -t incremental     # Incremental sync for VOW only
  node scripts/backfill.js -p idx,vow -f             # Force full backfill for both

Environment Variables Required:
  SUPABASE_URL              Supabase project URL
  SUPABASE_ANON_KEY         Supabase anonymous key
  SUPABASE_SERVICE_ROLE_KEY Supabase service role key (optional)
  IDX_API_URL               IDX API endpoint URL
  IDX_API_KEY               IDX API authentication key
  VOW_API_URL               VOW API endpoint URL
  VOW_API_KEY               VOW API authentication key
`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Backfill interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Backfill terminated');
  process.exit(0);
});

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

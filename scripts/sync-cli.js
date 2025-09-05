#!/usr/bin/env node
// scripts/sync-cli.js - Sync management CLI
import { syncService } from '../api/services/syncService.js';
import { syncScheduler } from '../api/services/syncScheduler.js';
import { environmentValidator } from '../config/validation.js';

const COMMANDS = ['status', 'trigger', 'cancel', 'stats', 'scheduler', 'help'];

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0].toLowerCase();
  
  if (!COMMANDS.includes(command)) {
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }

  try {
    // Validate environment
    console.log('🔍 Validating environment...');
    environmentValidator.validate();
    console.log('✅ Environment validation passed\n');

    // Initialize sync service
    await syncService.initialize();

    switch (command) {
      case 'status':
        await handleStatus(args.slice(1));
        break;
      case 'trigger':
        await handleTrigger(args.slice(1));
        break;
      case 'cancel':
        await handleCancel(args.slice(1));
        break;
      case 'stats':
        await handleStats(args.slice(1));
        break;
      case 'scheduler':
        await handleScheduler(args.slice(1));
        break;
      case 'help':
        showHelp();
        break;
    }

  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    process.exit(1);
  }
}

async function handleStatus(args) {
  const options = parseStatusArgs(args);
  const status = await syncService.getSyncStatus(options.provider, options.limit);
  
  console.log('📊 Sync Status');
  console.log('==============\n');
  
  // Active jobs
  if (status.active && status.active.length > 0) {
    console.log('🔄 Active Jobs:');
    for (const job of status.active) {
      const duration = job.started_at ? 
        Math.round((Date.now() - new Date(job.started_at)) / 1000) : 0;
      console.log(`   ${job.provider.toUpperCase()} ${job.type} - ${job.status} (${duration}s)`);
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Progress: ${job.progress}%`);
      if (job.records_processed > 0) {
        console.log(`   Records: ${job.records_processed} processed, ${job.records_created} created, ${job.records_updated} updated`);
      }
      console.log('');
    }
  } else {
    console.log('✅ No active sync jobs\n');
  }
  
  // Recent jobs
  if (status.recent && status.recent.length > 0) {
    console.log('📋 Recent Jobs:');
    for (const job of status.recent.slice(0, 5)) {
      const timeAgo = Math.round((Date.now() - new Date(job.created_at)) / 1000 / 60);
      console.log(`   ${job.provider.toUpperCase()} ${job.type} - ${job.status} (${timeAgo}m ago)`);
      if (job.error_message) {
        console.log(`   Error: ${job.error_message}`);
      }
    }
    console.log('');
  }
  
  // Summary
  console.log('📈 Summary:');
  console.log(`   Active jobs: ${status.summary.totalActive}`);
  console.log(`   Recent jobs: ${status.summary.totalRecent}`);
  if (status.summary.lastSync) {
    const lastSync = status.summary.lastSync;
    const timeAgo = Math.round((Date.now() - new Date(lastSync.created_at)) / 1000 / 60);
    console.log(`   Last sync: ${lastSync.provider.toUpperCase()} ${lastSync.type} (${timeAgo}m ago)`);
  }
}

async function handleTrigger(args) {
  const options = parseTriggerArgs(args);
  
  console.log(`🚀 Triggering ${options.type} sync for ${options.providers.join(', ')}...\n`);
  
  const jobIds = [];
  for (const provider of options.providers) {
    const jobId = await syncService.triggerSync(provider, {
      incremental: options.type === 'incremental',
      force: options.force,
      requestedBy: 'sync-cli'
    });
    
    jobIds.push(jobId);
    console.log(`✅ ${provider.toUpperCase()} sync triggered (Job: ${jobId})`);
  }
  
  console.log(`\n📊 Monitor progress:`);
  console.log(`   node scripts/sync-cli.js status`);
  console.log(`   API: GET /api/sync/status`);
}

async function handleCancel(args) {
  if (args.length === 0) {
    console.error('❌ Job ID required');
    console.log('Usage: node scripts/sync-cli.js cancel <job-id>');
    process.exit(1);
  }
  
  const jobId = args[0];
  const cancelled = await syncService.cancelJob(jobId, 'sync-cli');
  
  if (cancelled) {
    console.log(`✅ Job ${jobId} cancelled successfully`);
  } else {
    console.log(`❌ Job ${jobId} not found or cannot be cancelled`);
  }
}

async function handleStats(args) {
  const options = parseStatsArgs(args);
  const stats = await syncService.getSyncStats(options.days);
  
  console.log(`📊 Sync Statistics (Last ${options.days} days)`);
  console.log('=====================================\n');
  
  console.log(`Total Jobs: ${stats.total}`);
  console.log(`Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`Average Duration: ${Math.round(stats.averageDuration / 1000)}s\n`);
  
  if (Object.keys(stats.byStatus).length > 0) {
    console.log('By Status:');
    for (const [status, count] of Object.entries(stats.byStatus)) {
      console.log(`   ${status}: ${count}`);
    }
    console.log('');
  }
  
  if (Object.keys(stats.byProvider).length > 0) {
    console.log('By Provider:');
    for (const [provider, count] of Object.entries(stats.byProvider)) {
      console.log(`   ${provider.toUpperCase()}: ${count}`);
    }
    console.log('');
  }
  
  if (Object.keys(stats.byType).length > 0) {
    console.log('By Type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`   ${type}: ${count}`);
    }
    console.log('');
  }
  
  console.log('Records Processed:');
  console.log(`   Total: ${stats.totalRecords.processed}`);
  console.log(`   Created: ${stats.totalRecords.created}`);
  console.log(`   Updated: ${stats.totalRecords.updated}`);
  console.log(`   Skipped: ${stats.totalRecords.skipped}`);
}

async function handleScheduler(args) {
  if (args.length === 0) {
    const status = syncScheduler.getStatus();
    console.log('⏰ Sync Scheduler Status');
    console.log('========================\n');
    console.log(`Running: ${status.isRunning}`);
    console.log(`Tasks: ${status.tasks.join(', ')}`);
    console.log('\nSchedule:');
    for (const [task, schedule] of Object.entries(status.schedule)) {
      console.log(`   ${task}: ${schedule}`);
    }
    return;
  }
  
  const subcommand = args[0].toLowerCase();
  
  switch (subcommand) {
    case 'start':
      await syncScheduler.initialize();
      console.log('✅ Sync scheduler started');
      break;
    case 'stop':
      await syncScheduler.stop();
      console.log('✅ Sync scheduler stopped');
      break;
    case 'status':
      const status = syncScheduler.getStatus();
      console.log(`Scheduler running: ${status.isRunning}`);
      break;
    default:
      console.error(`❌ Unknown scheduler command: ${subcommand}`);
      console.log('Available commands: start, stop, status');
  }
}

function parseStatusArgs(args) {
  const options = { provider: null, limit: 10 };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--provider' || arg === '-p') {
      if (i + 1 < args.length) {
        options.provider = args[i + 1].toLowerCase();
        i++;
      }
    } else if (arg === '--limit' || arg === '-l') {
      if (i + 1 < args.length) {
        options.limit = parseInt(args[i + 1]);
        i++;
      }
    }
  }
  
  return options;
}

function parseTriggerArgs(args) {
  const options = { 
    providers: ['idx', 'vow'], 
    type: 'incremental', 
    force: false 
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--providers' || arg === '-p') {
      if (i + 1 < args.length) {
        options.providers = args[i + 1].split(',').map(p => p.trim().toLowerCase());
        i++;
      }
    } else if (arg === '--type' || arg === '-t') {
      if (i + 1 < args.length) {
        options.type = args[i + 1].toLowerCase();
        i++;
      }
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    }
  }
  
  return options;
}

function parseStatsArgs(args) {
  const options = { days: 7 };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--days' || arg === '-d') {
      if (i + 1 < args.length) {
        options.days = parseInt(args[i + 1]);
        i++;
      }
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
🔄 Real Estate Backend - Sync Management CLI

Usage: node scripts/sync-cli.js <command> [options]

Commands:
  status [options]           Show sync status and active jobs
  trigger [options]          Trigger sync jobs
  cancel <job-id>           Cancel a running sync job
  stats [options]           Show sync statistics
  scheduler [command]       Manage sync scheduler
  help                      Show this help message

Status Options:
  -p, --provider <provider> Filter by provider (idx, vow)
  -l, --limit <number>      Limit number of recent jobs (default: 10)

Trigger Options:
  -p, --providers <list>    Comma-separated providers (idx,vow)
  -t, --type <type>         Sync type: incremental or full (default: incremental)
  -f, --force              Force sync even if data exists

Stats Options:
  -d, --days <number>       Number of days to include (default: 7)

Scheduler Commands:
  start                    Start the sync scheduler
  stop                     Stop the sync scheduler
  status                   Show scheduler status

Examples:
  node scripts/sync-cli.js status
  node scripts/sync-cli.js trigger -p idx -t full
  node scripts/sync-cli.js trigger -p idx,vow -t incremental
  node scripts/sync-cli.js cancel abc123-def456-ghi789
  node scripts/sync-cli.js stats -d 30
  node scripts/sync-cli.js scheduler start
`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Sync CLI interrupted');
  process.exit(0);
});

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

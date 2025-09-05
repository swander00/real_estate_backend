// api/services/syncScheduler.js - Incremental sync scheduler
import cron from 'node-cron';
import { syncService } from './syncService.js';

class SyncScheduler {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
    this.scheduleConfig = {
      // Default schedule: every 15 minutes
      incremental: '*/15 * * * *',
      // Full sync: daily at 2 AM
      full: '0 2 * * *',
      // Health check: every 5 minutes
      health: '*/5 * * * *'
    };
  }

  async initialize() {
    if (this.isRunning) return;

    try {
      console.log('🕐 Initializing sync scheduler...');
      
      // Load configuration from environment
      this.loadScheduleConfig();
      
      // Start scheduled tasks
      await this.startScheduledTasks();
      
      this.isRunning = true;
      console.log('✅ Sync scheduler initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize sync scheduler:', error.message);
      throw error;
    }
  }

  loadScheduleConfig() {
    // Load from environment variables if available
    if (process.env.SYNC_INCREMENTAL_SCHEDULE) {
      this.scheduleConfig.incremental = process.env.SYNC_INCREMENTAL_SCHEDULE;
    }
    
    if (process.env.SYNC_FULL_SCHEDULE) {
      this.scheduleConfig.full = process.env.SYNC_FULL_SCHEDULE;
    }
    
    if (process.env.SYNC_HEALTH_SCHEDULE) {
      this.scheduleConfig.health = process.env.SYNC_HEALTH_SCHEDULE;
    }

    console.log('📅 Schedule configuration:');
    console.log(`   Incremental: ${this.scheduleConfig.incremental}`);
    console.log(`   Full: ${this.scheduleConfig.full}`);
    console.log(`   Health: ${this.scheduleConfig.health}`);
  }

  async startScheduledTasks() {
    // Initialize sync service
    await syncService.initialize();

    // Schedule incremental syncs
    this.scheduleIncrementalSyncs();
    
    // Schedule full syncs
    this.scheduleFullSyncs();
    
    // Schedule health checks
    this.scheduleHealthChecks();
  }

  scheduleIncrementalSyncs() {
    const task = cron.schedule(this.scheduleConfig.incremental, async () => {
      console.log('🔄 Running scheduled incremental sync...');
      
      try {
        // Check if any sync jobs are already running
        const activeJobs = Array.from(syncService.activeJobs.values());
        const runningJobs = activeJobs.filter(job => job.status === 'running');
        
        if (runningJobs.length > 0) {
          console.log(`⏸️  Skipping incremental sync - ${runningJobs.length} jobs already running`);
          return;
        }

        // Trigger incremental syncs for both providers
        const providers = ['idx', 'vow'];
        const jobIds = [];

        for (const provider of providers) {
          // Check if provider is configured
          const urlVar = `${provider.toUpperCase()}_API_URL`;
          const keyVar = `${provider.toUpperCase()}_API_KEY`;
          
          if (!process.env[urlVar] || !process.env[keyVar]) {
            console.log(`⏭️  Skipping ${provider.toUpperCase()} - not configured`);
            continue;
          }

          const jobId = await syncService.triggerSync(provider, {
            incremental: true,
            force: false,
            requestedBy: 'scheduler',
            isBackfill: false
          });

          jobIds.push(jobId);
          console.log(`📡 Triggered incremental sync for ${provider.toUpperCase()} (Job: ${jobId})`);
        }

        if (jobIds.length > 0) {
          console.log(`✅ Scheduled incremental sync completed - ${jobIds.length} jobs triggered`);
        } else {
          console.log('ℹ️  No providers configured for incremental sync');
        }

      } catch (error) {
        console.error('❌ Scheduled incremental sync failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: process.env.TZ || 'UTC'
    });

    this.tasks.set('incremental', task);
    task.start();
    console.log('✅ Incremental sync scheduled');
  }

  scheduleFullSyncs() {
    const task = cron.schedule(this.scheduleConfig.full, async () => {
      console.log('🔄 Running scheduled full sync...');
      
      try {
        // Check if any sync jobs are already running
        const activeJobs = Array.from(syncService.activeJobs.values());
        const runningJobs = activeJobs.filter(job => job.status === 'running');
        
        if (runningJobs.length > 0) {
          console.log(`⏸️  Skipping full sync - ${runningJobs.length} jobs already running`);
          return;
        }

        // Trigger full syncs for both providers
        const providers = ['idx', 'vow'];
        const jobIds = [];

        for (const provider of providers) {
          // Check if provider is configured
          const urlVar = `${provider.toUpperCase()}_API_URL`;
          const keyVar = `${provider.toUpperCase()}_API_KEY`;
          
          if (!process.env[urlVar] || !process.env[keyVar]) {
            console.log(`⏭️  Skipping ${provider.toUpperCase()} - not configured`);
            continue;
          }

          const jobId = await syncService.triggerSync(provider, {
            incremental: false,
            force: false,
            requestedBy: 'scheduler',
            isBackfill: false
          });

          jobIds.push(jobId);
          console.log(`📡 Triggered full sync for ${provider.toUpperCase()} (Job: ${jobId})`);
        }

        if (jobIds.length > 0) {
          console.log(`✅ Scheduled full sync completed - ${jobIds.length} jobs triggered`);
        } else {
          console.log('ℹ️  No providers configured for full sync');
        }

      } catch (error) {
        console.error('❌ Scheduled full sync failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: process.env.TZ || 'UTC'
    });

    this.tasks.set('full', task);
    task.start();
    console.log('✅ Full sync scheduled');
  }

  scheduleHealthChecks() {
    const task = cron.schedule(this.scheduleConfig.health, async () => {
      try {
        // Check sync service health
        const status = await syncService.getSyncStatus();
        const activeJobs = status.active || [];
        
        // Log health status
        if (activeJobs.length > 0) {
          console.log(`💚 Sync health check - ${activeJobs.length} active jobs`);
        }

        // Check for stuck jobs (running for more than 2 hours)
        const stuckJobs = activeJobs.filter(job => {
          if (job.status !== 'running') return false;
          
          const startTime = new Date(job.started_at || job.created_at);
          const now = new Date();
          const hoursRunning = (now - startTime) / (1000 * 60 * 60);
          
          return hoursRunning > 2;
        });

        if (stuckJobs.length > 0) {
          console.warn(`⚠️  Found ${stuckJobs.length} potentially stuck jobs:`, 
            stuckJobs.map(job => `${job.provider}:${job.id}`).join(', '));
        }

      } catch (error) {
        console.error('❌ Sync health check failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: process.env.TZ || 'UTC'
    });

    this.tasks.set('health', task);
    task.start();
    console.log('✅ Health check scheduled');
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping sync scheduler...');
    
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`   Stopped ${name} task`);
    }
    
    this.tasks.clear();
    this.isRunning = false;
    console.log('✅ Sync scheduler stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      tasks: Array.from(this.tasks.keys()),
      schedule: this.scheduleConfig
    };
  }

  updateSchedule(taskName, newSchedule) {
    if (!this.tasks.has(taskName)) {
      throw new Error(`Task ${taskName} not found`);
    }

    const task = this.tasks.get(taskName);
    task.stop();
    
    // Update schedule config
    this.scheduleConfig[taskName] = newSchedule;
    
    // Restart task with new schedule
    if (taskName === 'incremental') {
      this.scheduleIncrementalSyncs();
    } else if (taskName === 'full') {
      this.scheduleFullSyncs();
    } else if (taskName === 'health') {
      this.scheduleHealthChecks();
    }
    
    console.log(`✅ Updated ${taskName} schedule to: ${newSchedule}`);
  }
}

export const syncScheduler = new SyncScheduler();

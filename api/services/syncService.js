// api/services/syncService.js - Data synchronization service
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { syncIdxComplete } from '../../lib/syncIdx.js';
import { syncVOWComplete } from '../../lib/syncVow.js';
import { cacheService } from './cacheService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

class SyncService {
  constructor() {
    this.activeJobs = new Map();
    this.syncHistory = [];
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create sync_jobs table if it doesn't exist
      await this.createSyncJobsTable();
      
      // Load active jobs from database
      await this.loadActiveJobs();
      
      this.isInitialized = true;
      console.log('Sync service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize sync service:', error.message);
      throw error;
    }
  }

  async createSyncJobsTable() {
    const { error } = await supabase.rpc('create_sync_jobs_table');
    if (error && !error.message.includes('already exists')) {
      console.warn('Could not create sync_jobs table:', error.message);
    }
  }

  async loadActiveJobs() {
    try {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load active jobs:', error.message);
        return;
      }

      for (const job of data || []) {
        this.activeJobs.set(job.id, {
          ...job,
          startTime: new Date(job.created_at)
        });
      }

      console.log(`Loaded ${this.activeJobs.size} active sync jobs`);
    } catch (error) {
      console.warn('Error loading active jobs:', error.message);
    }
  }

  async triggerSync(provider, options = {}) {
    const {
      incremental = false,
      force = false,
      userId = null,
      requestedBy = null,
      isBackfill = false
    } = options;

    const jobId = uuidv4();
    const job = {
      id: jobId,
      provider,
      type: isBackfill ? 'backfill' : (incremental ? 'incremental' : 'full'),
      status: 'queued',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      user_id: userId,
      requested_by: requestedBy,
      force,
      progress: 0,
      records_processed: 0,
      records_created: 0,
      records_updated: 0,
      records_skipped: 0,
      error_message: null,
      metadata: {}
    };

    // Store job in database
    try {
      const { error } = await supabase
        .from('sync_jobs')
        .insert([job]);

      if (error) {
        throw new Error(`Failed to create sync job: ${error.message}`);
      }
    } catch (error) {
      console.error('Database error creating sync job:', error.message);
      // Fallback to in-memory storage
    }

    // Store in active jobs
    this.activeJobs.set(jobId, job);

    // Start sync process asynchronously
    this.executeSync(jobId).catch(error => {
      console.error(`Sync job ${jobId} failed:`, error.message);
    });

    return jobId;
  }

  async executeSync(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      console.error(`Sync job ${jobId} not found`);
      return;
    }

    try {
      // Update job status to running
      await this.updateJobStatus(jobId, 'running', { started_at: new Date().toISOString() });

      console.log(`🚀 Starting ${job.type} sync for ${job.provider} (Job: ${jobId})`);

      let result;
      if (job.provider === 'idx') {
        result = await this.syncIdx(job);
      } else if (job.provider === 'vow') {
        result = await this.syncVow(job);
      } else {
        throw new Error(`Unknown provider: ${job.provider}`);
      }

      // Update job with results
      await this.updateJobStatus(jobId, 'completed', {
        completed_at: new Date().toISOString(),
        progress: 100,
        records_processed: result.recordsProcessed || 0,
        records_created: result.recordsCreated || 0,
        records_updated: result.recordsUpdated || 0,
        records_skipped: result.recordsSkipped || 0,
        metadata: result.metadata || {}
      });

      console.log(`✅ ${job.type} sync completed for ${job.provider} (Job: ${jobId})`);

      // Invalidate relevant caches
      await this.invalidateCaches(job.provider);

    } catch (error) {
      console.error(`❌ Sync job ${jobId} failed:`, error.message);
      
      await this.updateJobStatus(jobId, 'failed', {
        completed_at: new Date().toISOString(),
        error_message: error.message
      });
    } finally {
      // Remove from active jobs
      this.activeJobs.delete(jobId);
    }
  }

  async syncIdx(job) {
    const startTime = Date.now();
    
    try {
      // Set environment variables for sync
      process.env.IDX_URL = process.env.IDX_API_URL;
      process.env.IDX_TOKEN = process.env.IDX_API_KEY;

      // Execute IDX sync and get progress data
      const result = await syncIdxComplete();

      const duration = Date.now() - startTime;
      
      return {
        recordsProcessed: result.recordsProcessed || 0,
        recordsCreated: result.recordsCreated || 0,
        recordsUpdated: result.recordsUpdated || 0,
        recordsSkipped: result.recordsSkipped || 0,
        metadata: {
          duration: duration,
          type: job.type,
          force: job.force
        }
      };
    } catch (error) {
      throw new Error(`IDX sync failed: ${error.message}`);
    }
  }

  async syncVow(job) {
    const startTime = Date.now();
    
    try {
      // Set environment variables for sync
      process.env.VOW_URL = process.env.VOW_API_URL;
      process.env.VOW_TOKEN = process.env.VOW_API_KEY;

      // Execute VOW sync and get progress data
      const result = await syncVOWComplete();

      const duration = Date.now() - startTime;
      
      return {
        recordsProcessed: result.recordsProcessed || 0,
        recordsCreated: result.recordsCreated || 0,
        recordsUpdated: result.recordsUpdated || 0,
        recordsSkipped: result.recordsSkipped || 0,
        metadata: {
          duration: duration,
          type: job.type,
          force: job.force
        }
      };
    } catch (error) {
      throw new Error(`VOW sync failed: ${error.message}`);
    }
  }

  async updateJobStatus(jobId, status, updates = {}) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      Object.assign(job, updates, { status });
    }

    try {
      const { error } = await supabase
        .from('sync_jobs')
        .update({ status, ...updates })
        .eq('id', jobId);

      if (error) {
        console.warn(`Failed to update job ${jobId} status:`, error.message);
      }
    } catch (error) {
      console.warn(`Database error updating job ${jobId}:`, error.message);
    }
  }

  async invalidateCaches(provider) {
    try {
      const cacheKeys = [
        `property:${provider}`,
        `property:list`,
        `property:popular`,
        `member:active`,
        `office:list`
      ];

      for (const key of cacheKeys) {
        await cacheService.invalidate(key);
      }

      console.log(`Cache invalidated for ${provider} sync`);
    } catch (error) {
      console.warn('Cache invalidation failed:', error.message);
    }
  }

  async getSyncStatus(provider = null, limit = 10) {
    try {
      let query = supabase
        .from('sync_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Failed to fetch sync status:', error.message);
        return this.getFallbackStatus();
      }

      const activeJobs = Array.from(this.activeJobs.values());
      const recentJobs = data || [];

      return {
        active: activeJobs,
        recent: recentJobs,
        summary: {
          totalActive: activeJobs.length,
          totalRecent: recentJobs.length,
          lastSync: recentJobs[0] || null
        }
      };
    } catch (error) {
      console.warn('Error getting sync status:', error.message);
      return this.getFallbackStatus();
    }
  }

  getFallbackStatus() {
    const activeJobs = Array.from(this.activeJobs.values());
    return {
      active: activeJobs,
      recent: this.syncHistory.slice(0, 10),
      summary: {
        totalActive: activeJobs.length,
        totalRecent: this.syncHistory.length,
        lastSync: this.syncHistory[0] || null
      }
    };
  }

  async getJobDetails(jobId) {
    // Check active jobs first
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      return activeJob;
    }

    // Check database
    try {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Error fetching job details:', error.message);
      return null;
    }
  }

  async cancelJob(jobId, userId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'running') {
      // For now, we can't actually cancel a running sync
      // In production, you'd implement proper job cancellation
      console.warn(`Cannot cancel running job ${jobId}`);
      return false;
    }

    if (job.status === 'queued') {
      await this.updateJobStatus(jobId, 'cancelled', {
        completed_at: new Date().toISOString(),
        cancelled_by: userId
      });
      
      this.activeJobs.delete(jobId);
      return true;
    }

    return false;
  }

  async stopAllSyncs(userId) {
    const stoppedJobs = [];
    let stoppedCount = 0;

    // Get all active jobs
    const activeJobs = Array.from(this.activeJobs.values());
    
    for (const job of activeJobs) {
      if (job.status === 'running' || job.status === 'queued') {
        try {
          // Mark job as cancelled
          await this.updateJobStatus(job.id, 'cancelled', {
            completed_at: new Date().toISOString(),
            cancelled_by: userId,
            cancellation_reason: 'Stopped by user via dashboard'
          });

          // Remove from active jobs
          this.activeJobs.delete(job.id);
          
          stoppedJobs.push({
            jobId: job.id,
            provider: job.provider,
            type: job.type,
            status: 'cancelled'
          });
          
          stoppedCount++;
          
          console.log(`🛑 Stopped sync job ${job.id} (${job.provider} ${job.type})`);
          
        } catch (error) {
          console.error(`Failed to stop job ${job.id}:`, error.message);
        }
      }
    }

    // Also try to stop any running sync processes
    // This is a more aggressive approach that can interrupt running syncs
    if (stoppedCount > 0) {
      console.log(`🛑 Emergency stop: Interrupting any running sync processes...`);
      
      // Set a global flag that sync processes can check
      global.SYNC_STOP_REQUESTED = true;
      
      // Clear the flag after a short delay
      setTimeout(() => {
        global.SYNC_STOP_REQUESTED = false;
      }, 5000);
    }

    return {
      stoppedCount,
      stoppedJobs,
      message: `Stopped ${stoppedCount} sync operations`
    };
  }

  async getSyncStats(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch sync stats:', error.message);
        return this.getFallbackStats();
      }

      const jobs = data || [];
      const stats = {
        total: jobs.length,
        byStatus: {},
        byProvider: {},
        byType: {},
        totalRecords: {
          processed: 0,
          created: 0,
          updated: 0,
          skipped: 0
        },
        averageDuration: 0,
        successRate: 0
      };

      let totalDuration = 0;
      let completedJobs = 0;

      for (const job of jobs) {
        // Count by status
        stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;
        
        // Count by provider
        stats.byProvider[job.provider] = (stats.byProvider[job.provider] || 0) + 1;
        
        // Count by type
        stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;

        // Sum records
        stats.totalRecords.processed += job.records_processed || 0;
        stats.totalRecords.created += job.records_created || 0;
        stats.totalRecords.updated += job.records_updated || 0;
        stats.totalRecords.skipped += job.records_skipped || 0;

        // Calculate duration
        if (job.started_at && job.completed_at) {
          const duration = new Date(job.completed_at) - new Date(job.started_at);
          totalDuration += duration;
          completedJobs++;
        }
      }

      if (completedJobs > 0) {
        stats.averageDuration = totalDuration / completedJobs;
      }

      const successfulJobs = stats.byStatus.completed || 0;
      stats.successRate = stats.total > 0 ? (successfulJobs / stats.total) * 100 : 0;

      return stats;
    } catch (error) {
      console.warn('Error getting sync stats:', error.message);
      return this.getFallbackStats();
    }
  }

  getFallbackStats() {
    return {
      total: 0,
      byStatus: {},
      byProvider: {},
      byType: {},
      totalRecords: {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0
      },
      averageDuration: 0,
      successRate: 0
    };
  }
}

export const syncService = new SyncService();

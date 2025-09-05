// api/routes/sync.js - Data synchronization routes
import express from 'express';
import { ValidationError } from '../middleware/errorHandler.js';
import { syncService } from '../services/syncService.js';
import { authenticateJWT, authenticateFlexible, requirePermission } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/sync
 * Get sync service information and available endpoints
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Real Estate Backend Sync Service',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: 'GET /api/sync/test - Test endpoint (no auth required)',
      status: 'GET /api/sync/status - Get sync status and history',
      stats: 'GET /api/sync/stats - Get sync statistics',
      backfill: 'POST /api/sync/backfill - Trigger complete backfill (auth required)',
      idx: 'POST /api/sync/idx - Trigger IDX sync (auth required)',
      vow: 'POST /api/sync/vow - Trigger VOW sync (auth required)',
      job: 'GET /api/sync/job/:jobId - Get specific job details (auth required)',
      cancel: 'POST /api/sync/job/:jobId/cancel - Cancel running job (auth required)',
      stopAll: 'POST /api/sync/stop-all - Stop all running sync operations (auth required)'
    },
    authentication: {
      required: 'Most endpoints require JWT authentication with admin permissions',
      testEndpoint: '/api/sync/test - No authentication required for testing'
    }
  });
});

/**
 * POST /api/sync/idx
 * Trigger IDX synchronization
 */
router.post('/idx', authenticateFlexible, requirePermission('admin'), async (req, res, next) => {
  try {
    const { incremental = false, force = false } = req.body;

    // Validate environment
    if (!process.env.IDX_API_URL || !process.env.IDX_API_KEY) {
      throw new ValidationError('IDX API configuration is missing');
    }

    // Trigger sync job
    const jobId = await syncService.triggerSync('idx', {
      incremental,
      force,
      userId: req.user.id,
      requestedBy: req.user.email
    });

    res.json({
      message: 'IDX sync triggered successfully',
      jobId,
      incremental,
      status: 'queued',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/vow
 * Trigger VOW synchronization
 */
router.post('/vow', authenticateFlexible, requirePermission('admin'), async (req, res, next) => {
  try {
    const { incremental = false, force = false } = req.body;

    // Validate environment
    if (!process.env.VOW_API_URL || !process.env.VOW_API_KEY) {
      throw new ValidationError('VOW API configuration is missing');
    }

    // Trigger sync job
    const jobId = await syncService.triggerSync('vow', {
      incremental,
      force,
      userId: req.user.id,
      requestedBy: req.user.email
    });

    res.json({
      message: 'VOW sync triggered successfully',
      jobId,
      incremental,
      status: 'queued',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/backfill
 * Trigger complete backfill for both IDX and VOW
 */
router.post('/backfill', authenticateFlexible, requirePermission('admin'), async (req, res, next) => {
  try {
    const { providers = ['idx', 'vow'], force = false } = req.body;

    // Validate providers
    const validProviders = ['idx', 'vow'];
    const invalidProviders = providers.filter(p => !validProviders.includes(p));
    if (invalidProviders.length > 0) {
      throw new ValidationError(`Invalid providers: ${invalidProviders.join(', ')}`);
    }

    // Trigger backfill jobs
    const jobIds = [];
    for (const provider of providers) {
      const jobId = await syncService.triggerSync(provider, {
        incremental: false,
        force,
        userId: req.user.id,
        requestedBy: req.user.email,
        isBackfill: true
      });
      jobIds.push(jobId);
    }

    res.json({
      message: 'Backfill triggered successfully',
      jobIds,
      providers,
      status: 'queued',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/status
 * Get sync status and history
 */
router.get('/status', async (req, res, next) => {
  try {
    const { provider, limit = 10 } = req.query;
    
    const status = await syncService.getSyncStatus(provider, parseInt(limit));

    res.json({
      data: status
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/job/:jobId
 * Get specific sync job details
 */
router.get('/job/:jobId', authenticateJWT, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    const job = await syncService.getJobDetails(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Sync job not found'
      });
    }

    res.json({
      data: job
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/job/:jobId/cancel
 * Cancel a running sync job
 */
router.post('/job/:jobId/cancel', authenticateJWT, requirePermission('admin'), async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    const cancelled = await syncService.cancelJob(jobId, req.user.id);

    if (!cancelled) {
      return res.status(404).json({
        error: 'Sync job not found or cannot be cancelled'
      });
    }

    res.json({
      message: 'Sync job cancelled successfully',
      jobId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/stop-all
 * Stop all running sync operations
 */
router.post('/stop-all', authenticateJWT, requirePermission('admin'), async (req, res, next) => {
  try {
    const result = await syncService.stopAllSyncs(req.user.id);

    res.json({
      message: 'All sync operations stopped successfully',
      stoppedCount: result.stoppedCount,
      stoppedJobs: result.stoppedJobs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/stats
 * Get sync statistics and metrics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    
    const stats = await syncService.getSyncStats(parseInt(days));

    res.json({
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/test
 * Test endpoint for dashboard functionality (no auth required)
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Sync API is working!',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    note: 'This is a test endpoint. Real sync operations require authentication.'
  });
});

export default router;

// api/manual-sync.js - Manual sync endpoint for testing/debugging
import { syncListingsIdx } from '../lib/syncListingsIdx.js';
import { syncListingsVow } from '../lib/syncListingsVow.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, mode } = req.query;
  
  // Validate sync type
  if (!['idx', 'vow', 'both'].includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid sync type. Use: idx, vow, or both' 
    });
  }

  try {
    console.log(`🔧 Manual sync triggered: ${type} (${mode || 'full'} mode)`);
    const startTime = Date.now();
    const results = {};

    if (type === 'idx' || type === 'both') {
      console.log('🚀 Starting IDX sync...');
      const idxStart = Date.now();
      
      const testMode = mode === 'test';
      const incrementalMode = mode === 'incremental';
      
      await syncListingsIdx(testMode, incrementalMode);
      
      results.idx = {
        completed: true,
        duration_ms: Date.now() - idxStart,
        mode: mode || 'full'
      };
    }

    if (type === 'vow' || type === 'both') {
      console.log('🚀 Starting VOW sync...');
      const vowStart = Date.now();
      
      const testMode = mode === 'test';
      await syncListingsVow(testMode);
      
      results.vow = {
        completed: true,
        duration_ms: Date.now() - vowStart,
        mode: mode || 'full'
      };
    }

    const totalDuration = Date.now() - startTime;
    
    console.log(`✅ Manual sync completed in ${Math.round(totalDuration / 1000)}s`);
    
    res.status(200).json({
      success: true,
      message: `Manual ${type} sync completed`,
      total_duration_ms: totalDuration,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Manual sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Usage examples:
// GET /api/manual-sync?type=idx&mode=incremental
// GET /api/manual-sync?type=vow&mode=test
// GET /api/manual-sync?type=both
// GET /api/manual-sync?type=idx
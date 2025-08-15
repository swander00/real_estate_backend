// api/sync-idx.js - Cron endpoint for IDX sync
import { syncListingsIdx } from '../lib/syncListingsIdx.js';

export default async function handler(req, res) {
  // Verify cron authorization
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('❌ Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow POST requests from cron
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🕒 Cron job: Starting IDX incremental sync...');
    const startTime = Date.now();
    
    // Run incremental sync (false = not test mode, true = incremental mode)
    await syncListingsIdx(false, true);
    
    const duration = Date.now() - startTime;
    const message = `IDX incremental sync completed in ${Math.round(duration / 1000)}s`;
    
    console.log(`✅ ${message}`);
    
    res.status(200).json({ 
      success: true, 
      message,
      duration_ms: duration,
      sync_type: 'incremental',
      timestamp: new Date().toISOString() 
    });
    
  } catch (error) {
    console.error('❌ Cron IDX sync failed:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'IDX sync failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
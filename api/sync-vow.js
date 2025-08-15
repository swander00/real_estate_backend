// api/sync-vow.js - Cron endpoint for VOW sync
import { syncListingsVow } from '../lib/syncListingsVow.js';

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
    console.log('🕒 Cron job: Starting VOW sync...');
    const startTime = Date.now();
    
    // Run VOW sync (false = not test mode)
    await syncListingsVow(false);
    
    const duration = Date.now() - startTime;
    const message = `VOW sync completed in ${Math.round(duration / 1000)}s`;
    
    console.log(`✅ ${message}`);
    
    res.status(200).json({ 
      success: true, 
      message,
      duration_ms: duration,
      sync_type: 'full',
      timestamp: new Date().toISOString() 
    });
    
  } catch (error) {
    console.error('❌ Cron VOW sync failed:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'VOW sync failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
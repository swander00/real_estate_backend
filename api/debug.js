// api/debug.js - Debug endpoint to test imports from lib folder
export default async function handler(req, res) {
  try {
    console.log('🔍 Starting debug checks...');
    
    // Test if we can import the sync functions from lib
    console.log('📁 Testing import from lib/syncListingsIdx.js...');
    const { syncListingsIdx } = await import('../lib/syncListingsIdx.js');
    
    console.log('📁 Testing import from lib/syncListingsVow.js...');
    const { syncListingsVow } = await import('../lib/syncListingsVow.js');
    
    console.log('✅ All imports successful!');
    
    res.status(200).json({
      success: true,
      message: 'All imports successful from lib folder',
      functions: {
        syncListingsIdx: typeof syncListingsIdx,
        syncListingsVow: typeof syncListingsVow
      },
      env_check: {
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_KEY,
        idx_url: !!process.env.IDX_URL,
        idx_token: !!process.env.IDX_TOKEN,
        vow_url: !!process.env.VOW_URL,
        vow_token: !!process.env.VOW_TOKEN,
        cron_secret: !!process.env.CRON_SECRET
      },
      import_paths: {
        syncListingsIdx: '../lib/syncListingsIdx.js',
        syncListingsVow: '../lib/syncListingsVow.js'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Import or environment check failed',
      message: error.message,
      stack: error.stack,
      attempted_imports: [
        '../lib/syncListingsIdx.js',
        '../lib/syncListingsVow.js'
      ],
      timestamp: new Date().toISOString()
    });
  }
}
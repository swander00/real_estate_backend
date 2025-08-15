export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Real Estate Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/sync-status',
      '/api/sync-idx',
      '/api/sync-vow'
    ]
  });
}
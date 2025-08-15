export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    status: 'success',
    message: 'Sync status endpoint working',
    timestamp: new Date().toISOString()
  });
}
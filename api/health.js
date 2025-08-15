export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok',
    service: 'real-estate-backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
}
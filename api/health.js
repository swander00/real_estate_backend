export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ 
    status: 'ok',
    service: 'real-estate-backend',
    timestamp: new Date().toISOString()
  });
}
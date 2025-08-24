# 1. Run validation again
npm run validate-reso

# 2. Test your RESO endpoints with a simple Node server
node -e "
import http from 'http';
const server = http.createServer((req, res) => {
  console.log('📡', req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('RESO API Ready - Visit /api/reso endpoints');
});
server.listen(3000, () => console.log('🚀 Server: http://localhost:3000'));
"
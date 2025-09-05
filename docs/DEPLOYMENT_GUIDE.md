# 🚀 Deployment Guide

## Overview

This guide covers deploying the Real Estate Backend to various platforms including Vercel, AWS, and Docker containers.

## Prerequisites

- Node.js 18+ installed
- Git repository access
- Database credentials (Supabase)
- Environment variables configured

## Environment Configuration

### Required Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
API_BASE_URL=https://your-domain.com
API_VERSION=v1
PORT=3000

# Authentication
JWT_SECRET=your-jwt-secret-key
API_KEY_SECRET=your-api-key-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Security
HELMET_ENABLED=true
COMPRESSION_ENABLED=true

# Sync Configuration
SYNC_ENABLED=true
SYNC_INTERVAL_MINUTES=60
SYNC_BATCH_SIZE=100

# External APIs
IDX_API_URL=https://idx-api.example.com
IDX_API_KEY=your-idx-api-key
VOW_API_URL=https://vow-api.example.com
VOW_API_KEY=your-vow-api-key
```

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
```

#### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
CORS_ORIGIN=https://staging.your-domain.com
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
CORS_ORIGIN=https://your-domain.com
```

## Deployment Options

### 1. Vercel Deployment

#### Setup
1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Initialize project**:
   ```bash
   vercel
   ```

#### Configuration

Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

#### Deploy
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Environment Variables
Set environment variables in Vercel dashboard or CLI:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add JWT_SECRET
```

### 2. AWS Deployment

#### Using AWS Lambda + API Gateway

1. **Install Serverless Framework**:
   ```bash
   npm install -g serverless
   npm install serverless-http
   ```

2. **Create `serverless.yml`**:
   ```yaml
   service: real-estate-backend
   
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
     stage: ${opt:stage, 'dev'}
     environment:
       NODE_ENV: ${self:provider.stage}
       SUPABASE_URL: ${env:SUPABASE_URL}
       SUPABASE_ANON_KEY: ${env:SUPABASE_ANON_KEY}
       JWT_SECRET: ${env:JWT_SECRET}
   
   functions:
     api:
       handler: server.handler
       events:
         - http:
             path: /{proxy+}
             method: ANY
             cors: true
         - http:
             path: /
             method: ANY
             cors: true
   
   plugins:
     - serverless-http
   ```

3. **Create `server.js` wrapper**:
   ```javascript
   const serverless = require('serverless-http');
   const app = require('./server');
   
   module.exports.handler = serverless(app);
   ```

4. **Deploy**:
   ```bash
   serverless deploy
   ```

#### Using AWS ECS

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   
   EXPOSE 3000
   
   CMD ["node", "server.js"]
   ```

2. **Build and push image**:
   ```bash
   docker build -t real-estate-backend .
   docker tag real-estate-backend:latest your-account.dkr.ecr.region.amazonaws.com/real-estate-backend:latest
   docker push your-account.dkr.ecr.region.amazonaws.com/real-estate-backend:latest
   ```

3. **Create ECS task definition and service**

### 3. Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

#### Deploy with Docker
```bash
# Build image
docker build -t real-estate-backend .

# Run container
docker run -d \
  --name real-estate-backend \
  -p 3000:3000 \
  --env-file .env \
  real-estate-backend

# Using Docker Compose
docker-compose up -d
```

### 4. Kubernetes Deployment

#### Deployment YAML
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: real-estate-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: real-estate-backend
  template:
    metadata:
      labels:
        app: real-estate-backend
    spec:
      containers:
      - name: app
        image: your-registry/real-estate-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: supabase-url
        - name: SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: supabase-anon-key
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: real-estate-backend-service
spec:
  selector:
    app: real-estate-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### Deploy to Kubernetes
```bash
# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=supabase-url=$SUPABASE_URL \
  --from-literal=supabase-anon-key=$SUPABASE_ANON_KEY \
  --from-literal=jwt-secret=$JWT_SECRET

# Deploy application
kubectl apply -f k8s-deployment.yaml

# Check status
kubectl get pods
kubectl get services
```

## Database Setup

### Supabase Configuration

1. **Create Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note down URL and API keys

2. **Run database migrations**:
   ```bash
   # Run setup script
   node database-setup.sql
   
   # Run RLS policies
   node fix-rls-policies.sql
   
   # Setup admin user
   node setup-admin-user.sql
   ```

3. **Configure Row Level Security**:
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE common_fields ENABLE ROW LEVEL SECURITY;
   ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;
   ALTER TABLE property_openhouse ENABLE ROW LEVEL SECURITY;
   ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
   ```

## SSL/TLS Configuration

### Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### Health Check Endpoint
```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
```

### Logging Configuration
```javascript
// Add to server.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Monitoring with PM2
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'real-estate-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

## CI/CD Pipeline

### GitHub Actions
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Performance Optimization

### Caching
```javascript
// Add Redis caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      redis.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};

// Use caching
app.get('/api/reso/Property', cache(300), getProperties);
```

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_property_city ON common_fields(City);
CREATE INDEX idx_property_status ON common_fields(StandardStatus);
CREATE INDEX idx_property_price ON common_fields(ListPrice);
CREATE INDEX idx_media_listing ON property_media(ResourceRecordKey);
CREATE INDEX idx_openhouse_listing ON property_openhouse(ListingKey);
CREATE INDEX idx_room_listing ON property_rooms(ListingKey);
```

## Security Checklist

- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation enabled
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Security headers configured
- [ ] API authentication implemented
- [ ] Database RLS enabled
- [ ] Logging and monitoring setup

## Troubleshooting

### Common Issues

#### Application won't start
```bash
# Check logs
pm2 logs real-estate-backend

# Check environment variables
echo $SUPABASE_URL

# Test database connection
node -e "console.log(process.env.SUPABASE_URL)"
```

#### Database connection issues
```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/"

# Check RLS policies
node check-rls-policies.js
```

#### Performance issues
```bash
# Monitor resources
htop
iostat -x 1

# Check application metrics
pm2 monit
```

### Support

For deployment support:
- **Documentation**: [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: devops@your-domain.com

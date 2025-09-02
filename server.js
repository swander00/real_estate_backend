// server.js - Main Express server for Real Estate Backend API
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Import routes
import propertyRoutes from './api/routes/properties.js';
import mediaRoutes from './api/routes/media.js';
import openhouseRoutes from './api/routes/openhouses.js';
import syncRoutes from './api/routes/sync.js';

// Import middleware
import { errorHandler } from './api/middleware/errorHandler.js';
import { requestLogger } from './api/middleware/requestLogger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/properties', propertyRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/openhouses', openhouseRoutes);
app.use('/api/sync', syncRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Real Estate Backend API',
    version: '1.0.0',
    endpoints: {
      properties: '/api/properties',
      media: '/api/media',
      openhouses: '/api/openhouses',
      sync: '/api/sync',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
});

export default app;

/**
 * Cache Middleware
 * Provides intelligent caching for API responses
 */

import { cacheService } from '../services/cacheService.js';
import { logger } from '../services/monitoringService.js';

// Cache configuration for different endpoints
const cacheConfig = {
  // Property endpoints
  '/api/reso/Property': { ttl: 300, key: 'property' }, // 5 minutes
  '/api/reso/Media': { ttl: 600, key: 'media' }, // 10 minutes
  '/api/reso/OpenHouse': { ttl: 180, key: 'openhouse' }, // 3 minutes
  '/api/reso/Room': { ttl: 600, key: 'room' }, // 10 minutes
  '/api/reso/Member': { ttl: 1800, key: 'member' }, // 30 minutes
  '/api/reso/Office': { ttl: 3600, key: 'office' }, // 1 hour
  
  // Metadata endpoints
  '/api/reso/$metadata': { ttl: 86400, key: 'metadata' }, // 24 hours
  '/api/reso/': { ttl: 3600, key: 'service' }, // 1 hour
  
  // Health endpoints
  '/health': { ttl: 30, key: 'health' }, // 30 seconds
  '/health/database': { ttl: 60, key: 'health_db' }, // 1 minute
  '/health/external': { ttl: 120, key: 'health_ext' }, // 2 minutes
  
  // Dashboard endpoints
  '/dashboard/': { ttl: 30, key: 'dashboard' }, // 30 seconds
  '/dashboard/metrics/realtime': { ttl: 10, key: 'metrics_realtime' }, // 10 seconds
};

// Generate cache key based on request
function generateCacheKey(req, config) {
  const baseKey = config.key;
  const queryString = req.query ? Object.keys(req.query).sort().map(key => `${key}=${req.query[key]}`).join('&') : '';
  const userKey = req.user?.id || 'anonymous';
  
  if (queryString) {
    return `${baseKey}:${userKey}:${Buffer.from(queryString).toString('base64')}`;
  }
  return `${baseKey}:${userKey}`;
}

// Check if request should be cached
function shouldCache(req) {
  // Don't cache POST, PUT, DELETE requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return false;
  }
  
  // Don't cache if no-cache header is present
  if (req.headers['cache-control']?.includes('no-cache')) {
    return false;
  }
  
  // Don't cache if user is admin (they need real-time data)
  if (req.user?.role === 'admin') {
    return false;
  }
  
  return true;
}

// Main cache middleware
export const cacheMiddleware = (req, res, next) => {
  // Skip caching if not applicable
  if (!shouldCache(req)) {
    return next();
  }
  
  // Find cache configuration for this route
  const config = cacheConfig[req.route?.path] || cacheConfig[req.path];
  if (!config) {
    return next();
  }
  
  const cacheKey = generateCacheKey(req, config);
  
  // Try to get from cache
  cacheService.get(cacheKey)
    .then(cached => {
      if (cached) {
        // Cache hit
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-TTL', config.ttl.toString());
        return res.json(cached);
      }
      
      // Cache miss - store original json method
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        cacheService.set(cacheKey, data, config.ttl).catch(error => {
          logger.error('Cache middleware set error', { 
            key: cacheKey, 
            error: error.message,
            route: req.route?.path || req.path
          });
        });
        
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-TTL', config.ttl.toString());
        return originalJson.call(this, data);
      };
      
      next();
    })
    .catch(error => {
      logger.error('Cache middleware error', { 
        key: cacheKey, 
        error: error.message,
        route: req.route?.path || req.path
      });
      next();
    });
};

// Cache invalidation middleware
export const cacheInvalidation = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  res.json = function(data) {
    // Invalidate related caches after successful operations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateRelatedCaches(req).catch(error => {
        logger.error('Cache invalidation error', { 
          error: error.message,
          route: req.route?.path || req.path
        });
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Invalidate related caches
async function invalidateRelatedCaches(req) {
  const route = req.route?.path || req.path;
  const method = req.method;
  
  // Invalidate caches based on the operation
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    // Invalidate related resource caches
    if (route.includes('/Property')) {
      await cacheService.invalidatePattern('property:*');
      await cacheService.invalidatePattern('dashboard:*');
    } else if (route.includes('/Media')) {
      await cacheService.invalidatePattern('media:*');
      await cacheService.invalidatePattern('property:*');
    } else if (route.includes('/OpenHouse')) {
      await cacheService.invalidatePattern('openhouse:*');
      await cacheService.invalidatePattern('property:*');
    } else if (route.includes('/Member')) {
      await cacheService.invalidatePattern('member:*');
    } else if (route.includes('/Office')) {
      await cacheService.invalidatePattern('office:*');
    }
  } else if (method === 'DELETE') {
    // Invalidate all related caches
    await cacheService.invalidatePattern('*');
  }
}

// Query result caching
export const cacheQuery = (keyGenerator, ttlSeconds = 300) => {
  return async (req, res, next) => {
    const cacheKey = keyGenerator(req);
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cached);
      }
      
      // Store original json method
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        cacheService.set(cacheKey, data, ttlSeconds).catch(error => {
          logger.error('Query cache set error', { 
            key: cacheKey, 
            error: error.message
          });
        });
        
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Query cache error', { 
        key: cacheKey, 
        error: error.message
      });
      next();
    }
  };
};

// Cache warming for frequently accessed data
export const warmCache = async () => {
  try {
    logger.info('Starting cache warming...');
    
    // Warm common queries
    const commonQueries = [
      { key: 'property:popular', query: () => getPopularProperties() },
      { key: 'member:active', query: () => getActiveMembers() },
      { key: 'office:list', query: () => getOfficeList() }
    ];
    
    for (const { key, query } of commonQueries) {
      try {
        const result = await query();
        await cacheService.set(key, result, 1800); // 30 minutes
        logger.info('Cache warmed', { key });
      } catch (error) {
        logger.error('Cache warming error', { key, error: error.message });
      }
    }
    
    logger.info('Cache warming completed');
  } catch (error) {
    logger.error('Cache warming failed', { error: error.message });
  }
};

// Cache statistics endpoint
export const getCacheStats = async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    res.json({
      cache: stats,
      config: cacheConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache statistics',
      message: error.message
    });
  }
};

// Cache management endpoints
export const clearCache = async (req, res) => {
  try {
    const { pattern } = req.query;
    
    if (pattern) {
      const deletedCount = await cacheService.invalidatePattern(pattern);
      res.json({
        message: `Cache cleared for pattern: ${pattern}`,
        deletedCount,
        timestamp: new Date().toISOString()
      });
    } else {
      await cacheService.flush();
      res.json({
        message: 'All cache cleared',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
};

// Placeholder functions for cache warming
async function getPopularProperties() {
  // This would be implemented to fetch popular properties
  return { properties: [], count: 0 };
}

async function getActiveMembers() {
  // This would be implemented to fetch active members
  return { members: [], count: 0 };
}

async function getOfficeList() {
  // This would be implemented to fetch office list
  return { offices: [], count: 0 };
}

export default {
  cacheMiddleware,
  cacheInvalidation,
  cacheQuery,
  warmCache,
  getCacheStats,
  clearCache
};

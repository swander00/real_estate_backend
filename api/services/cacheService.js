/**
 * Cache Service
 * Provides Redis-based caching with fallback to in-memory cache
 */

import Redis from 'ioredis';
import { logger } from './monitoringService.js';

class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.isRedisConnected = false;
    this.initializeRedis();
  }

  // Initialize Redis connection
  async initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000
        });

        this.redis.on('connect', () => {
                  this.isRedisConnected = true;
        console.log('Redis connected successfully');
        });

        this.redis.on('error', (error) => {
          this.isRedisConnected = false;
          console.warn('Redis connection error, falling back to memory cache:', error.message);
        });

        this.redis.on('close', () => {
          this.isRedisConnected = false;
          console.warn('Redis connection closed, falling back to memory cache');
        });

        // Test connection
        await this.redis.ping();
        this.isRedisConnected = true;
        console.log('Redis cache service initialized');
      } catch (error) {
        this.isRedisConnected = false;
        console.warn('Redis initialization failed, using memory cache:', error.message);
      }
    } else {
      console.log('Redis URL not configured, using memory cache');
    }
  }

  // Get value from cache
  async get(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to memory cache
        const cached = this.memoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.value;
        } else if (cached) {
          this.memoryCache.delete(key);
        }
        return null;
      }
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  // Set value in cache
  async set(key, value, ttlSeconds = 300) {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        // Fallback to memory cache
        this.memoryCache.set(key, {
          value,
          expires: Date.now() + (ttlSeconds * 1000)
        });
      }
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  // Delete value from cache
  async del(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        return await this.redis.exists(key) === 1;
      } else {
        const cached = this.memoryCache.get(key);
        return cached && cached.expires > Date.now();
      }
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  }

  // Get multiple keys
  async mget(keys) {
    try {
      if (this.isRedisConnected && this.redis) {
        const values = await this.redis.mget(keys);
        return values.map(value => value ? JSON.parse(value) : null);
      } else {
        return keys.map(key => {
          const cached = this.memoryCache.get(key);
          if (cached && cached.expires > Date.now()) {
            return cached.value;
          } else if (cached) {
            this.memoryCache.delete(key);
          }
          return null;
        });
      }
    } catch (error) {
      logger.error('Cache mget error', { keys, error: error.message });
      return keys.map(() => null);
    }
  }

  // Set multiple key-value pairs
  async mset(keyValuePairs, ttlSeconds = 300) {
    try {
      if (this.isRedisConnected && this.redis) {
        const pipeline = this.redis.pipeline();
        for (const [key, value] of keyValuePairs) {
          pipeline.setex(key, ttlSeconds, JSON.stringify(value));
        }
        await pipeline.exec();
      } else {
        for (const [key, value] of keyValuePairs) {
          this.memoryCache.set(key, {
            value,
            expires: Date.now() + (ttlSeconds * 1000)
          });
        }
      }
      return true;
    } catch (error) {
      logger.error('Cache mset error', { error: error.message });
      return false;
    }
  }

  // Increment counter
  async incr(key, ttlSeconds = 300) {
    try {
      if (this.isRedisConnected && this.redis) {
        const result = await this.redis.incr(key);
        if (result === 1) {
          await this.redis.expire(key, ttlSeconds);
        }
        return result;
      } else {
        const cached = this.memoryCache.get(key);
        const newValue = cached ? cached.value + 1 : 1;
        this.memoryCache.set(key, {
          value: newValue,
          expires: Date.now() + (ttlSeconds * 1000)
        });
        return newValue;
      }
    } catch (error) {
      logger.error('Cache incr error', { key, error: error.message });
      return 0;
    }
  }

  // Get cache statistics
  async getStats() {
    try {
      if (this.isRedisConnected && this.redis) {
        const info = await this.redis.info('memory');
        const keyspace = await this.redis.info('keyspace');
        return {
          type: 'redis',
          connected: true,
          memory: info,
          keyspace: keyspace,
          memoryCacheSize: 0
        };
      } else {
        return {
          type: 'memory',
          connected: false,
          memoryCacheSize: this.memoryCache.size,
          memoryCacheKeys: Array.from(this.memoryCache.keys())
        };
      }
    } catch (error) {
      logger.error('Cache stats error', { error: error.message });
      return {
        type: 'error',
        connected: false,
        error: error.message
      };
    }
  }

  // Clear all cache
  async flush() {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushdb();
      } else {
        this.memoryCache.clear();
      }
      return true;
    } catch (error) {
      logger.error('Cache flush error', { error: error.message });
      return false;
    }
  }

  // Generate cache key
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  // Cache middleware for Express routes
  cacheMiddleware(ttlSeconds = 300, keyGenerator = null) {
    return async (req, res, next) => {
      const key = keyGenerator ? keyGenerator(req) : this.generateKey('route', req.method, req.originalUrl);
      
      try {
        const cached = await this.get(key);
        if (cached) {
          res.set('X-Cache', 'HIT');
          res.set('X-Cache-Key', key);
          return res.json(cached);
        }

        // Store original json method
        const originalJson = res.json;
        res.json = function(data) {
          // Cache the response
          cacheService.set(key, data, ttlSeconds).catch(error => {
            logger.error('Cache middleware set error', { key, error: error.message });
          });
          
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', key);
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error', { key, error: error.message });
        next();
      }
    };
  }

  // Cache for database queries
  async cacheQuery(queryKey, queryFunction, ttlSeconds = 300) {
    try {
      const cached = await this.get(queryKey);
      if (cached) {
        return cached;
      }

      const result = await queryFunction();
      await this.set(queryKey, result, ttlSeconds);
      return result;
    } catch (error) {
      logger.error('Cache query error', { queryKey, error: error.message });
      return await queryFunction();
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern) {
    try {
      if (this.isRedisConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return keys.length;
      } else {
        // For memory cache, we need to check each key
        let deletedCount = 0;
        for (const key of this.memoryCache.keys()) {
          if (key.includes(pattern.replace('*', ''))) {
            this.memoryCache.delete(key);
            deletedCount++;
          }
        }
        return deletedCount;
      }
    } catch (error) {
      logger.error('Cache invalidate pattern error', { pattern, error: error.message });
      return 0;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.ping();
        return { status: 'healthy', type: 'redis' };
      } else {
        return { status: 'healthy', type: 'memory' };
      }
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Create global cache service instance
const cacheService = new CacheService();

export { cacheService };
export default cacheService;

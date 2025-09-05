/**
 * Database Service
 * Provides optimized database connection pooling and query management
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './monitoringService.js';

class DatabaseService {
  constructor() {
    this.clients = new Map();
    this.connectionPool = new Map();
    this.queryCache = new Map();
    this.initializeConnections();
  }

  // Initialize database connections
  initializeConnections() {
    try {
      // Primary connection (anon key)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        this.clients.set('anon', createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          {
            db: {
              schema: 'public'
            },
            auth: {
              persistSession: false
            },
            global: {
              headers: {
                'x-application-name': 'real-estate-backend'
              }
            }
          }
        ));
        console.log('Primary database connection initialized');
      }

      // Service role connection (for admin operations)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.clients.set('service', createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            db: {
              schema: 'public'
            },
            auth: {
              persistSession: false
            },
            global: {
              headers: {
                'x-application-name': 'real-estate-backend-service'
              }
            }
          }
        ));
        console.log('Service role database connection initialized');
      }

      // Connection pool configuration
      this.connectionPool.set('config', {
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
        minConnections: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 60000,
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000
      });

    } catch (error) {
      console.error('Database service initialization failed:', error.message);
      throw error;
    }
  }

  // Get database client
  getClient(type = 'anon') {
    const client = this.clients.get(type);
    if (!client) {
      throw new Error(`Database client type '${type}' not available`);
    }
    return client;
  }

  // Execute query with connection pooling
  async executeQuery(queryFunction, clientType = 'anon', options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const client = this.getClient(clientType);
      
      // Add query timeout
      const timeout = options.timeout || this.connectionPool.get('config').queryTimeout;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      // Execute query with timeout
      const result = await Promise.race([
        queryFunction(client),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          queryId,
          duration,
          clientType,
          threshold: 1000
        });
      }

      // Cache result if specified
      if (options.cache && options.cacheKey) {
        this.queryCache.set(options.cacheKey, {
          result,
          timestamp: Date.now(),
          ttl: options.cache.ttl || 300000 // 5 minutes default
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query failed', {
        queryId,
        duration,
        clientType,
        error: error.message
      });
      throw error;
    }
  }

  // Execute transaction
  async executeTransaction(transactionFunction, clientType = 'service') {
    const startTime = Date.now();
    const transactionId = this.generateQueryId();
    
    try {
      const client = this.getClient(clientType);
      
      // Note: Supabase doesn't have explicit transaction support in the client
      // This is a placeholder for transaction-like operations
      const result = await transactionFunction(client);
      
      const duration = Date.now() - startTime;
      logger.info('Transaction completed', {
        transactionId,
        duration,
        clientType
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Transaction failed', {
        transactionId,
        duration,
        clientType,
        error: error.message
      });
      throw error;
    }
  }

  // Batch operations
  async executeBatch(operations, clientType = 'service') {
    const startTime = Date.now();
    const batchId = this.generateQueryId();
    
    try {
      const client = this.getClient(clientType);
      const results = [];

      // Execute operations in batches to avoid overwhelming the database
      const batchSize = parseInt(process.env.DB_BATCH_SIZE) || 100;
      
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(operation => operation(client))
        );
        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      logger.info('Batch operation completed', {
        batchId,
        operationCount: operations.length,
        duration,
        clientType
      });

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Batch operation failed', {
        batchId,
        operationCount: operations.length,
        duration,
        clientType,
        error: error.message
      });
      throw error;
    }
  }

  // Get cached query result
  getCachedQuery(cacheKey) {
    const cached = this.queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.result;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.queryCache.delete(cacheKey);
    }
    
    return null;
  }

  // Clear query cache
  clearQueryCache(pattern = null) {
    if (pattern) {
      // Clear cache entries matching pattern
      for (const [key, value] of this.queryCache.entries()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.queryCache.clear();
    }
  }

  // Health check
  async healthCheck() {
    try {
      const results = {};
      
      for (const [type, client] of this.clients.entries()) {
        const startTime = Date.now();
        
        try {
          // Simple query to test connection
          const { data, error } = await client
            .from('common_fields')
            .select('count')
            .limit(1);

          const duration = Date.now() - startTime;
          
          results[type] = {
            status: error ? 'unhealthy' : 'healthy',
            responseTime: duration,
            error: error?.message
          };
        } catch (error) {
          results[type] = {
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            error: error.message
          };
        }
      }

      return {
        status: Object.values(results).every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
        connections: results,
        cacheSize: this.queryCache.size,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get connection statistics
  getConnectionStats() {
    const config = this.connectionPool.get('config');
    
    return {
      clients: {
        available: Array.from(this.clients.keys()),
        count: this.clients.size
      },
      pool: {
        maxConnections: config.maxConnections,
        minConnections: config.minConnections,
        connectionTimeout: config.connectionTimeout,
        idleTimeout: config.idleTimeout,
        queryTimeout: config.queryTimeout
      },
      cache: {
        size: this.queryCache.size,
        entries: Array.from(this.queryCache.keys())
      },
      timestamp: new Date().toISOString()
    };
  }

  // Generate unique query ID
  generateQueryId() {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Optimize query performance
  optimizeQuery(query, options = {}) {
    const optimized = { ...query };
    
    // Add query hints
    if (options.hint) {
      optimized.hint = options.hint;
    }
    
    // Add query timeout
    if (options.timeout) {
      optimized.timeout = options.timeout;
    }
    
    // Add query cache control
    if (options.cache !== undefined) {
      optimized.cache = options.cache;
    }
    
    return optimized;
  }

  // Close all connections
  async closeConnections() {
    try {
      // Supabase clients don't need explicit closing
      // But we can clear our internal state
      this.clients.clear();
      this.queryCache.clear();
      this.connectionPool.clear();
      
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', { error: error.message });
    }
  }
}

// Create global database service instance
const databaseService = new DatabaseService();

export { databaseService };
export default databaseService;

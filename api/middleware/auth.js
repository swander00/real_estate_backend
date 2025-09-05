/**
 * Authentication Middleware
 * Provides JWT and API key authentication
 */

import { authService } from '../services/authService.js';
import { logger } from '../services/monitoringService.js';
import { supabase } from '../../server.js';

// JWT Authentication middleware
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization header provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const user = await authService.getUserFromToken(token);
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }
  } catch (error) {
    logger.error('JWT authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

// API Key Authentication middleware
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required'
      });
    }

    try {
      const keyInfo = await authService.validateApiKey(apiKey);
      req.user = {
        id: keyInfo.userId,
        email: keyInfo.user.email,
        fullName: keyInfo.user.full_name,
        role: keyInfo.user.role,
        type: 'api_key',
        permissions: keyInfo.permissions,
        rateLimitPerHour: keyInfo.rateLimitPerHour
      };
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }
  } catch (error) {
    logger.error('API key authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

// Flexible authentication (JWT or API Key)
export const authenticate = async (req, res, next) => {
  try {
    // Try JWT first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authenticateJWT(req, res, next);
    }

    // Try API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return authenticateApiKey(req, res, next);
    }

    // No authentication provided
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Provide either Bearer token or API key.'
    });
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

// Authorization middleware
export const authorize = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!authService.hasPermission(req.user.role, requiredRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${requiredRole}`
      });
    }

    next();
  };
};

// Permission-based authorization
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // For API key users, check permissions array
    if (req.user.type === 'api_key') {
      if (!req.user.permissions.includes(permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Permission denied. Required permission: ${permission}`
        });
      }
    } else {
      // For JWT users, use role-based permissions
      const rolePermissions = {
        'viewer': ['read'],
        'agent': ['read', 'write'],
        'admin': ['read', 'write', 'delete', 'admin']
      };

      const userPermissions = rolePermissions[req.user.role] || [];
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Permission denied. Required permission: ${permission}`
        });
      }
    }

    next();
  };
};

// Optional authentication (doesn't fail if no auth provided)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const user = await authService.getUserFromToken(token);
        req.user = user;
      } catch (error) {
        // Ignore authentication errors for optional auth
        logger.debug('Optional auth failed', { error: error.message });
      }
    } else if (apiKey) {
      try {
        const keyInfo = await authService.validateApiKey(apiKey);
        req.user = {
          id: keyInfo.userId,
          email: keyInfo.user.email,
          fullName: keyInfo.user.full_name,
          role: keyInfo.user.role,
          type: 'api_key',
          permissions: keyInfo.permissions
        };
      } catch (error) {
        // Ignore authentication errors for optional auth
        logger.debug('Optional API key auth failed', { error: error.message });
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error', { error: error.message });
    next(); // Continue even if optional auth fails
  }
};

// Rate limiting per user
export const userRateLimit = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, data] of requests.entries()) {
      if (data.windowStart < windowStart) {
        requests.delete(key);
      }
    }

    // Get or create user request data
    let userData = requests.get(userId);
    if (!userData || userData.windowStart < windowStart) {
      userData = {
        count: 0,
        windowStart: now
      };
      requests.set(userId, userData);
    }

    // Check rate limit
    if (userData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((userData.windowStart + windowMs - now) / 1000)
      });
    }

    // Increment counter
    userData.count++;

    // Add rate limit headers
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - userData.count).toString());
    res.set('X-RateLimit-Reset', new Date(userData.windowStart + windowMs).toISOString());

    next();
  };
};

// Admin only middleware
export const adminOnly = authorize('admin');

// Agent or admin middleware
export const agentOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!['agent', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Agent or admin access required'
    });
  }

  next();
};

// Read permission middleware
export const requireRead = requirePermission('read');

// Write permission middleware
export const requireWrite = requirePermission('write');

// Delete permission middleware
export const requireDelete = requirePermission('delete');

// Admin permission middleware
export const requireAdmin = requirePermission('admin');

// Supabase Auth middleware
export const authenticateSupabase = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization header provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new Error('Invalid token');
      }

      // Set user info in request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'viewer',
        fullName: user.user_metadata?.full_name || user.email,
        type: 'supabase',
        permissions: user.user_metadata?.permissions || []
      };

      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }
  } catch (error) {
    logger.error('Supabase authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

// Flexible authentication (JWT, API Key, or Supabase)
export const authenticateFlexible = async (req, res, next) => {
  try {
    // Try JWT first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Check if this is a service role key
      if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
        req.user = {
          id: 'service-role',
          email: 'service-role@supabase',
          role: 'admin',
          fullName: 'Service Role',
          type: 'service-role',
          permissions: ['*'] // Full permissions
        };
        return next();
      }
      
      // Check if this is the anon key first (before trying Supabase auth)
      if (token === process.env.SUPABASE_ANON_KEY) {
        req.user = {
          id: 'anon-user',
          email: 'anon@supabase',
          role: 'admin',
          fullName: 'Anonymous User',
          type: 'anon',
          permissions: ['read', 'write', 'delete', 'admin']
        };
        return next();
      }
      
      // Try Supabase Auth for regular user tokens
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'viewer',
            fullName: user.user_metadata?.full_name || user.email,
            type: 'supabase',
            permissions: user.user_metadata?.permissions || []
          };
          return next();
        }
      } catch (supabaseError) {
        // Fall back to JWT authentication
        try {
          const user = await authService.getUserFromToken(token);
          req.user = user;
          return next();
        } catch (jwtError) {
          // Both failed
        }
      }
    }

    // Try API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return authenticateApiKey(req, res, next);
    }

    // No authentication provided
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Provide either Bearer token or API key.'
    });
  } catch (error) {
    logger.error('Flexible authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

export default {
  authenticateJWT,
  authenticateApiKey,
  authenticate,
  authenticateSupabase,
  authenticateFlexible,
  authorize,
  requirePermission,
  optionalAuth,
  userRateLimit,
  adminOnly,
  agentOrAdmin,
  requireRead,
  requireWrite,
  requireDelete,
  requireAdmin
};

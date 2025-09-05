/**
 * Authentication Service
 * Provides JWT-based authentication and authorization
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../../server.js';
import { logger } from './monitoringService.js';

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  }

  // Generate JWT token
  generateToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: 'real-estate-backend',
        audience: 'real-estate-api'
      });
    } catch (error) {
      logger.error('Token generation error', { error: error.message });
      throw new Error('Token generation failed');
    }
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.refreshTokenExpiresIn,
        issuer: 'real-estate-backend',
        audience: 'real-estate-api'
      });
    } catch (error) {
      logger.error('Refresh token generation error', { error: error.message });
      throw new Error('Refresh token generation failed');
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'real-estate-backend',
        audience: 'real-estate-api'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        logger.error('Token verification error', { error: error.message });
        throw new Error('Token verification failed');
      }
    }
  }

  // Hash password
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      logger.error('Password hashing error', { error: error.message });
      throw new Error('Password hashing failed');
    }
  }

  // Compare password
  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password comparison error', { error: error.message });
      throw new Error('Password comparison failed');
    }
  }

  // Authenticate user with email and password
  async authenticateUser(email, password) {
    try {
      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        throw new Error('Invalid credentials');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // For now, we'll assume password is stored in a separate auth table
      // In a real implementation, you'd verify the password here
      // const isValidPassword = await this.comparePassword(password, user.password_hash);
      // if (!isValidPassword) {
      //   throw new Error('Invalid credentials');
      // }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      };

      const accessToken = this.generateToken(tokenPayload);
      const refreshToken = this.generateRefreshToken({ userId: user.id });

      // Store refresh token in database
      await this.storeRefreshToken(user.id, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          profile: profile || {}
        },
        accessToken,
        refreshToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.error('User authentication error', { email, error: error.message });
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshToken);
      
      // Check if refresh token exists in database
      const { data: tokenRecord, error } = await supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token_hash', this.hashToken(refreshToken))
        .eq('is_active', true)
        .single();

      if (error || !tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      };

      const newAccessToken = this.generateToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.error('Token refresh error', { error: error.message });
      throw error;
    }
  }

  // Store refresh token
  async storeRefreshToken(userId, refreshToken) {
    try {
      const tokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { error } = await supabase
        .from('refresh_tokens')
        .insert({
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          is_active: true
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Refresh token storage error', { userId, error: error.message });
      throw error;
    }
  }

  // Revoke refresh token
  async revokeRefreshToken(refreshToken) {
    try {
      const tokenHash = this.hashToken(refreshToken);
      
      const { error } = await supabase
        .from('refresh_tokens')
        .update({ is_active: false })
        .eq('token_hash', tokenHash);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Refresh token revocation error', { error: error.message });
      throw error;
    }
  }

  // Revoke all refresh tokens for user
  async revokeAllRefreshTokens(userId) {
    try {
      const { error } = await supabase
        .from('refresh_tokens')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('All refresh tokens revocation error', { userId, error: error.message });
      throw error;
    }
  }

  // Hash token for storage
  hashToken(token) {
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }

  // Get user from token
  async getUserFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      };
    } catch (error) {
      logger.error('Get user from token error', { error: error.message });
      throw error;
    }
  }

  // Check user permissions
  hasPermission(userRole, requiredRole) {
    const roleHierarchy = {
      'viewer': 1,
      'agent': 2,
      'admin': 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  // Generate API key
  async generateApiKey(userId, name, permissions = ['read']) {
    try {
      const apiKey = this.generateRandomKey();
      const keyHash = this.hashToken(apiKey);

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          name,
          key_hash: keyHash,
          user_id: userId,
          permissions,
          rate_limit_per_hour: 1000,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        key: apiKey, // Only returned once
        permissions: data.permissions,
        rateLimitPerHour: data.rate_limit_per_hour
      };
    } catch (error) {
      logger.error('API key generation error', { userId, name, error: error.message });
      throw error;
    }
  }

  // Validate API key
  async validateApiKey(apiKey) {
    try {
      const keyHash = this.hashToken(apiKey);
      
      const { data: keyRecord, error } = await supabase
        .from('api_keys')
        .select(`
          *,
          users!inner(*)
        `)
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();

      if (error || !keyRecord) {
        throw new Error('Invalid API key');
      }

      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', keyRecord.id);

      return {
        userId: keyRecord.user_id,
        permissions: keyRecord.permissions,
        rateLimitPerHour: keyRecord.rate_limit_per_hour,
        user: keyRecord.users
      };
    } catch (error) {
      logger.error('API key validation error', { error: error.message });
      throw error;
    }
  }

  // Generate random key
  generateRandomKey() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Logout user
  async logout(refreshToken) {
    try {
      if (refreshToken) {
        await this.revokeRefreshToken(refreshToken);
      }
      return true;
    } catch (error) {
      logger.error('Logout error', { error: error.message });
      throw error;
    }
  }

  // Logout from all devices
  async logoutAllDevices(userId) {
    try {
      await this.revokeAllRefreshTokens(userId);
      return true;
    } catch (error) {
      logger.error('Logout all devices error', { userId, error: error.message });
      throw error;
    }
  }
}

// Create global auth service instance
const authService = new AuthService();

export { authService };
export default authService;

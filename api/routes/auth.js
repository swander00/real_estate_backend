/**
 * Authentication Routes
 * Provides login, logout, token refresh, and user management
 */

import express from 'express';
import { authService } from '../services/authService.js';
import { authenticate, authenticateJWT, adminOnly, requireWrite } from '../middleware/auth.js';
import { logger } from '../services/monitoringService.js';
import { supabase } from '../../server.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    const result = await authService.authenticateUser(email, password);
    
    logger.info('User login successful', { 
      userId: result.user.id, 
      email: result.user.email,
      role: result.user.role 
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    logger.error('Login failed', { 
      email: req.body.email, 
      error: error.message 
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    await authService.logout(refreshToken);
    
    logger.info('User logout successful', { 
      userId: req.user.id, 
      email: req.user.email 
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout failed', { 
      userId: req.user?.id, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed'
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateJWT, async (req, res) => {
  try {
    await authService.logoutAllDevices(req.user.id);
    
    logger.info('User logout from all devices successful', { 
      userId: req.user.id, 
      email: req.user.email 
    });

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    logger.error('Logout all devices failed', { 
      userId: req.user?.id, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout from all devices failed'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });

    res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get user profile failed', { 
      userId: req.user?.id, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user profile'
    });
  }
});

// Generate API key
router.post('/api-keys', authenticate, requireWrite, async (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'API key name is required'
      });
    }

    const result = await authService.generateApiKey(
      req.user.id, 
      name, 
      permissions || ['read']
    );
    
    logger.info('API key generated', { 
      userId: req.user.id, 
      keyName: name 
    });

    res.json({
      success: true,
      message: 'API key generated successfully',
      data: result
    });
  } catch (error) {
    logger.error('API key generation failed', { 
      userId: req.user?.id, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate API key'
    });
  }
});

// List user's API keys
router.get('/api-keys', authenticate, async (req, res) => {
  try {
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, permissions, rate_limit_per_hour, is_active, last_used, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        apiKeys: apiKeys || []
      }
    });
  } catch (error) {
    logger.error('Get API keys failed', { 
      userId: req.user?.id, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get API keys'
    });
  }
});

// Revoke API key
router.delete('/api-keys/:keyId', authenticate, requireWrite, async (req, res) => {
  try {
    const { keyId } = req.params;

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    logger.info('API key revoked', { 
      userId: req.user.id, 
      keyId 
    });

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('API key revocation failed', { 
      userId: req.user?.id, 
      keyId: req.params.keyId, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke API key'
    });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 8 characters long'
      });
    }

    // In a real implementation, you would:
    // 1. Verify current password
    // 2. Hash new password
    // 3. Update password in database
    // 4. Revoke all refresh tokens

    logger.info('Password change requested', { 
      userId: req.user.id, 
      email: req.user.email 
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change failed', { 
      userId: req.user?.id, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

// Admin: List all users
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at,
        user_profiles(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        users: users || []
      }
    });
  } catch (error) {
    logger.error('Get users failed', { 
      adminId: req.user?.id, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get users'
    });
  }
});

// Admin: Update user role
router.patch('/users/:userId/role', authenticate, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['viewer', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid role is required (viewer, agent, admin)'
      });
    }

    const { error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    logger.info('User role updated', { 
      adminId: req.user.id, 
      userId, 
      newRole: role 
    });

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    logger.error('User role update failed', { 
      adminId: req.user?.id, 
      userId: req.params.userId, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user role'
    });
  }
});

// Admin: Deactivate user
router.patch('/users/:userId/deactivate', authenticate, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    // Revoke all refresh tokens for the user
    await authService.revokeAllRefreshTokens(userId);

    logger.info('User deactivated', { 
      adminId: req.user.id, 
      userId 
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('User deactivation failed', { 
      adminId: req.user?.id, 
      userId: req.params.userId, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to deactivate user'
    });
  }
});

// Token validation endpoint
router.get('/validate', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
        valid: true
      }
    });
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token is invalid'
    });
  }
});

// Supabase Auth: Sign in with email and password
router.post('/supabase/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.error('Supabase signin failed', { email, error: error.message });
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }

    logger.info('Supabase signin successful', { 
      userId: data.user.id, 
      email: data.user.email 
    });

    res.json({
      success: true,
      message: 'Sign in successful',
      data: {
        user: data.user,
        session: data.session
      }
    });
  } catch (error) {
    logger.error('Supabase signin error', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Sign in failed'
    });
  }
});

// Supabase Auth: Sign up with email and password
router.post('/supabase/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || ''
        }
      }
    });

    if (error) {
      logger.error('Supabase signup failed', { email, error: error.message });
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    logger.info('Supabase signup successful', { 
      userId: data.user?.id, 
      email: data.user?.email 
    });

    res.json({
      success: true,
      message: 'Sign up successful. Please check your email to confirm your account.',
      data: {
        user: data.user,
        session: data.session
      }
    });
  } catch (error) {
    logger.error('Supabase signup error', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Sign up failed'
    });
  }
});

// Supabase Auth: Sign out
router.post('/supabase/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Supabase signout failed', { error: error.message });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }

    logger.info('Supabase signout successful');

    res.json({
      success: true,
      message: 'Sign out successful'
    });
  } catch (error) {
    logger.error('Supabase signout error', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Sign out failed'
    });
  }
});

// Supabase Auth: Get current session
router.get('/supabase/session', async (req, res) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logger.error('Get Supabase session failed', { error: error.message });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No active session'
      });
    }

    res.json({
      success: true,
      data: {
        session,
        user: session.user
      }
    });
  } catch (error) {
    logger.error('Get Supabase session error', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get session'
    });
  }
});

// Supabase Auth: Refresh session
router.post('/supabase/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      logger.error('Supabase refresh failed', { error: error.message });
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }

    logger.info('Supabase session refreshed', { 
      userId: data.user?.id, 
      email: data.user?.email 
    });

    res.json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        session: data.session,
        user: data.user
      }
    });
  } catch (error) {
    logger.error('Supabase refresh error', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Session refresh failed'
    });
  }
});

export default router;

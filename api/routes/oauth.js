/**
 * OAuth2 Routes
 * Provides OAuth2 authentication endpoints
 */

import express from 'express';
import { oauth2Service } from '../services/oauthService.js';
import { logger } from '../services/monitoringService.js';

const router = express.Router();

// Get available OAuth2 providers
router.get('/providers', (req, res) => {
  try {
    const providers = oauth2Service.getAvailableProviders();
    const providerConfigs = providers.map(provider => 
      oauth2Service.getProviderConfig(provider)
    );

    res.json({
      success: true,
      data: {
        providers: providerConfigs
      }
    });
  } catch (error) {
    logger.error('Get OAuth2 providers failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get OAuth2 providers'
    });
  }
});

// Initiate OAuth2 flow
router.get('/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const { state } = req.query;

    // Generate state parameter if not provided
    const stateParam = state || generateState();

    const authUrl = oauth2Service.getAuthorizationUrl(provider, stateParam);

    logger.info('OAuth2 flow initiated', { provider, state: !!stateParam });

    res.redirect(authUrl);
  } catch (error) {
    logger.error('OAuth2 flow initiation failed', { 
      provider: req.params.provider, 
      error: error.message 
    });

    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// OAuth2 callback
router.get('/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;

    // Handle OAuth2 errors
    if (oauthError) {
      logger.error('OAuth2 authorization failed', { 
        provider, 
        error: oauthError 
      });

      return res.status(400).json({
        error: 'OAuth2 Authorization Failed',
        message: oauthError
      });
    }

    // Validate authorization code
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code is required'
      });
    }

    // Complete OAuth2 flow
    const result = await oauth2Service.completeOAuth2Flow(provider, code, state);

    // Redirect to frontend with tokens (in production, use secure cookies or postMessage)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`;

    res.redirect(redirectUrl);

  } catch (error) {
    logger.error('OAuth2 callback failed', { 
      provider: req.params.provider, 
      error: error.message 
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorUrl = `${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`;

    res.redirect(errorUrl);
  }
});

// OAuth2 token exchange (for mobile apps)
router.post('/:provider/token', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code is required'
      });
    }

    const result = await oauth2Service.completeOAuth2Flow(provider, code, state);

    res.json({
      success: true,
      message: 'OAuth2 authentication successful',
      data: result
    });

  } catch (error) {
    logger.error('OAuth2 token exchange failed', { 
      provider: req.params.provider, 
      error: error.message 
    });

    res.status(400).json({
      error: 'OAuth2 Token Exchange Failed',
      message: error.message
    });
  }
});

// Link OAuth2 provider to existing account
router.post('/:provider/link', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code and user ID are required'
      });
    }

    // Exchange code for token
    const tokenData = await oauth2Service.exchangeCodeForToken(provider, code);

    // Get user information
    const oauthUser = await oauth2Service.getUserInfo(provider, tokenData.access_token);

    // Store OAuth2 provider information
    await oauth2Service.storeOAuth2ProviderInfo(userId, oauthUser);

    logger.info('OAuth2 provider linked', { 
      userId, 
      provider, 
      email: oauthUser.email 
    });

    res.json({
      success: true,
      message: 'OAuth2 provider linked successfully'
    });

  } catch (error) {
    logger.error('OAuth2 provider linking failed', { 
      provider: req.params.provider, 
      error: error.message 
    });

    res.status(400).json({
      error: 'OAuth2 Provider Linking Failed',
      message: error.message
    });
  }
});

// Unlink OAuth2 provider
router.delete('/:provider/link', async (req, res) => {
  try {
    const { provider } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required'
      });
    }

    // Remove OAuth2 provider information
    const { error } = await supabase
      .from('oauth2_providers')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) {
      throw error;
    }

    logger.info('OAuth2 provider unlinked', { userId, provider });

    res.json({
      success: true,
      message: 'OAuth2 provider unlinked successfully'
    });

  } catch (error) {
    logger.error('OAuth2 provider unlinking failed', { 
      provider: req.params.provider, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unlink OAuth2 provider'
    });
  }
});

// Get user's linked OAuth2 providers
router.get('/user/:userId/providers', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: providers, error } = await supabase
      .from('oauth2_providers')
      .select('provider, email, full_name, picture_url, created_at')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        providers: providers || []
      }
    });

  } catch (error) {
    logger.error('Get user OAuth2 providers failed', { 
      userId: req.params.userId, 
      error: error.message 
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get OAuth2 providers'
    });
  }
});

// Revoke OAuth2 token
router.post('/:provider/revoke', async (req, res) => {
  try {
    const { provider } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token is required'
      });
    }

    await oauth2Service.revokeToken(provider, token);

    res.json({
      success: true,
      message: 'OAuth2 token revoked successfully'
    });

  } catch (error) {
    logger.error('OAuth2 token revocation failed', { 
      provider: req.params.provider, 
      error: error.message 
    });

    res.status(400).json({
      error: 'OAuth2 Token Revocation Failed',
      message: error.message
    });
  }
});

// Generate random state parameter
function generateState() {
  return require('crypto').randomBytes(32).toString('hex');
}

export default router;

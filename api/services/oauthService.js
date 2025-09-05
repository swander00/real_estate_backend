/**
 * OAuth2 Service
 * Provides OAuth2 integration for third-party authentication
 */

import { authService } from './authService.js';
import { logger } from './monitoringService.js';

class OAuth2Service {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  // Initialize OAuth2 providers
  initializeProviders() {
    // Google OAuth2
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.providers.set('google', {
        name: 'Google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
        redirectUri: `${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/oauth/google/callback`
      });
    }

    // Microsoft OAuth2
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      this.providers.set('microsoft', {
        name: 'Microsoft',
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: 'openid email profile',
        redirectUri: `${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/oauth/microsoft/callback`
      });
    }

    // GitHub OAuth2
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.providers.set('github', {
        name: 'GitHub',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scope: 'user:email',
        redirectUri: `${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/oauth/github/callback`
      });
    }

    // OAuth2 providers initialized
    console.log('OAuth2 providers initialized:', Array.from(this.providers.keys()));
  }

  // Get authorization URL for a provider
  getAuthorizationUrl(provider, state = null) {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: providerConfig.redirectUri,
      scope: providerConfig.scope,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    if (state) {
      params.append('state', state);
    }

    const authUrl = `${providerConfig.authUrl}?${params.toString()}`;
    
    logger.info('OAuth2 authorization URL generated', { 
      provider, 
      state: !!state 
    });

    return authUrl;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(provider, code, state = null) {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
      const tokenResponse = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: providerConfig.redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokenData = await tokenResponse.json();
      
      logger.info('OAuth2 token exchange successful', { 
        provider, 
        hasAccessToken: !!tokenData.access_token 
      });

      return tokenData;

    } catch (error) {
      logger.error('OAuth2 token exchange failed', { 
        provider, 
        error: error.message 
      });
      throw error;
    }
  }

  // Get user information from OAuth2 provider
  async getUserInfo(provider, accessToken) {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
      const userResponse = await fetch(providerConfig.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!userResponse.ok) {
        const error = await userResponse.text();
        throw new Error(`User info request failed: ${error}`);
      }

      const userData = await userResponse.json();
      
      // Normalize user data across providers
      const normalizedUser = this.normalizeUserData(provider, userData);
      
      logger.info('OAuth2 user info retrieved', { 
        provider, 
        userId: normalizedUser.id 
      });

      return normalizedUser;

    } catch (error) {
      logger.error('OAuth2 user info request failed', { 
        provider, 
        error: error.message 
      });
      throw error;
    }
  }

  // Normalize user data across different providers
  normalizeUserData(provider, userData) {
    switch (provider) {
      case 'google':
        return {
          id: userData.id,
          email: userData.email,
          firstName: userData.given_name,
          lastName: userData.family_name,
          fullName: userData.name,
          picture: userData.picture,
          provider: 'google',
          providerId: userData.id
        };

      case 'microsoft':
        return {
          id: userData.id,
          email: userData.mail || userData.userPrincipalName,
          firstName: userData.givenName,
          lastName: userData.surname,
          fullName: userData.displayName,
          picture: null, // Microsoft Graph doesn't provide profile picture in basic scope
          provider: 'microsoft',
          providerId: userData.id
        };

      case 'github':
        return {
          id: userData.id,
          email: userData.email,
          firstName: userData.name?.split(' ')[0] || userData.login,
          lastName: userData.name?.split(' ').slice(1).join(' ') || '',
          fullName: userData.name || userData.login,
          picture: userData.avatar_url,
          provider: 'github',
          providerId: userData.id
        };

      default:
        throw new Error(`Unknown OAuth2 provider: ${provider}`);
    }
  }

  // Create or update user from OAuth2 data
  async createOrUpdateUser(oauthUser) {
    try {
      // Check if user already exists by email
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', oauthUser.email)
        .single();

      if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw userError;
      }

      let user;
      if (existingUser) {
        // Update existing user with OAuth2 provider info
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            full_name: oauthUser.fullName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        user = updatedUser;
        logger.info('OAuth2 user updated', { userId: user.id, provider: oauthUser.provider });
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: oauthUser.email,
            full_name: oauthUser.fullName,
            role: 'viewer', // Default role for OAuth2 users
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        user = newUser;
        logger.info('OAuth2 user created', { userId: user.id, provider: oauthUser.provider });
      }

      // Store OAuth2 provider information
      await this.storeOAuth2ProviderInfo(user.id, oauthUser);

      return user;

    } catch (error) {
      logger.error('OAuth2 user creation/update failed', { 
        email: oauthUser.email, 
        error: error.message 
      });
      throw error;
    }
  }

  // Store OAuth2 provider information
  async storeOAuth2ProviderInfo(userId, oauthUser) {
    try {
      const { error } = await supabase
        .from('oauth2_providers')
        .upsert({
          user_id: userId,
          provider: oauthUser.provider,
          provider_id: oauthUser.providerId,
          email: oauthUser.email,
          first_name: oauthUser.firstName,
          last_name: oauthUser.lastName,
          full_name: oauthUser.fullName,
          picture_url: oauthUser.picture,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) {
        throw error;
      }

    } catch (error) {
      logger.error('OAuth2 provider info storage failed', { 
        userId, 
        provider: oauthUser.provider, 
        error: error.message 
      });
      throw error;
    }
  }

  // Complete OAuth2 flow
  async completeOAuth2Flow(provider, code, state = null) {
    try {
      // Exchange code for token
      const tokenData = await this.exchangeCodeForToken(provider, code, state);

      // Get user information
      const oauthUser = await this.getUserInfo(provider, tokenData.access_token);

      // Create or update user
      const user = await this.createOrUpdateUser(oauthUser);

      // Generate JWT tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      };

      const accessToken = authService.generateToken(tokenPayload);
      const refreshToken = authService.generateRefreshToken({ userId: user.id });

      // Store refresh token
      await authService.storeRefreshToken(user.id, refreshToken);

      logger.info('OAuth2 flow completed successfully', { 
        userId: user.id, 
        provider, 
        email: user.email 
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          provider: oauthUser.provider
        },
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };

    } catch (error) {
      logger.error('OAuth2 flow failed', { 
        provider, 
        error: error.message 
      });
      throw error;
    }
  }

  // Get available providers
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  // Get provider configuration (without secrets)
  getProviderConfig(provider) {
    const config = this.providers.get(provider);
    if (!config) {
      return null;
    }

    return {
      name: config.name,
      clientId: config.clientId,
      authUrl: config.authUrl,
      scope: config.scope,
      redirectUri: config.redirectUri
    };
  }

  // Revoke OAuth2 token
  async revokeToken(provider, token) {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
      const revokeUrl = this.getRevokeUrl(provider);
      if (!revokeUrl) {
        throw new Error(`Token revocation not supported for provider: ${provider}`);
      }

      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`Token revocation failed: ${response.statusText}`);
      }

      logger.info('OAuth2 token revoked', { provider });

    } catch (error) {
      logger.error('OAuth2 token revocation failed', { 
        provider, 
        error: error.message 
      });
      throw error;
    }
  }

  // Get token revocation URL for provider
  getRevokeUrl(provider) {
    const revokeUrls = {
      google: 'https://oauth2.googleapis.com/revoke',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
      github: null // GitHub doesn't support token revocation
    };

    return revokeUrls[provider] || null;
  }
}

// Create global OAuth2 service instance
const oauth2Service = new OAuth2Service();

export { oauth2Service };
export default oauth2Service;

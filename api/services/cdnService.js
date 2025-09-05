/**
 * CDN Service
 * Provides CDN integration and advanced optimization features
 */

import { logger } from './monitoringService.js';

class CDNService {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  // Initialize CDN providers
  initializeProviders() {
    // Cloudflare
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
      this.providers.set('cloudflare', {
        name: 'Cloudflare',
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        apiUrl: 'https://api.cloudflare.com/client/v4',
        enabled: true
      });
    }

    // AWS CloudFront
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID) {
      this.providers.set('cloudfront', {
        name: 'AWS CloudFront',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
        region: process.env.AWS_REGION || 'us-east-1',
        enabled: true
      });
    }

    // KeyCDN
    if (process.env.KEYCDN_API_KEY && process.env.KEYCDN_ZONE_ID) {
      this.providers.set('keycdn', {
        name: 'KeyCDN',
        apiKey: process.env.KEYCDN_API_KEY,
        zoneId: process.env.KEYCDN_ZONE_ID,
        apiUrl: 'https://api.keycdn.com',
        enabled: true
      });
    }

    // CDN providers initialized
    console.log('CDN providers initialized:', Array.from(this.providers.keys()));
  }

  // Purge CDN cache
  async purgeCache(urls = [], provider = null) {
    const results = [];

    if (provider) {
      // Purge specific provider
      const providerConfig = this.providers.get(provider);
      if (providerConfig && providerConfig.enabled) {
        const result = await this.purgeProviderCache(provider, urls);
        results.push(result);
      }
    } else {
      // Purge all providers
      for (const [providerName, providerConfig] of this.providers.entries()) {
        if (providerConfig.enabled) {
          const result = await this.purgeProviderCache(providerName, urls);
          results.push(result);
        }
      }
    }

    return results;
  }

  // Purge cache for specific provider
  async purgeProviderCache(provider, urls) {
    try {
      switch (provider) {
        case 'cloudflare':
          return await this.purgeCloudflareCache(urls);
        case 'cloudfront':
          return await this.purgeCloudFrontCache(urls);
        case 'keycdn':
          return await this.purgeKeyCDNCache(urls);
        default:
          throw new Error(`Unknown CDN provider: ${provider}`);
      }
    } catch (error) {
      logger.error('CDN cache purge failed', { 
        provider, 
        urls, 
        error: error.message 
      });
      return {
        provider,
        success: false,
        error: error.message
      };
    }
  }

  // Purge Cloudflare cache
  async purgeCloudflareCache(urls) {
    const provider = this.providers.get('cloudflare');
    if (!provider) {
      throw new Error('Cloudflare not configured');
    }

    const response = await fetch(`${provider.apiUrl}/zones/${provider.zoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: urls.length > 0 ? urls : undefined,
        purge_everything: urls.length === 0
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
    }

    logger.info('Cloudflare cache purged', { urls, success: result.success });

    return {
      provider: 'cloudflare',
      success: result.success,
      result
    };
  }

  // Purge AWS CloudFront cache
  async purgeCloudFrontCache(urls) {
    const provider = this.providers.get('cloudfront');
    if (!provider) {
      throw new Error('AWS CloudFront not configured');
    }

    // Note: This is a simplified implementation
    // In production, you would use the AWS SDK
    const response = await fetch(`https://cloudfront.amazonaws.com/2020-05-31/distribution/${provider.distributionId}/invalidation`, {
      method: 'POST',
      headers: {
        'Authorization': `AWS4-HMAC-SHA256 Credential=${provider.accessKeyId}`,
        'Content-Type': 'application/xml'
      },
      body: JSON.stringify({
        DistributionId: provider.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: urls.length,
            Items: urls
          },
          CallerReference: `purge-${Date.now()}`
        }
      })
    });

    const result = await response.json();

    logger.info('CloudFront cache purged', { urls, success: response.ok });

    return {
      provider: 'cloudfront',
      success: response.ok,
      result
    };
  }

  // Purge KeyCDN cache
  async purgeKeyCDNCache(urls) {
    const provider = this.providers.get('keycdn');
    if (!provider) {
      throw new Error('KeyCDN not configured');
    }

    const response = await fetch(`${provider.apiUrl}/zones/${provider.zoneId}/purge`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(provider.apiKey + ':').toString('base64')}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`KeyCDN API error: ${result.message || 'Unknown error'}`);
    }

    logger.info('KeyCDN cache purged', { urls, success: result.status === 'success' });

    return {
      provider: 'keycdn',
      success: result.status === 'success',
      result
    };
  }

  // Get CDN statistics
  async getCDNStats(provider = null) {
    const results = [];

    if (provider) {
      const providerConfig = this.providers.get(provider);
      if (providerConfig && providerConfig.enabled) {
        const stats = await this.getProviderStats(provider);
        results.push(stats);
      }
    } else {
      for (const [providerName, providerConfig] of this.providers.entries()) {
        if (providerConfig.enabled) {
          const stats = await this.getProviderStats(providerName);
          results.push(stats);
        }
      }
    }

    return results;
  }

  // Get statistics for specific provider
  async getProviderStats(provider) {
    try {
      switch (provider) {
        case 'cloudflare':
          return await this.getCloudflareStats();
        case 'cloudfront':
          return await this.getCloudFrontStats();
        case 'keycdn':
          return await this.getKeyCDNStats();
        default:
          throw new Error(`Unknown CDN provider: ${provider}`);
      }
    } catch (error) {
      logger.error('CDN stats retrieval failed', { 
        provider, 
        error: error.message 
      });
      return {
        provider,
        success: false,
        error: error.message
      };
    }
  }

  // Get Cloudflare statistics
  async getCloudflareStats() {
    const provider = this.providers.get('cloudflare');
    if (!provider) {
      throw new Error('Cloudflare not configured');
    }

    const response = await fetch(`${provider.apiUrl}/zones/${provider.zoneId}/analytics/dashboard`, {
      headers: {
        'Authorization': `Bearer ${provider.apiToken}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
    }

    return {
      provider: 'cloudflare',
      success: true,
      stats: result.result
    };
  }

  // Get AWS CloudFront statistics
  async getCloudFrontStats() {
    const provider = this.providers.get('cloudfront');
    if (!provider) {
      throw new Error('AWS CloudFront not configured');
    }

    // Note: This is a simplified implementation
    // In production, you would use the AWS SDK to get detailed statistics
    return {
      provider: 'cloudfront',
      success: true,
      stats: {
        distributionId: provider.distributionId,
        status: 'active'
      }
    };
  }

  // Get KeyCDN statistics
  async getKeyCDNStats() {
    const provider = this.providers.get('keycdn');
    if (!provider) {
      throw new Error('KeyCDN not configured');
    }

    const response = await fetch(`${provider.apiUrl}/zones/${provider.zoneId}/stats`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(provider.apiKey + ':').toString('base64')}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`KeyCDN API error: ${result.message || 'Unknown error'}`);
    }

    return {
      provider: 'keycdn',
      success: true,
      stats: result.data
    };
  }

  // Optimize images
  async optimizeImage(imageUrl, options = {}) {
    const {
      width,
      height,
      quality = 80,
      format = 'auto',
      provider = 'cloudflare'
    } = options;

    try {
      switch (provider) {
        case 'cloudflare':
          return await this.optimizeImageCloudflare(imageUrl, { width, height, quality, format });
        case 'cloudfront':
          return await this.optimizeImageCloudFront(imageUrl, { width, height, quality, format });
        default:
          throw new Error(`Image optimization not supported for provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Image optimization failed', { 
        imageUrl, 
        options, 
        error: error.message 
      });
      throw error;
    }
  }

  // Optimize image using Cloudflare
  async optimizeImageCloudflare(imageUrl, options) {
    const { width, height, quality, format } = options;
    
    // Cloudflare Image Resizing
    const params = new URLSearchParams();
    if (width) params.append('width', width);
    if (height) params.append('height', height);
    if (quality) params.append('quality', quality);
    if (format) params.append('format', format);

    const optimizedUrl = `${imageUrl}?${params.toString()}`;
    
    return {
      originalUrl: imageUrl,
      optimizedUrl,
      provider: 'cloudflare',
      options
    };
  }

  // Optimize image using AWS CloudFront
  async optimizeImageCloudFront(imageUrl, options) {
    const { width, height, quality, format } = options;
    
    // AWS CloudFront with Lambda@Edge for image optimization
    const params = new URLSearchParams();
    if (width) params.append('w', width);
    if (height) params.append('h', height);
    if (quality) params.append('q', quality);
    if (format) params.append('f', format);

    const optimizedUrl = `${imageUrl}?${params.toString()}`;
    
    return {
      originalUrl: imageUrl,
      optimizedUrl,
      provider: 'cloudfront',
      options
    };
  }

  // Get available providers
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  // Check if provider is enabled
  isProviderEnabled(provider) {
    const providerConfig = this.providers.get(provider);
    return providerConfig && providerConfig.enabled;
  }

  // Generate CDN URL
  generateCDNUrl(path, provider = null) {
    const cdnDomains = {
      cloudflare: process.env.CLOUDFLARE_CDN_DOMAIN,
      cloudfront: process.env.AWS_CLOUDFRONT_DOMAIN,
      keycdn: process.env.KEYCDN_DOMAIN
    };

    if (provider && cdnDomains[provider]) {
      return `https://${cdnDomains[provider]}${path}`;
    }

    // Return first available CDN domain
    for (const [providerName, domain] of Object.entries(cdnDomains)) {
      if (domain && this.isProviderEnabled(providerName)) {
        return `https://${domain}${path}`;
      }
    }

    // Fallback to original URL
    return path;
  }

  // Health check
  async healthCheck() {
    const results = [];

    for (const [providerName, providerConfig] of this.providers.entries()) {
      if (providerConfig.enabled) {
        try {
          const stats = await this.getProviderStats(providerName);
          results.push({
            provider: providerName,
            status: stats.success ? 'healthy' : 'unhealthy',
            error: stats.error
          });
        } catch (error) {
          results.push({
            provider: providerName,
            status: 'unhealthy',
            error: error.message
          });
        }
      }
    }

    return {
      status: results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
      providers: results,
      timestamp: new Date().toISOString()
    };
  }
}

// Create global CDN service instance
const cdnService = new CDNService();

export { cdnService };
export default cdnService;

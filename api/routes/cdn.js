/**
 * CDN Routes
 * Provides CDN management and optimization endpoints
 */

import express from 'express';
import { cdnService } from '../services/cdnService.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { logger } from '../services/monitoringService.js';

const router = express.Router();

// Get available CDN providers
router.get('/providers', authenticate, (req, res) => {
  try {
    const providers = cdnService.getAvailableProviders();
    const providerStatus = providers.map(provider => ({
      name: provider,
      enabled: cdnService.isProviderEnabled(provider)
    }));

    res.json({
      success: true,
      data: {
        providers: providerStatus
      }
    });
  } catch (error) {
    logger.error('Get CDN providers failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get CDN providers'
    });
  }
});

// Get CDN statistics
router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const { provider } = req.query;
    const stats = await cdnService.getCDNStats(provider);

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    logger.error('Get CDN stats failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get CDN statistics'
    });
  }
});

// Purge CDN cache
router.post('/purge', authenticate, adminOnly, async (req, res) => {
  try {
    const { urls, provider } = req.body;

    if (!Array.isArray(urls) && urls !== undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URLs must be an array'
      });
    }

    const results = await cdnService.purgeCache(urls, provider);

    const success = results.every(result => result.success);
    const statusCode = success ? 200 : 207; // 207 Multi-Status for partial success

    res.status(statusCode).json({
      success,
      message: success ? 'CDN cache purged successfully' : 'CDN cache purge completed with errors',
      data: {
        results
      }
    });

  } catch (error) {
    logger.error('CDN cache purge failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to purge CDN cache'
    });
  }
});

// Optimize image
router.post('/optimize/image', authenticate, async (req, res) => {
  try {
    const { imageUrl, options = {} } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Image URL is required'
      });
    }

    const result = await cdnService.optimizeImage(imageUrl, options);

    res.json({
      success: true,
      message: 'Image optimization completed',
      data: result
    });

  } catch (error) {
    logger.error('Image optimization failed', { error: error.message });
    res.status(400).json({
      error: 'Image Optimization Failed',
      message: error.message
    });
  }
});

// Generate CDN URL
router.post('/url', authenticate, (req, res) => {
  try {
    const { path, provider } = req.body;

    if (!path) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Path is required'
      });
    }

    const cdnUrl = cdnService.generateCDNUrl(path, provider);

    res.json({
      success: true,
      data: {
        originalPath: path,
        cdnUrl,
        provider: provider || 'auto'
      }
    });

  } catch (error) {
    logger.error('CDN URL generation failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate CDN URL'
    });
  }
});

// CDN health check
router.get('/health', authenticate, adminOnly, async (req, res) => {
  try {
    const health = await cdnService.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });

  } catch (error) {
    logger.error('CDN health check failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform CDN health check'
    });
  }
});

// Bulk image optimization
router.post('/optimize/bulk', authenticate, async (req, res) => {
  try {
    const { images, options = {} } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Images array is required and must not be empty'
      });
    }

    if (images.length > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 100 images can be optimized at once'
      });
    }

    const results = await Promise.allSettled(
      images.map(imageUrl => cdnService.optimizeImage(imageUrl, options))
    );

    const successful = results.filter(result => result.status === 'fulfilled');
    const failed = results.filter(result => result.status === 'rejected');

    res.json({
      success: failed.length === 0,
      message: `Optimized ${successful.length} images, ${failed.length} failed`,
      data: {
        total: images.length,
        successful: successful.length,
        failed: failed.length,
        results: results.map((result, index) => ({
          imageUrl: images[index],
          success: result.status === 'fulfilled',
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      }
    });

  } catch (error) {
    logger.error('Bulk image optimization failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to optimize images'
    });
  }
});

// Get optimization presets
router.get('/presets', authenticate, (req, res) => {
  try {
    const presets = {
      thumbnail: {
        width: 150,
        height: 150,
        quality: 80,
        format: 'webp'
      },
      medium: {
        width: 500,
        height: 500,
        quality: 85,
        format: 'webp'
      },
      large: {
        width: 1200,
        height: 1200,
        quality: 90,
        format: 'webp'
      },
      hero: {
        width: 1920,
        height: 1080,
        quality: 95,
        format: 'webp'
      },
      avatar: {
        width: 100,
        height: 100,
        quality: 90,
        format: 'webp'
      }
    };

    res.json({
      success: true,
      data: {
        presets
      }
    });

  } catch (error) {
    logger.error('Get optimization presets failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get optimization presets'
    });
  }
});

// Optimize image with preset
router.post('/optimize/preset/:presetName', authenticate, async (req, res) => {
  try {
    const { presetName } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Image URL is required'
      });
    }

    const presets = {
      thumbnail: { width: 150, height: 150, quality: 80, format: 'webp' },
      medium: { width: 500, height: 500, quality: 85, format: 'webp' },
      large: { width: 1200, height: 1200, quality: 90, format: 'webp' },
      hero: { width: 1920, height: 1080, quality: 95, format: 'webp' },
      avatar: { width: 100, height: 100, quality: 90, format: 'webp' }
    };

    const preset = presets[presetName];
    if (!preset) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Unknown preset: ${presetName}. Available presets: ${Object.keys(presets).join(', ')}`
      });
    }

    const result = await cdnService.optimizeImage(imageUrl, preset);

    res.json({
      success: true,
      message: `Image optimized with ${presetName} preset`,
      data: {
        ...result,
        preset: presetName
      }
    });

  } catch (error) {
    logger.error('Image optimization with preset failed', { 
      presetName: req.params.presetName, 
      error: error.message 
    });
    res.status(400).json({
      error: 'Image Optimization Failed',
      message: error.message
    });
  }
});

export default router;

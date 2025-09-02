// api/routes/media.js - Property media routes
import express from 'express';
import { supabase } from '../../server.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/media
 * Get media with filtering and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      listingKey,
      mediaType,
      category
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('property_media')
      .select('*')
      .range(offset, offset + limitNum - 1);

    if (listingKey) {
      query = query.eq('ResourceRecordKey', listingKey);
    }
    if (mediaType) {
      query = query.eq('MediaType', mediaType);
    }
    if (category) {
      query = query.eq('MediaCategory', category);
    }

    const { data: media, error } = await query;
    if (error) throw error;

    res.json({
      data: media || [],
      pagination: {
        page: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/media/:mediaKey
 * Get specific media by media key
 */
router.get('/:mediaKey', async (req, res, next) => {
  try {
    const { mediaKey } = req.params;
    
    const { data: media, error } = await supabase
      .from('property_media')
      .select('*')
      .eq('MediaKey', mediaKey)
      .single();

    if (error || !media) {
      throw new NotFoundError(`Media with key ${mediaKey} not found`);
    }

    res.json({ data: media });

  } catch (error) {
    next(error);
  }
});

export default router;

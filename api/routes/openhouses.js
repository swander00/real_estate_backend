// api/routes/openhouses.js - Open house routes
import express from 'express';
import { supabase } from '../../server.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/openhouses
 * Get open houses with filtering and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      listingKey,
      date,
      city
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('property_openhouse')
      .select('*')
      .range(offset, offset + limitNum - 1);

    if (listingKey) {
      query = query.eq('ListingKey', listingKey);
    }
    if (date) {
      query = query.eq('OpenHouseDate', date);
    }
    if (city) {
      // Join with common_fields to filter by city
      query = supabase
        .from('property_openhouse')
        .select(`
          *,
          common_fields!inner(City)
        `)
        .ilike('common_fields.City', `%${city}%`)
        .range(offset, offset + limitNum - 1);
    }

    const { data: openHouses, error } = await query;
    if (error) throw error;

    res.json({
      data: openHouses || [],
      pagination: {
        page: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;

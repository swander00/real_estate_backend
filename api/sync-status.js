import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    // Check sync state
    const { data, error } = await supabase
      .from('sync_state')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Get record counts from main tables
    const counts = {};
    const tables = ['common_fields', 'property_media', 'property_rooms', 'property_openhouse'];
    
    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!countError) counts[table] = count;
    }

    res.status(200).json({
      status: 'success',
      last_syncs: data,
      record_counts: counts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
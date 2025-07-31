import { supabase } from './supabaseClient.js';

export async function upsertToTable(table, data, conflictKey = 'listing_key') {
  if (!data.length) {
    console.log(`[${table}] No records to upsert.`);
    return;
  }

  const { error } = await supabase
    .from(table)
    .upsert(data, { onConflict: [conflictKey] });

  if (error) {
    throw new Error(`[${table}] Upsert failed: ${error.message}`);
  }

  console.log(`✅ Upserted ${data.length} records into ${table}`);
}

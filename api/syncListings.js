import { fetchFeed } from '../lib/fetchFeed.js';
import { upsertToTable } from '../lib/loaders.js';
import { mapResidentialFreeholdSale } from '../mappers/mappers.js';
import 'dotenv/config';

const IDX_URL = `${process.env.IDX_API_URL}?$filter=ContractStatus eq 'Available'`;

export default async function handler(req, res) {
  try {
    const raw = await fetchFeed(IDX_URL, process.env.IDX_TOKEN);
    const mapped = mapResidentialFreeholdSale(raw);
    await upsertToTable('residential_freehold_sale', mapped);
    res.status(200).json({ success: true, records: mapped.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

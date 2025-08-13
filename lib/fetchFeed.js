import fetch from 'node-fetch';

/**
 * Fetch one page from an OData feed.
 * Supports BOTH:
 *  - server-driven paging via @odata.nextLink (preferred), and
 *  - manual $skip/$top (fallback when nextLink isn't provided).
 *
 * @param {Object} args
 * @param {string} args.baseUrl   Base OData URL (without $skip/$top)
 * @param {string} args.token     Bearer token
 * @param {number} args.top       Page size (e.g., 5000)
 * @param {string|null} args.next Cursor URL (full URL from @odata.nextLink). If provided, it takes precedence over baseUrl/skip/top.
 * @param {number} [args.skip]    Fallback offset (only used if next is null and server doesn't emit nextLink)
 * @returns {Promise<{ records: any[], next: string|null }>}
 */
export async function fetchODataPage({ baseUrl, token, top, next = null, skip = 0 }) {
  const url = next ?? `${baseUrl}&$top=${top}&$skip=${skip}`;
  console.log(`🔁 Fetching page: ${next ? 'nextLink' : `$skip=${skip}, $top=${top}`}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Fetch error (${res.status}): ${text}`);
    return { records: [], next: null };
  }

  const json = await res.json();
  const records = Array.isArray(json?.value) ? json.value : [];
  // OData v4 uses @odata.nextLink; some servers use 'odata.nextLink'
  const nextLink = json['@odata.nextLink'] || json['odata.nextLink'] || null;
  return { records, next: nextLink || null };
}

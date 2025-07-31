import fetch from 'node-fetch';

/**
 * Fetch paginated records using manual $skip and $top
 * @param {string} url - Base OData URL from env
 * @param {string} token - IDX or VOW token
 * @param {number} limit - Max records to fetch
 * @returns {Promise<Array<Object>>}
 */
export async function fetchPagesWithSkip(url, token, limit = 1000) {
  const pageSize = 100;
  const all = [];

  for (let skip = 0; skip < limit; skip += pageSize) {
    const pagedUrl = `${url}&$skip=${skip}`;
    console.log(`🔁 Fetching: $skip=${skip}`);

    try {
      const res = await fetch(pagedUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Fetch error (${res.status}): ${errorText}`);
        break;
      }

      const json = await res.json();
      const records = json.value || [];

      if (!records.length) break;
      all.push(...records);

      if (records.length < pageSize) break; // last page

    } catch (err) {
      console.error(`❌ Network error: ${err.message}`);
      break;
    }
  }

  return all;
}

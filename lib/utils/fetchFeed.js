// lib/utils/fetchFeed.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const logger = require('./logger');


/**
 * Generic API client with retry + logging support for OData endpoints.
 */
class ApiClient {
  constructor(token, retryAttempts = 3, retryDelay = 500) {
    this.token = token;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
  }

  async fetchWithRetry(url, options = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(`🌐 Fetch attempt ${attempt}: ${url}`);

        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json',
            'User-Agent': 'TRREB-Sync/1.0',
            ...options.headers
          }
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const errMsg = `HTTP ${response.status} ${response.statusText} for ${url}`;
          logger.error(`❌ ${errMsg}`);
          if (errorText) logger.error(`Response body: ${errorText}`);
          throw new Error(`${errMsg}${errorText ? ' - ' + errorText : ''}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        logger.error(`[fetchWithRetry] Attempt ${attempt} failed: ${error.message}`);
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    logger.error(`❌ All fetch attempts failed for URL: ${url}`);
    throw lastError;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Fetches a single page of OData results (with optional pagination).
 * Returns { value, next } where value = array of results, next = nextLink if exists.
 */
async function fetchODataPage({ baseUrl, token, top = 5000, next = null, skip = null, filter = null, orderby = null }) {
  const client = new ApiClient(token);

  let finalUrl;
  if (next) {
    finalUrl = next;
  } else {
    // Build URL manually to avoid over-encoding issues
    const params = [];
    
    if (filter) {
      // Don't encode the filter value - OData expects it in a specific format
      params.push(`$filter=${filter}`);
    }
    
    if (orderby && process.env.ENABLE_ORDERBY !== 'false') {
      params.push(`$orderby=${orderby}`);
    }
    
    if (top) {
      params.push(`$top=${top}`);
    }
    
    if (skip) {
      params.push(`$skip=${skip}`);
    }

    // Join parameters with & 
    const queryString = params.join('&');
    finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  logger.debug(`[fetchODataPage] Final URL: ${finalUrl}`);

  const data = await client.fetchWithRetry(finalUrl);
  
  // Debug logging to understand pagination
  if (process.env.DEBUG === 'true') {
    logger.debug(`[fetchODataPage] Response keys: ${Object.keys(data).join(', ')}`);
    if (data['@odata.count']) {
      logger.debug(`[fetchODataPage] Total count available: ${data['@odata.count']}`);
    }
    if (data['@odata.nextLink']) {
      logger.debug(`[fetchODataPage] Next link: ${data['@odata.nextLink']}`);
    }
  }

  return {
    value: data?.value || [],
    next: data?.['@odata.nextLink'] || null,
    count: data?.['@odata.count'] || null
  };
}

module.exports = { fetchODataPage };
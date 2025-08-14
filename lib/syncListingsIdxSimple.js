// lib/fetchFeed.js
// Enhanced OData page fetcher that works with pre-encoded URLs
export async function fetchODataPage({ 
  baseUrl, 
  token, 
  top = 5000, 
  next = null, 
  skip = null, 
  filter = null, 
  orderby = null 
}) {
  let finalUrl;
  
  if (next) {
    // Use nextLink as-is
    finalUrl = next;
  } else {
    // Start with the base URL
    let urlString = baseUrl;
    
    // Add parameters by appending to the URL string to avoid double-encoding
    const separator = baseUrl.includes('?') ? '&' : '?';
    const params = [];
    
    // Add $top if not already present
    if (!baseUrl.includes('$top=')) {
      params.push(`$top=${top}`);
    }
    
    // Add $skip if provided and not already present
    if (skip !== null && !baseUrl.includes('$skip=')) {
      params.push(`$skip=${skip}`);
    }
    
    // Add $orderby if provided and not already present
    if (orderby && !baseUrl.includes('$orderby=')) {
      params.push(`$orderby=${encodeURIComponent(orderby)}`);
    }
    
    // Handle filter - this is the tricky part
    if (filter) {
      if (baseUrl.includes('$filter=')) {
        // Base URL already has a filter - we need to combine them
        // Extract the existing filter from the URL
        const url = new URL(baseUrl);
        const existingFilter = url.searchParams.get('$filter');
        if (existingFilter) {
          const combinedFilter = `(${existingFilter}) and (${filter})`;
          // Replace the existing filter in the URL string
          const filterRegex = /(\$filter=)[^&]*/;
          urlString = baseUrl.replace(filterRegex, `$1${encodeURIComponent(combinedFilter)}`);
        }
      } else {
        // No existing filter, just add ours
        params.push(`$filter=${encodeURIComponent(filter)}`);
      }
    }
    
    // Append new parameters
    if (params.length > 0) {
      finalUrl = urlString + separator + params.join('&');
    } else {
      finalUrl = urlString;
    }
  }
  
  console.log(`🌐 Fetching URL: ${finalUrl}`);
  
  const res = await fetch(finalUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  
  const data = await res.json();
  return {
    records: Array.isArray(data.value) ? data.value : [],
    next: data['@odata.nextLink'] || null,
  };
}
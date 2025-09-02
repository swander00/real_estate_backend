// lib/fetchFeed.js
// Fixed OData page fetcher that handles pre-encoded URLs properly
// Works with Node 18+ (global fetch). If you need a polyfill, add it in your app entry.
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
    // Start with the base URL and append parameters carefully to avoid double-encoding
    let urlString = baseUrl;
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
    
    // Handle filter combination - this is complex with pre-encoded URLs
    if (filter) {
      if (baseUrl.includes('$filter=')) {
        // Base URL already has a filter - we need to combine them
        // For now, we'll skip filter combination to get basic sync working
        // This can be added later for date filtering
        console.warn('⚠️ Filter combination not yet implemented - using base URL filter only');
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
  
  // Clean logging - just show key info, not the full URL
  const urlObj = new URL(finalUrl);
  const tableName = urlObj.pathname.split('/').pop();
  const skipParam = urlObj.searchParams.get('$skip') || '0';
  const topParam = urlObj.searchParams.get('$top') || '5000';
  console.log(`    🌐 ${tableName}: $skip=${skipParam}, $top=${topParam}`);
  
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
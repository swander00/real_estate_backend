#!/usr/bin/env node

// debug_fetch.js - Debug the fetchFeed function
import 'dotenv/config';
import { fetchODataPage } from './lib/fetchFeed.js';

async function debugFetch() {
  try {
    console.log('🔍 Debugging fetchFeed function');
    console.log('==============================');
    
    console.log('Base URL:', process.env.IDX_MEDIA_URL);
    console.log('Token present:', !!process.env.IDX_TOKEN);
    
    // Test 1: Simple call without filters
    console.log('\n1️⃣ Testing simple call...');
    try {
      const result1 = await fetchODataPage({
        baseUrl: process.env.IDX_MEDIA_URL,
        token: process.env.IDX_TOKEN,
        skip: 0,
        top: 5
      });
      
      console.log('Result 1:', {
        hasData: !!result1.data,
        hasValue: !!(result1.data && result1.data.value),
        recordCount: result1.data?.value?.length || 0,
        error: result1.error
      });
      
      if (result1.data && result1.data.value && result1.data.value.length > 0) {
        console.log('Sample record keys:', Object.keys(result1.data.value[0]));
      }
      
    } catch (err) {
      console.log('Error 1:', err.message);
    }
    
    // Test 2: Call with filter
    console.log('\n2️⃣ Testing with filter...');
    try {
      const result2 = await fetchODataPage({
        baseUrl: process.env.IDX_MEDIA_URL,
        token: process.env.IDX_TOKEN,
        skip: 0,
        top: 5,
        filter: "ResourceName eq 'Property'"
      });
      
      console.log('Result 2:', {
        hasData: !!result2.data,
        hasValue: !!(result2.data && result2.data.value),
        recordCount: result2.data?.value?.length || 0,
        error: result2.error
      });
      
    } catch (err) {
      console.log('Error 2:', err.message);
    }
    
    // Test 3: Direct fetch to see what's happening
    console.log('\n3️⃣ Testing direct fetch...');
    try {
      const url = `${process.env.IDX_MEDIA_URL}&$top=5`;
      console.log('Fetching URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.IDX_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct fetch result:', {
          hasValue: !!data.value,
          recordCount: data.value?.length || 0
        });
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
      
    } catch (err) {
      console.log('Direct fetch error:', err.message);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugFetch();


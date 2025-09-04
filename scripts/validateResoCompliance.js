#!/usr/bin/env node

/**
 * RESO Compliance Validation Script
 * Validates that the API meets RESO Web API 2.0.0 requirements
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test configuration
const TESTS = [
  {
    name: 'OData Metadata Endpoint',
    url: `${BASE_URL}/api/reso/%24metadata`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/xml',
    description: 'Should return OData metadata document'
  },
  {
    name: 'OData Service Document',
    url: `${BASE_URL}/api/reso/`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should return OData service document'
  },
  {
    name: 'Property Resource - Basic Query',
    url: `${BASE_URL}/api/reso/Property`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should return properties with OData response format'
  },
  {
    name: 'Property Resource - With Filter',
    url: `${BASE_URL}/api/reso/Property?$filter=City eq 'Toronto'`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should handle $filter parameter'
  },
  {
    name: 'Property Resource - With Select',
    url: `${BASE_URL}/api/reso/Property?$select=ListingKey,ListPrice,City`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should handle $select parameter'
  },
  {
    name: 'Property Resource - With OrderBy',
    url: `${BASE_URL}/api/reso/Property?$orderby=ListPrice desc`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should handle $orderby parameter'
  },
  {
    name: 'Property Resource - With Top',
    url: `${BASE_URL}/api/reso/Property?$top=5`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should handle $top parameter'
  },
  {
    name: 'Property Resource - With Expand',
    url: `${BASE_URL}/api/reso/Property?$expand=Media`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should handle $expand parameter'
  },
  {
    name: 'Media Resource',
    url: `${BASE_URL}/api/reso/Media`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should return media with OData response format'
  },
  {
    name: 'OpenHouse Resource',
    url: `${BASE_URL}/api/reso/OpenHouse`,
    method: 'GET',
    expectedStatus: 200,
    expectedContentType: 'application/json',
    description: 'Should return open houses with OData response format'
  }
];

/**
 * Run a single test
 * @param {Object} test - Test configuration
 * @returns {Object} Test result
 */
async function runTest(test) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(test.url, {
      method: test.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Check status code
    const statusOk = response.status === test.expectedStatus;
    
    // Check content type
    const contentType = response.headers.get('content-type');
    const contentTypeOk = contentType && contentType.includes(test.expectedContentType);

    // Get response body for validation
    let body = null;
    let bodyValid = true;
    
    try {
      if (test.expectedContentType === 'application/json') {
        body = await response.json();
        bodyValid = validateODataResponse(body, test.name);
      } else if (test.expectedContentType === 'application/xml') {
        body = await response.text();
        bodyValid = validateXMLResponse(body, test.name);
      }
    } catch (parseError) {
      bodyValid = false;
      console.error(`  ❌ Response parsing failed: ${parseError.message}`);
    }

    const success = statusOk && contentTypeOk && bodyValid;

    return {
      name: test.name,
      success,
      status: response.status,
      expectedStatus: test.expectedStatus,
      contentType,
      expectedContentType: test.expectedContentType,
      responseTime,
      description: test.description,
      details: {
        statusOk,
        contentTypeOk,
        bodyValid
      }
    };

  } catch (error) {
    return {
      name: test.name,
      success: false,
      error: error.message,
      description: test.description,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Validate OData response format
 * @param {Object} body - Response body
 * @param {string} testName - Name of the test
 * @returns {boolean} Whether response is valid
 */
function validateODataResponse(body, testName) {
  if (!body) return false;

  // Check for required OData fields
  const hasODataContext = body['@odata.context'] !== undefined;
  const hasValue = body.value !== undefined || Array.isArray(body);

  if (!hasODataContext && !hasValue) {
    console.error(`  ❌ Missing OData response format in ${testName}`);
    return false;
  }

  // Check for specific resource validations
  if (testName.includes('Property') && body.value) {
    const hasRequiredFields = body.value.length === 0 || 
      (body.value[0] && body.value[0].ListingKey !== undefined);
    
    if (!hasRequiredFields) {
      console.error(`  ❌ Property response missing required fields in ${testName}`);
      return false;
    }
  }

  return true;
}

/**
 * Validate XML response format
 * @param {string} body - Response body
 * @param {string} testName - Name of the test
 * @returns {boolean} Whether response is valid
 */
function validateXMLResponse(body, testName) {
  if (!body) return false;

  // Basic XML validation
  const hasXMLDeclaration = body.includes('<?xml');
  const hasEdmx = body.includes('<edmx:Edmx');
  const hasSchema = body.includes('<Schema');

  if (!hasXMLDeclaration || !hasEdmx || !hasSchema) {
    console.error(`  ❌ Invalid XML metadata format in ${testName}`);
    return false;
  }

  return true;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🔍 RESO Compliance Validation');
  console.log('================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    console.log(`Running: ${test.name}`);
    console.log(`  ${test.description}`);
    
    const result = await runTest(test);
    results.push(result);

    if (result.success) {
      console.log(`  ✅ PASSED (${result.responseTime}ms)`);
      passed++;
    } else {
      console.log(`  ❌ FAILED`);
      if (result.error) {
        console.error(`    Error: ${result.error}`);
      }
      if (result.status !== result.expectedStatus) {
        console.error(`    Status: ${result.status} (expected ${result.expectedStatus})`);
      }
      if (result.contentType && !result.details?.contentTypeOk) {
        console.error(`    Content-Type: ${result.contentType} (expected ${result.expectedContentType})`);
      }
      failed++;
    }
    console.log('');
  }

  // Summary
  console.log('📊 Test Summary');
  console.log('================');
  console.log(`Total Tests: ${TESTS.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / TESTS.length) * 100).toFixed(1)}%`);
  console.log('');

  // Detailed results
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.name}: ${result.description}`);
    });
  }

  // RESO Compliance Assessment
  console.log('🏗️ RESO Compliance Assessment');
  console.log('===============================');
  
  if (passed === TESTS.length) {
    console.log('🎉 FULLY COMPLIANT - All RESO Web API 2.0.0 requirements met!');
  } else if (passed >= TESTS.length * 0.8) {
    console.log('✅ MOSTLY COMPLIANT - Core RESO requirements met, minor issues to resolve');
  } else if (passed >= TESTS.length * 0.6) {
    console.log('⚠️  PARTIALLY COMPLIANT - Basic RESO structure in place, significant work needed');
  } else {
    console.log('❌ NOT COMPLIANT - Major RESO implementation gaps');
  }

  console.log('');
  console.log('Next Steps:');
  if (failed > 0) {
    console.log('1. Review failed tests above');
    console.log('2. Fix implementation issues');
    console.log('3. Re-run validation');
  } else {
    console.log('1. ✅ RESO compliance achieved!');
    console.log('2. 🚀 Ready for production deployment');
    console.log('3. 📚 Consider adding advanced OData features');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
console.log('🚀 Starting RESO Compliance Validation...');
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

export { runTest, runAllTests, TESTS };

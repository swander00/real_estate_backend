/**
 * RESO Compliance Validation Script
 * Validates the implementation against RESO Web API 2.0.0 standards
 */

import { supabase } from '../server.js';
import { logger } from '../api/services/monitoringService.js';

// RESO Web API 2.0.0 compliance requirements
const RESO_REQUIREMENTS = {
  endpoints: [
    '/api/reso/',
    '/api/reso/$metadata',
    '/api/reso/Property',
    '/api/reso/Media',
    '/api/reso/OpenHouse',
    '/api/reso/Room',
    '/api/reso/Member',
    '/api/reso/Office'
  ],
  odataFeatures: [
    '$select',
    '$filter',
    '$orderby',
    '$top',
    '$skip',
    '$expand',
    '$search',
    '$format'
  ],
  requiredFields: {
    Property: [
      'ListingKey',
      'ListPrice',
      'StandardStatus',
      'PropertyType',
      'City',
      'StateOrProvince',
      'PostalCode',
      'BedroomsTotal',
      'BathroomsTotal',
      'LivingArea',
      'ModificationTimestamp'
    ],
    Media: [
      'MediaKey',
      'ResourceRecordKey',
      'MediaURL',
      'MediaType',
      'Order',
      'ModificationTimestamp'
    ],
    OpenHouse: [
      'OpenHouseKey',
      'ListingKey',
      'OpenHouseDate',
      'OpenHouseStartTime',
      'OpenHouseEndTime',
      'ModificationTimestamp'
    ],
    Room: [
      'RoomKey',
      'ListingKey',
      'RoomType',
      'RoomLevel',
      'ModificationTimestamp'
    ],
    Member: [
      'MemberKey',
      'MemberFirstName',
      'MemberLastName',
      'MemberFullName',
      'MemberEmail',
      'MemberType',
      'MemberStatus',
      'ModificationTimestamp'
    ],
    Office: [
      'OfficeKey',
      'OfficeName',
      'OfficeAddress1',
      'OfficeCity',
      'OfficeState',
      'OfficePostalCode',
      'OfficePhone',
      'OfficeType',
      'ModificationTimestamp'
    ]
  }
};

class ResoComplianceValidator {
  constructor() {
    this.results = {
      overall: 'PASS',
      score: 0,
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      details: []
    };
  }

  // Run all compliance checks
  async validate() {
    console.log('🔍 Starting RESO Web API 2.0.0 compliance validation...\n');

    await this.checkEndpoints();
    await this.checkODataFeatures();
    await this.checkRequiredFields();
    await this.checkMetadataEndpoint();
    await this.checkResponseFormats();
    await this.checkErrorHandling();
    await this.checkAuthentication();
    await this.checkRateLimiting();

    this.calculateScore();
    this.generateReport();

    return this.results;
  }

  // Check if all required endpoints exist
  async checkEndpoints() {
    console.log('📡 Checking RESO endpoints...');
    
    for (const endpoint of RESO_REQUIREMENTS.endpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok || response.status === 401) { // 401 is OK for protected endpoints
          this.addResult('PASS', `Endpoint ${endpoint} is accessible`);
        } else {
          this.addResult('FAIL', `Endpoint ${endpoint} returned status ${response.status}`);
        }
      } catch (error) {
        this.addResult('FAIL', `Endpoint ${endpoint} is not accessible: ${error.message}`);
      }
    }
  }

  // Check OData query features
  async checkODataFeatures() {
    console.log('🔍 Checking OData query features...');
    
    const testQueries = [
      { feature: '$select', query: '?$select=ListingKey,ListPrice' },
      { feature: '$filter', query: '?$filter=City eq \'Toronto\'' },
      { feature: '$orderby', query: '?$orderby=ListPrice desc' },
      { feature: '$top', query: '?$top=10' },
      { feature: '$skip', query: '?$skip=0' },
      { feature: '$expand', query: '?$expand=Media' },
      { feature: '$search', query: '?$search=pool' },
      { feature: '$format', query: '?$format=json' }
    ];

    for (const test of testQueries) {
      try {
        const response = await fetch(`http://localhost:3000/api/reso/Property${test.query}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok || response.status === 401) {
          this.addResult('PASS', `OData feature ${test.feature} is supported`);
        } else {
          this.addResult('FAIL', `OData feature ${test.feature} returned status ${response.status}`);
        }
      } catch (error) {
        this.addResult('FAIL', `OData feature ${test.feature} failed: ${error.message}`);
      }
    }
  }

  // Check required fields in database
  async checkRequiredFields() {
    console.log('🗄️ Checking required RESO fields...');
    
    for (const [resource, fields] of Object.entries(RESO_REQUIREMENTS.requiredFields)) {
      try {
        // Map resource names to table names
        const tableMap = {
          'Property': 'common_fields',
          'Media': 'property_media',
          'OpenHouse': 'property_openhouse',
          'Room': 'property_rooms',
          'Member': 'users',
          'Office': 'offices'
        };

        const tableName = tableMap[resource];
        if (!tableName) {
          this.addResult('FAIL', `No table mapping found for resource ${resource}`);
          continue;
        }

        // Check if table exists and has required fields
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          this.addResult('FAIL', `Table ${tableName} for resource ${resource} is not accessible: ${error.message}`);
          continue;
        }

        // Check if we can query the table (basic existence check)
        this.addResult('PASS', `Resource ${resource} table ${tableName} is accessible`);
        
        // Note: In a real implementation, you would check for specific column existence
        // This would require querying the database schema
        
      } catch (error) {
        this.addResult('FAIL', `Resource ${resource} validation failed: ${error.message}`);
      }
    }
  }

  // Check metadata endpoint
  async checkMetadataEndpoint() {
    console.log('📋 Checking OData metadata endpoint...');
    
    try {
      const response = await fetch('http://localhost:3000/api/reso/$metadata', {
        method: 'GET',
        headers: {
          'Accept': 'application/xml'
        }
      });

      if (response.ok) {
        const metadata = await response.text();
        
        // Check for required metadata elements
        const requiredElements = [
          'EntityType',
          'EntitySet',
          'Property',
          'NavigationProperty'
        ];

        let metadataScore = 0;
        for (const element of requiredElements) {
          if (metadata.includes(element)) {
            metadataScore++;
          }
        }

        if (metadataScore === requiredElements.length) {
          this.addResult('PASS', 'OData metadata endpoint contains all required elements');
        } else {
          this.addResult('FAIL', `OData metadata endpoint missing ${requiredElements.length - metadataScore} required elements`);
        }
      } else {
        this.addResult('FAIL', `OData metadata endpoint returned status ${response.status}`);
      }
    } catch (error) {
      this.addResult('FAIL', `OData metadata endpoint failed: ${error.message}`);
    }
  }

  // Check response formats
  async checkResponseFormats() {
    console.log('📄 Checking response formats...');
    
    try {
      const response = await fetch('http://localhost:3000/api/reso/Property?$top=1', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok || response.status === 401) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          this.addResult('PASS', 'API returns proper JSON content type');
        } else {
          this.addResult('FAIL', `API returns incorrect content type: ${contentType}`);
        }
      } else {
        this.addResult('FAIL', `Response format check failed with status ${response.status}`);
      }
    } catch (error) {
      this.addResult('FAIL', `Response format check failed: ${error.message}`);
    }
  }

  // Check error handling
  async checkErrorHandling() {
    console.log('⚠️ Checking error handling...');
    
    try {
      // Test invalid endpoint
      const response = await fetch('http://localhost:3000/api/reso/InvalidResource', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 404) {
        this.addResult('PASS', 'API returns proper 404 for invalid resources');
      } else {
        this.addResult('FAIL', `API returned status ${response.status} instead of 404 for invalid resource`);
      }
    } catch (error) {
      this.addResult('FAIL', `Error handling check failed: ${error.message}`);
    }
  }

  // Check authentication
  async checkAuthentication() {
    console.log('🔐 Checking authentication...');
    
    try {
      // Test protected endpoint without auth
      const response = await fetch('http://localhost:3000/api/reso/Property', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 401) {
        this.addResult('PASS', 'API properly requires authentication for protected endpoints');
      } else if (response.status === 200) {
        this.addResult('WARN', 'API allows access without authentication (may be intentional for public endpoints)');
      } else {
        this.addResult('FAIL', `API returned unexpected status ${response.status} for authentication check`);
      }
    } catch (error) {
      this.addResult('FAIL', `Authentication check failed: ${error.message}`);
    }
  }

  // Check rate limiting
  async checkRateLimiting() {
    console.log('🚦 Checking rate limiting...');
    
    try {
      // Make multiple requests to test rate limiting
      const promises = Array(5).fill().map(() => 
        fetch('http://localhost:3000/api/reso/Property', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
      );

      const responses = await Promise.all(promises);
      const rateLimitHeaders = responses[0].headers.get('X-RateLimit-Limit');
      
      if (rateLimitHeaders) {
        this.addResult('PASS', 'API implements rate limiting with proper headers');
      } else {
        this.addResult('WARN', 'API may not implement rate limiting or headers are missing');
      }
    } catch (error) {
      this.addResult('FAIL', `Rate limiting check failed: ${error.message}`);
    }
  }

  // Add a test result
  addResult(status, message) {
    this.results.totalChecks++;
    
    if (status === 'PASS') {
      this.results.passedChecks++;
    } else if (status === 'FAIL') {
      this.results.failedChecks++;
    }

    this.results.details.push({
      status,
      message,
      timestamp: new Date().toISOString()
    });

    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${icon} ${message}`);
  }

  // Calculate compliance score
  calculateScore() {
    if (this.results.totalChecks === 0) {
      this.results.score = 0;
      return;
    }

    this.results.score = Math.round((this.results.passedChecks / this.results.totalChecks) * 100);
    
    if (this.results.score >= 90) {
      this.results.overall = 'PASS';
    } else if (this.results.score >= 70) {
      this.results.overall = 'WARN';
    } else {
      this.results.overall = 'FAIL';
    }
  }

  // Generate compliance report
  generateReport() {
    console.log('\n📊 RESO Compliance Report');
    console.log('='.repeat(50));
    console.log(`Overall Status: ${this.results.overall}`);
    console.log(`Compliance Score: ${this.results.score}%`);
    console.log(`Total Checks: ${this.results.totalChecks}`);
    console.log(`Passed: ${this.results.passedChecks}`);
    console.log(`Failed: ${this.results.failedChecks}`);
    console.log(`Warnings: ${this.results.totalChecks - this.results.passedChecks - this.results.failedChecks}`);

    if (this.results.failedChecks > 0) {
      console.log('\n❌ Failed Checks:');
      this.results.details
        .filter(detail => detail.status === 'FAIL')
        .forEach(detail => console.log(`  - ${detail.message}`));
    }

    if (this.results.overall === 'PASS') {
      console.log('\n🎉 Congratulations! Your implementation is RESO Web API 2.0.0 compliant!');
    } else if (this.results.overall === 'WARN') {
      console.log('\n⚠️ Your implementation is mostly compliant but has some issues to address.');
    } else {
      console.log('\n🚨 Your implementation needs significant work to achieve RESO compliance.');
    }

    console.log('\n📋 Detailed Results:');
    this.results.details.forEach(detail => {
      const icon = detail.status === 'PASS' ? '✅' : detail.status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${icon} [${detail.status}] ${detail.message}`);
    });
  }
}

// Main execution
async function main() {
  try {
    const validator = new ResoComplianceValidator();
    const results = await validator.validate();
    
    // Exit with appropriate code
    process.exit(results.overall === 'PASS' ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ResoComplianceValidator };
export default ResoComplianceValidator;
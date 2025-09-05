/**
 * Environment Testing Script
 * Tests local environment configuration and connectivity
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

class EnvironmentTester {
  constructor() {
    this.results = {
      overall: 'PASS',
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  // Run all environment tests
  async test() {
    console.log('🧪 Testing local environment configuration...\n');

    await this.testEnvironmentVariables();
    await this.testSupabaseConnection();
    await this.testDatabaseTables();
    await this.testExternalAPIs();
    await this.testRedisConnection();

    this.generateReport();
    return this.results;
  }

  // Test environment variables
  async testEnvironmentVariables() {
    console.log('🔧 Testing environment variables...');

    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET',
      'NODE_ENV'
    ];

    const optionalVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'REDIS_URL',
      'IDX_API_URL',
      'IDX_API_KEY',
      'IDX_FREEHOLD_URL',
      'IDX_CONDO_URL',
      'IDX_LEASE_URL',
      'IDX_MEDIA_URL',
      'IDX_OPENHOUSE_URL',
      'IDX_ROOMS_URL',
      'VOW_API_URL',
      'VOW_API_KEY',
      'VOW_FREEHOLD_URL',
      'VOW_CONDO_URL',
      'VOW_LEASE_URL',
      'VOW_MEDIA_URL',
      'VOW_OPENHOUSE_URL',
      'VOW_ROOMS_URL',
      'PORT',
      'LOG_LEVEL'
    ];

    // Test required variables
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        this.addResult('PASS', `Required environment variable ${varName} is set`);
      } else {
        this.addResult('FAIL', `Required environment variable ${varName} is missing`);
      }
    }

    // Test optional variables
    for (const varName of optionalVars) {
      if (process.env[varName]) {
        this.addResult('PASS', `Optional environment variable ${varName} is set`);
      } else {
        this.addResult('WARN', `Optional environment variable ${varName} is not set`);
      }
    }

    // Test JWT secret strength
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length >= 32) {
        this.addResult('PASS', 'JWT secret is sufficiently long');
      } else {
        this.addResult('WARN', 'JWT secret should be at least 32 characters long');
      }
    }
  }

  // Test Supabase connection
  async testSupabaseConnection() {
    console.log('🗄️ Testing Supabase connection...');

    try {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        this.addResult('FAIL', 'Supabase credentials not configured');
        return;
      }

      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      // Test basic connection
      const { data, error } = await supabase
        .from('common_fields')
        .select('count')
        .limit(1);

      if (error) {
        this.addResult('FAIL', `Supabase connection failed: ${error.message}`);
      } else {
        this.addResult('PASS', 'Supabase connection successful');
      }

      // Test service role key if available
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const serviceSupabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error: serviceError } = await serviceSupabase
          .from('common_fields')
          .select('count')
          .limit(1);

        if (serviceError) {
          this.addResult('WARN', `Service role key test failed: ${serviceError.message}`);
        } else {
          this.addResult('PASS', 'Service role key is working');
        }
      }

    } catch (error) {
      this.addResult('FAIL', `Supabase connection test failed: ${error.message}`);
    }
  }

  // Test database tables
  async testDatabaseTables() {
    console.log('📊 Testing database tables...');

    try {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        this.addResult('FAIL', 'Cannot test database tables - Supabase not configured');
        return;
      }

      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      const requiredTables = [
        'common_fields',
        'property_media',
        'property_openhouse',
        'property_rooms',
        'users',
        'offices'
      ];

      for (const tableName of requiredTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (error) {
            this.addResult('FAIL', `Table ${tableName} is not accessible: ${error.message}`);
          } else {
            this.addResult('PASS', `Table ${tableName} is accessible`);
          }
        } catch (error) {
          this.addResult('FAIL', `Table ${tableName} test failed: ${error.message}`);
        }
      }

    } catch (error) {
      this.addResult('FAIL', `Database tables test failed: ${error.message}`);
    }
  }

  // Test external APIs
  async testExternalAPIs() {
    console.log('🌐 Testing external API connections...');

    // Test IDX API
    if (process.env.IDX_API_URL && process.env.IDX_API_KEY) {
      try {
        const response = await fetch(`${process.env.IDX_API_URL}/health`, {
          headers: {
            'Authorization': `Bearer ${process.env.IDX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok) {
          this.addResult('PASS', 'IDX API connection successful');
        } else {
          this.addResult('WARN', `IDX API returned status ${response.status}`);
        }
      } catch (error) {
        this.addResult('WARN', `IDX API connection failed: ${error.message}`);
      }
    } else {
      this.addResult('WARN', 'IDX API credentials not configured');
    }

    // Test VOW API
    if (process.env.VOW_API_URL && process.env.VOW_API_KEY) {
      try {
        const response = await fetch(`${process.env.VOW_API_URL}/health`, {
          headers: {
            'Authorization': `Bearer ${process.env.VOW_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok) {
          this.addResult('PASS', 'VOW API connection successful');
        } else {
          this.addResult('WARN', `VOW API returned status ${response.status}`);
        }
      } catch (error) {
        this.addResult('WARN', `VOW API connection failed: ${error.message}`);
      }
    } else {
      this.addResult('WARN', 'VOW API credentials not configured');
    }
  }

  // Test Redis connection
  async testRedisConnection() {
    console.log('💾 Testing Redis connection...');

    if (!process.env.REDIS_URL) {
      this.addResult('WARN', 'Redis URL not configured - using memory cache');
      return;
    }

    try {
      // Import Redis dynamically to avoid errors if not installed
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 5000
      });

      await redis.ping();
      this.addResult('PASS', 'Redis connection successful');
      await redis.disconnect();
    } catch (error) {
      this.addResult('WARN', `Redis connection failed: ${error.message}`);
    }
  }

  // Add a test result
  addResult(status, message) {
    this.results.summary.total++;
    
    if (status === 'PASS') {
      this.results.summary.passed++;
    } else if (status === 'FAIL') {
      this.results.summary.failed++;
    } else if (status === 'WARN') {
      this.results.summary.warnings++;
    }

    this.results.tests.push({
      status,
      message,
      timestamp: new Date().toISOString()
    });

    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${icon} ${message}`);
  }

  // Generate test report
  generateReport() {
    console.log('\n📊 Environment Test Report');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Warnings: ${this.results.summary.warnings}`);

    // Determine overall status
    if (this.results.summary.failed > 0) {
      this.results.overall = 'FAIL';
      console.log('\n❌ Environment test FAILED - Please fix the issues above');
    } else if (this.results.summary.warnings > 0) {
      this.results.overall = 'WARN';
      console.log('\n⚠️ Environment test PASSED with warnings - Consider addressing the warnings');
    } else {
      this.results.overall = 'PASS';
      console.log('\n✅ Environment test PASSED - All systems ready!');
    }

    // Show recommendations
    if (this.results.summary.failed > 0 || this.results.summary.warnings > 0) {
      console.log('\n💡 Recommendations:');
      
      const failedTests = this.results.tests.filter(t => t.status === 'FAIL');
      const warningTests = this.results.tests.filter(t => t.status === 'WARN');

      if (failedTests.length > 0) {
        console.log('\n🔴 Critical Issues:');
        failedTests.forEach(test => console.log(`  - ${test.message}`));
      }

      if (warningTests.length > 0) {
        console.log('\n🟡 Warnings:');
        warningTests.forEach(test => console.log(`  - ${test.message}`));
      }
    }

    console.log('\n📋 Next Steps:');
    if (this.results.overall === 'PASS') {
      console.log('  - Start the server: npm run dev');
      console.log('  - Test the API: npm run test');
      console.log('  - View documentation: npm run docs');
    } else {
      console.log('  - Fix the failed tests above');
      console.log('  - Check your .env file configuration');
      console.log('  - Ensure all required services are running');
    }
  }
}

// Main execution
async function main() {
  try {
    const tester = new EnvironmentTester();
    const results = await tester.test();
    
    // Exit with appropriate code
    process.exit(results.overall === 'PASS' ? 0 : 1);
  } catch (error) {
    console.error('❌ Environment test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { EnvironmentTester };
export default EnvironmentTester;

/**
 * Test Runner for Real Estate Backend
 * Runs all tests with proper configuration and reporting
 */

import { jest } from '@jest/globals';
import { setupTests, teardownTests } from './setup.js';

// Test configuration
const testConfig = {
  // Test environment
  NODE_ENV: 'test',
  
  // Test patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Test directories
  roots: ['<rootDir>/tests'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'api/**/*.js',
    'mappers/**/*.js',
    'utils/**/*.js',
    'lib/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/node_modules/**'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Verbose output
  verbose: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};

// Test categories
const testCategories = {
  unit: {
    name: 'Unit Tests',
    pattern: 'tests/unit/**/*.test.js',
    description: 'Tests individual functions and modules in isolation'
  },
  
  integration: {
    name: 'Integration Tests',
    pattern: 'tests/integration/**/*.test.js',
    description: 'Tests API endpoints and database interactions'
  },
  
  e2e: {
    name: 'End-to-End Tests',
    pattern: 'tests/e2e/**/*.test.js',
    description: 'Tests complete user workflows'
  },
  
  performance: {
    name: 'Performance Tests',
    pattern: 'tests/performance/**/*.test.js',
    description: 'Tests system performance and load handling'
  }
};

// Test runner class
class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🚀 Starting Real Estate Backend Test Suite\n');
    
    const startTime = Date.now();
    
    try {
      // Setup test environment
      setupTests();
      
      // Run tests by category
      for (const [category, config] of Object.entries(testCategories)) {
        await this.runCategory(category, config);
      }
      
      // Calculate total duration
      this.results.duration = Date.now() - startTime;
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    } finally {
      // Teardown test environment
      await teardownTests();
    }
  }

  /**
   * Run tests for a specific category
   */
  async runCategory(category, config) {
    console.log(`\n📋 Running ${config.name}...`);
    console.log(`   ${config.description}`);
    
    try {
      // Run Jest for this category
      const result = await jest.runCLI({
        ...testConfig,
        testPathPattern: config.pattern,
        passWithNoTests: true
      }, [process.cwd()]);
      
      // Update results
      this.results.total += result.results.numTotalTests;
      this.results.passed += result.results.numPassedTests;
      this.results.failed += result.results.numFailedTests;
      this.results.skipped += result.results.numPendingTests;
      
      // Print category results
      this.printCategoryResults(category, result.results);
      
    } catch (error) {
      console.error(`❌ ${config.name} failed:`, error.message);
      this.results.failed++;
    }
  }

  /**
   * Print results for a category
   */
  printCategoryResults(category, results) {
    const status = results.numFailedTests === 0 ? '✅' : '❌';
    const duration = (results.perfStats.end - results.perfStats.start) / 1000;
    
    console.log(`   ${status} ${results.numTotalTests} tests, ${results.numPassedTests} passed, ${results.numFailedTests} failed, ${results.numPendingTests} skipped (${duration.toFixed(2)}s)`);
    
    if (results.numFailedTests > 0) {
      console.log('   Failed tests:');
      results.testResults.forEach(testResult => {
        if (testResult.numFailingTests > 0) {
          console.log(`     - ${testResult.testFilePath}`);
        }
      });
    }
  }

  /**
   * Print overall test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successRate = this.results.total > 0 ? (this.results.passed / this.results.total * 100).toFixed(1) : 0;
    const duration = (this.results.duration / 1000).toFixed(2);
    
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! The system is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix the issues.');
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Run specific test category
   */
  async runCategoryOnly(category) {
    if (!testCategories[category]) {
      console.error(`❌ Unknown test category: ${category}`);
      console.log('Available categories:', Object.keys(testCategories).join(', '));
      process.exit(1);
    }

    console.log(`🚀 Running ${testCategories[category].name} only\n`);
    
    try {
      setupTests();
      await this.runCategory(category, testCategories[category]);
      this.printSummary();
    } catch (error) {
      console.error('❌ Test run failed:', error);
      process.exit(1);
    } finally {
      await teardownTests();
    }
  }

  /**
   * Run tests with coverage
   */
  async runWithCoverage() {
    console.log('🚀 Running tests with coverage analysis\n');
    
    try {
      setupTests();
      
      const result = await jest.runCLI({
        ...testConfig,
        collectCoverage: true,
        coverageReporters: ['text', 'lcov', 'html']
      }, [process.cwd()]);
      
      this.results.total = result.results.numTotalTests;
      this.results.passed = result.results.numPassedTests;
      this.results.failed = result.results.numFailedTests;
      this.results.skipped = result.results.numPendingTests;
      
      this.printSummary();
      
      console.log('\n📊 Coverage report generated in ./coverage/');
      
    } catch (error) {
      console.error('❌ Coverage test run failed:', error);
      process.exit(1);
    } finally {
      await teardownTests();
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];
const category = args[1];

const runner = new TestRunner();

switch (command) {
  case 'unit':
  case 'integration':
  case 'e2e':
  case 'performance':
    runner.runCategoryOnly(command);
    break;
    
  case 'coverage':
    runner.runWithCoverage();
    break;
    
  case 'help':
    console.log(`
🧪 Real Estate Backend Test Runner

Usage: node tests/run-tests.js [command] [category]

Commands:
  (no command)     Run all tests
  unit            Run unit tests only
  integration     Run integration tests only
  e2e             Run end-to-end tests only
  performance     Run performance tests only
  coverage        Run all tests with coverage analysis
  help            Show this help message

Examples:
  node tests/run-tests.js                    # Run all tests
  node tests/run-tests.js unit               # Run unit tests only
  node tests/run-tests.js integration        # Run integration tests only
  node tests/run-tests.js coverage           # Run with coverage
    `);
    break;
    
  default:
    runner.runAll();
    break;
}

export default TestRunner;

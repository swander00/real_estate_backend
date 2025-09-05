/**
 * Global Test Setup
 * Runs once before all tests
 */

import { setupTests } from './setup.js';

export default async function globalSetup() {
  console.log('🔧 Setting up global test environment...');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Setup test configuration
  setupTests();
  
  console.log('✅ Global test setup complete');
}

/**
 * Global Test Teardown
 * Runs once after all tests complete
 */

import { teardownTests } from './setup.js';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');
  
  // Teardown test environment
  await teardownTests();
  
  console.log('✅ Global test teardown complete');
}

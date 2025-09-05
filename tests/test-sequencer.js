/**
 * Test Sequencer
 * Controls the order in which tests are executed
 */

export default class TestSequencer {
  sort(tests) {
    // Define test execution order
    const testOrder = [
      'setup.test.js',
      'odataParser.test.js',
      'resoMetadata.test.js',
      'resoFieldMapping.test.js',
      'resoRoutes.test.js'
    ];
    
    // Sort tests by priority
    return tests.sort((a, b) => {
      const aIndex = testOrder.findIndex(pattern => a.path.includes(pattern));
      const bIndex = testOrder.findIndex(pattern => b.path.includes(pattern));
      
      // If both tests have defined order, sort by that order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one test has defined order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // For tests without defined order, sort alphabetically
      return a.path.localeCompare(b.path);
    });
  }
}

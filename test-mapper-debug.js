// test-mapper-debug.js
import { mapCommonFields } from './mappers/mapCommonFields.js';

console.log('🔍 Testing your actual mapCommonFields function...\n');

const testData = {
  ListingKey: 'TEST123',
  ArchitecturalStyle: ['2-Storey'],
  Cooling: ['None'],
  Basement: ['Finished', 'None', 'Finished'],
  InteriorFeatures: [],
  ExteriorFeatures: ['Deck', 'Garage'],
  PoolFeatures: ['None'],
  PropertyFeatures: ['Feature 1', 'Feature 2'],
  Sewer: ['Municipal']
};

console.log('INPUT DATA:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n' + '='.repeat(60) + '\n');

try {
  // Test IDX sync call pattern: mapCommonFields(item, {})
  console.log('TESTING IDX SYNC PATTERN: mapCommonFields(item, {})');
  const idxResult = mapCommonFields(testData, {});
  
  console.log('OUTPUT:');
  console.log(JSON.stringify(idxResult, null, 2));
  
  console.log('\n📋 FIELD-BY-FIELD ANALYSIS:');
  console.log(`ArchitecturalStyle: ${JSON.stringify(idxResult.ArchitecturalStyle)} (should be: "2-Storey")`);
  console.log(`Cooling: ${JSON.stringify(idxResult.Cooling)} (should be: null)`);  
  console.log(`Sewer: ${JSON.stringify(idxResult.Sewer)} (should be: "Municipal")`);
  console.log(`Basement: ${JSON.stringify(idxResult.Basement)} (should be: ["Finished"])`);
  console.log(`InteriorFeatures: ${JSON.stringify(idxResult.InteriorFeatures)} (should be: null)`);
  console.log(`ExteriorFeatures: ${JSON.stringify(idxResult.ExteriorFeatures)} (should be: ["Deck","Garage"])`);
  console.log(`PoolFeatures: ${JSON.stringify(idxResult.PoolFeatures)} (should be: null)`);
  console.log(`PropertyFeatures: ${JSON.stringify(idxResult.PropertyFeatures)} (should be: ["Feature 1","Feature 2"])`);

  console.log('\n✅ SUCCESS/FAILURE CHECK:');
  console.log(`ArchitecturalStyle: ${idxResult.ArchitecturalStyle === "2-Storey" ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Cooling: ${idxResult.Cooling === null ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Sewer: ${idxResult.Sewer === "Municipal" ? '✅ PASS' : '❌ FAIL'}`);
  
  const baseVal = Array.isArray(idxResult.Basement) && idxResult.Basement.length === 1 && idxResult.Basement[0] === 'Finished';
  console.log(`Basement: ${baseVal ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log(`InteriorFeatures: ${idxResult.InteriorFeatures === null ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`PoolFeatures: ${idxResult.PoolFeatures === null ? '✅ PASS' : '❌ FAIL'}`);

} catch (error) {
  console.error('❌ ERROR testing mapper:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('\n' + '='.repeat(60));
console.log('🎯 DIAGNOSIS:');
console.log('If you see ❌ FAIL above, your mapper needs updating.');
console.log('If you see ✅ PASS for all fields, then your mapper is working and the issue is elsewhere.');
console.log('='.repeat(60));
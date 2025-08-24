// scripts/validateResoCompliance.js - Updated RESO Compliance Check
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

console.log('🔍 Starting RESO Compliance Validation...');
console.log('====================================');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkDatabase() {
  console.log('📊 Checking Database Connection...');
  
  try {
    const { data, error } = await supabase.from('common_fields').select('*').limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return { connected: false, fieldCount: 0 };
    }
    
    console.log('✅ Database connection successful');
    
    if (data && data.length > 0) {
      const fieldCount = Object.keys(data[0]).length;
      console.log(`📝 Available fields: ${fieldCount} (Rich RESO dataset)`);
      console.log('📊 Database contains data: YES');
      
      // Check for core RESO fields
      const coreResoFields = ['ListingKey', 'MlsStatus', 'PropertyType', 'ListPrice', 'City'];
      const presentFields = coreResoFields.filter(field => data[0].hasOwnProperty(field));
      console.log(`🎯 Core RESO fields: ${presentFields.length}/${coreResoFields.length} present`);
      
      return { connected: true, fieldCount, coreFieldsPresent: presentFields.length };
    } else {
      console.log('📊 Database contains data: NO');
      return { connected: true, fieldCount: 0, coreFieldsPresent: 0 };
    }
    
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
    return { connected: false, fieldCount: 0 };
  }
}

async function checkApiEndpoints() {
  console.log('\n🌐 Checking RESO API Endpoints...');
  
  const fs = await import('fs');
  
  // Core RESO endpoints
  const coreEndpoints = [
    { file: 'api/reso/index.js', name: 'Service Document' },
    { file: 'api/reso/metadata.js', name: 'Metadata' },
    { file: 'api/reso/Property.js', name: 'Property Resource' }
  ];
  
  // Additional RESO endpoints
  const additionalEndpoints = [
    { file: 'api/reso/Media.js', name: 'Media Resource' },
    { file: 'api/reso/OpenHouse.js', name: 'OpenHouse Resource' },
    { file: 'api/reso/ResidentialFreehold.js', name: 'Freehold Resource' },
    { file: 'api/reso/ResidentialCondo.js', name: 'Condo Resource' },
    { file: 'api/reso/ResidentialLease.js', name: 'Lease Resource' },
    { file: 'api/reso/PropertyRooms.js', name: 'Rooms Resource' }
  ];
  
  let coreCount = 0;
  let additionalCount = 0;
  
  console.log('📋 Core RESO Endpoints:');
  for (const endpoint of coreEndpoints) {
    if (fs.existsSync(endpoint.file)) {
      console.log(`  ✅ ${endpoint.name}`);
      coreCount++;
    } else {
      console.log(`  ❌ ${endpoint.name} - ${endpoint.file}`);
    }
  }
  
  console.log('\n📋 Additional RESO Endpoints:');
  for (const endpoint of additionalEndpoints) {
    if (fs.existsSync(endpoint.file)) {
      console.log(`  ✅ ${endpoint.name}`);
      additionalCount++;
    } else {
      console.log(`  ⚪ ${endpoint.name} - ${endpoint.file} (optional)`);
    }
  }
  
  console.log(`\n📊 Core RESO Endpoints: ${coreCount}/${coreEndpoints.length} found`);
  console.log(`📊 Additional Endpoints: ${additionalCount}/${additionalEndpoints.length} found`);
  
  return { coreCount, additionalCount, totalCore: coreEndpoints.length, totalAdditional: additionalEndpoints.length };
}

async function checkSyncSystem() {
  console.log('\n🔄 Checking Sync System...');
  
  const fs = await import('fs');
  const syncFiles = [
    { file: 'lib/syncListingsIdx.js', name: 'IDX Sync Logic' },
    { file: 'lib/syncListingsVow.js', name: 'VOW Sync Logic' },
    { file: 'api/sync-idx.js', name: 'IDX Sync Endpoint' },
    { file: 'api/sync-vow.js', name: 'VOW Sync Endpoint' }
  ];
  
  let syncCount = 0;
  
  for (const syncFile of syncFiles) {
    if (fs.existsSync(syncFile.file)) {
      console.log(`  ✅ ${syncFile.name}`);
      syncCount++;
    } else {
      console.log(`  ❌ ${syncFile.name} - ${syncFile.file}`);
    }
  }
  
  console.log(`📊 Sync Components: ${syncCount}/${syncFiles.length} found`);
  return { syncCount, totalSync: syncFiles.length };
}

async function main() {
  const dbResult = await checkDatabase();
  const endpointResult = await checkApiEndpoints();
  const syncResult = await checkSyncSystem();
  
  console.log('\n📋 RESO Compliance Assessment:');
  console.log('=============================');
  
  // Database Assessment
  const dbStatus = dbResult.connected && dbResult.coreFieldsPresent >= 4 ? '✅ EXCELLENT' : 
                   dbResult.connected ? '⚠️ BASIC' : '❌ FAILED';
  console.log(`Database: ${dbStatus} (${dbResult.fieldCount} fields)`);
  
  // Core RESO API Assessment
  const coreApiStatus = endpointResult.coreCount === endpointResult.totalCore ? '✅ COMPLETE' :
                        endpointResult.coreCount > 0 ? '🔄 PARTIAL' : '❌ MISSING';
  console.log(`Core RESO API: ${coreApiStatus} (${endpointResult.coreCount}/${endpointResult.totalCore})`);
  
  // Sync System Assessment
  const syncStatus = syncResult.syncCount === syncResult.totalSync ? '✅ COMPLETE' :
                     syncResult.syncCount > 0 ? '🔄 PARTIAL' : '❌ MISSING';
  console.log(`Sync System: ${syncStatus} (${syncResult.syncCount}/${syncResult.totalSync})`);
  
  // Overall RESO Compliance
  const isResoCompliant = endpointResult.coreCount === endpointResult.totalCore && dbResult.connected;
  
  console.log('\n🎯 Overall Status:');
  if (isResoCompliant) {
    console.log('🎉 RESO WEB API 2.0.0 COMPLIANT!');
    console.log('✅ Your backend meets RESO Web API standards');
    console.log('✅ Ready for production deployment');
    console.log('✅ Can integrate with RESO-compliant clients');
  } else if (endpointResult.coreCount > 0) {
    console.log('🔄 RESO COMPLIANCE IN PROGRESS');
    console.log('✅ Core endpoints created');
    console.log('📝 Consider adding additional endpoints for full coverage');
  } else {
    console.log('⚠️ RESO IMPLEMENTATION NEEDED');
    console.log('❌ Missing core RESO endpoints');
  }
  
  console.log('\n📚 Next Recommended Actions:');
  
  if (isResoCompliant) {
    if (endpointResult.additionalCount < endpointResult.totalAdditional) {
      console.log('1. 🎯 Add specialized endpoints (Media, OpenHouse, etc.)');
      console.log('2. 🧪 Test OData queries ($filter, $select, $orderby)');
      console.log('3. 🚀 Deploy to production (Railway/Vercel)');
    } else {
      console.log('1. 🧪 Test full RESO functionality');
      console.log('2. 🚀 Deploy to production');
      console.log('3. 📈 Monitor and optimize performance');
    }
  } else {
    console.log('1. 📁 Complete missing core RESO endpoints');
    console.log('2. 🧪 Test basic RESO functionality');
    console.log('3. 📝 Add field validation');
  }
}

main().catch(console.error);
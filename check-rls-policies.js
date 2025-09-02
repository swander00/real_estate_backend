// check-rls-policies.js - Inspect current RLS policies
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

console.log('🔍 Checking Current RLS Policies...\n');

async function checkRLSPolicies() {
  try {
    // Check which tables have RLS enabled
    console.log('📊 Tables with RLS Enabled:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_name', 'common_fields');

    if (tablesError) {
      console.log('❌ Error checking tables:', tablesError.message);
    } else {
      console.log('✅ Found tables:', tables?.length || 0);
    }

    // Check RLS status for key tables
    const keyTables = [
      'common_fields',
      'property_media', 
      'property_openhouse',
      'property_rooms',
      'residential_freehold',
      'residential_condo',
      'residential_lease'
    ];

    console.log('\n🔒 RLS Status for Key Tables:');
    for (const tableName of keyTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error && error.code === '42501') {
          console.log(`   ${tableName}: ❌ RLS BLOCKING ACCESS`);
        } else if (error) {
          console.log(`   ${tableName}: ⚠️ Error: ${error.message}`);
        } else {
          console.log(`   ${tableName}: ✅ RLS ALLOWING ACCESS`);
        }
      } catch (err) {
        console.log(`   ${tableName}: ❌ Table not found or error`);
      }
    }

    // Try to get policy information (this might be limited with anon key)
    console.log('\n📋 Current Policy Information:');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies_info');
      
      if (policiesError) {
        console.log('   ⚠️ Cannot read policies with current permissions');
        console.log('   💡 This is normal with anon key');
      } else {
        console.log('   ✅ Policies found:', policies);
      }
    } catch (err) {
      console.log('   ⚠️ Policy inspection not available with current permissions');
    }

    console.log('\n🎯 Recommendations:');
    console.log('1. If RLS is blocking access, we need to create proper policies');
    console.log('2. If RLS is allowing all access, we need to restrict it');
    console.log('3. We should implement proper authentication before enabling RLS');

  } catch (error) {
    console.error('❌ Error checking RLS:', error.message);
  }
}

checkRLSPolicies();

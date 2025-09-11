// check_constraints.js - Check foreign key constraints on property_media table
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkConstraints() {
  try {
    console.log('🔍 Checking foreign key constraints on property_media table...');
    
    // Query to get constraint information
    const { data, error } = await supabase.rpc('get_table_constraints', {
      table_name: 'property_media'
    });
    
    if (error) {
      console.log('❌ RPC function not available, trying alternative approach...');
      
      // Alternative: Try to get constraint info from information_schema
      const { data: constraintData, error: constraintError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', 'property_media')
        .eq('constraint_type', 'FOREIGN KEY');
      
      if (constraintError) {
        console.log('❌ Cannot access information_schema, trying direct query...');
        
        // Try a direct query to see what happens
        const { data: testData, error: testError } = await supabase
          .from('property_media')
          .select('*')
          .limit(1);
        
        if (testError) {
          console.log('❌ Error accessing property_media table:', testError.message);
        } else {
          console.log('✅ Can access property_media table');
        }
      } else {
        console.log('📋 Foreign key constraints found:');
        constraintData.forEach(constraint => {
          console.log(`  - ${constraint.constraint_name} (${constraint.constraint_type})`);
        });
      }
    } else {
      console.log('📋 Constraints found:');
      data.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error.message);
  }
}

checkConstraints();

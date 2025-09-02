// test-connection.js - Test database connection and environment
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

console.log('🔍 Testing Real Estate Backend Connection...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Set' : '❌ Missing');
console.log('IDX_TOKEN:', process.env.IDX_TOKEN ? '✅ Set' : '❌ Missing');
console.log('VOW_TOKEN:', process.env.VOW_TOKEN ? '✅ Set' : '❌ Missing');
console.log('');

// Test Supabase connection
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  try {
    console.log('🔌 Testing Supabase connection...');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    // Test a simple query
    const { data, error } = await supabase
      .from('common_fields')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('📊 Database has data:', data !== null);
    }
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
  }
} else {
  console.log('⚠️ Skipping Supabase test - missing credentials');
}

console.log('\n🎯 Next Steps:');
console.log('1. Create .env file with your credentials');
console.log('2. Test the server: npm run dev:local');
console.log('3. Visit: http://localhost:3000/health');

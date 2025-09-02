// debug-auth.js - Run this to diagnose the OAuth error

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use service key for debugging
);

async function debugAuthIssue() {
    console.log('🔍 Debugging OAuth Authentication Error\n');
    console.log('='.repeat(50));
    
    // 1. Check if user_profiles table exists and structure
    console.log('\n1. Checking user_profiles table structure:');
    try {
        const { data: columns, error } = await supabase
            .rpc('get_table_columns', { table_name: 'user_profiles' });
        
        if (error) {
            // Alternative query if RPC doesn't exist
            const { data, error: altError } = await supabase
                .from('user_profiles')
                .select('*')
                .limit(0);
            
            if (altError) {
                console.log('❌ Table access error:', altError.message);
            } else {
                console.log('✅ Table exists and is accessible');
            }
        } else {
            console.log('✅ Table structure:', columns);
        }
    } catch (e) {
        console.log('❌ Error checking table:', e.message);
    }

    // 2. Check auth.users table (Supabase Auth)
    console.log('\n2. Checking Supabase Auth configuration:');
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1
        });
        
        if (error) {
            console.log('⚠️ Cannot access auth.users (expected with anon key)');
        } else {
            console.log('✅ Auth system accessible');
        }
    } catch (e) {
        console.log('❌ Auth system error:', e.message);
    }

    // 3. Check for trigger/function conflicts
    console.log('\n3. Checking for database triggers on user creation:');
    const { data: triggers, error: triggerError } = await supabase
        .rpc('get_triggers_on_table', { table_name: 'user_profiles' })
        .catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (triggers) {
        console.log('Triggers found:', triggers);
    }

    // 4. Check constraints on user_profiles
    console.log('\n4. Checking constraints and potential issues:');
    
    // Test insert with minimal data
    const testEmail = `test_${Date.now()}@example.com`;
    const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
            email: testEmail,
            id: Math.floor(Math.random() * 100000),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (insertError) {
        console.log('❌ Insert test failed:', insertError.message);
        console.log('   Error details:', insertError);
        
        // Common issues
        if (insertError.message.includes('duplicate')) {
            console.log('\n⚠️ ISSUE: Duplicate key constraint');
            console.log('   SOLUTION: Check if user already exists or ID conflicts');
        }
        if (insertError.message.includes('not-null')) {
            console.log('\n⚠️ ISSUE: Required field is missing');
            console.log('   SOLUTION: Check which fields are NOT NULL');
        }
        if (insertError.message.includes('foreign')) {
            console.log('\n⚠️ ISSUE: Foreign key constraint violation');
            console.log('   SOLUTION: Check related tables');
        }
    } else {
        console.log('✅ Test insert successful');
        
        // Clean up test record
        await supabase
            .from('user_profiles')
            .delete()
            .eq('email', testEmail);
    }

    // 5. Check RLS policies
    console.log('\n5. Checking Row Level Security:');
    const { data: rlsStatus } = await supabase
        .rpc('check_rls_status', { table_name: 'user_profiles' })
        .catch(() => ({ data: null }));
    
    if (rlsStatus) {
        console.log('RLS Status:', rlsStatus);
    } else {
        // Manual check
        const { data: policies } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(1);
        
        if (policies === null) {
            console.log('⚠️ RLS might be enabled without proper policies');
        }
    }

    // 6. Check if it's a trigger/function issue
    console.log('\n6. Checking for custom functions:');
    console.log('Run this SQL in Supabase to check:');
    console.log(`
    -- Check for triggers
    SELECT * FROM information_schema.triggers 
    WHERE event_object_table = 'user_profiles';
    
    -- Check for functions that might be called
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE prosrc LIKE '%user_profiles%';
    `);

    // 7. Common OAuth callback issues
    console.log('\n7. Common OAuth Issues & Solutions:');
    console.log('='.repeat(50));
    console.log(`
    📌 LIKELY CAUSES:
    
    1. DUPLICATE EMAIL/ID:
       - User might already exist
       - Check: SELECT * FROM user_profiles WHERE email = '[user_email]';
       
    2. MISSING REQUIRED FIELDS:
       - 'id' field is NOT NULL but might not be auto-generated
       - Solution: Add DEFAULT or trigger to generate ID
       
    3. RLS BLOCKING INSERT:
       - RLS enabled but no INSERT policy for auth.uid()
       - Solution: Add policy or disable RLS temporarily
       
    4. TRIGGER FAILING:
       - Custom trigger on user creation might be erroring
       - Check trigger functions for errors
       
    5. USER-DEFINED TYPE ISSUE:
       - 'purchase_timeframe' is USER-DEFINED type
       - Might have constraint that's failing
    `);

    console.log('\n🔧 IMMEDIATE FIX TO TEST:');
    console.log('='.repeat(50));
    console.log(`
    -- Run this in Supabase SQL Editor:
    
    -- 1. Temporarily disable RLS
    ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
    
    -- 2. Check table structure
    \\d user_profiles
    
    -- 3. Try manual insert
    INSERT INTO user_profiles (email, id, created_at, updated_at)
    VALUES ('test@example.com', 99999, NOW(), NOW());
    
    -- 4. If that works, the issue is RLS or triggers
    -- 5. Don't forget to re-enable RLS after testing!
    `);
}

// Run the debug script
debugAuthIssue().catch(console.error);
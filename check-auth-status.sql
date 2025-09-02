-- =============================================================================
-- Check Auth Status - Diagnostic Script
-- =============================================================================

-- Check if auth schema exists
SELECT 
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name = 'auth';

-- Check if auth.users table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'auth' AND table_name = 'users';

-- Check if public.users table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'users';

-- Check current user and role
SELECT 
    current_user,
    current_setting('role') as current_role;

-- Check if we can access auth.users (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'auth.users table exists';
        -- Try to count users
        EXECUTE 'SELECT COUNT(*) as user_count FROM auth.users';
    ELSE
        RAISE NOTICE 'auth.users table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing auth.users: %', SQLERRM;
END $$;

-- Check RLS status on public tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_profiles', 'api_keys', 'audit_logs');

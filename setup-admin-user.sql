-- =============================================================================
-- Setup Admin User - Run this after creating a user in Supabase Auth
-- =============================================================================

-- Step 1: Check if you have any users in auth.users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 2: Insert your user into the public.users table with admin role
-- Replace 'your-email@example.com' with your actual email
-- Replace 'your-user-uuid' with the UUID from step 1
-- Replace 'Your Full Name' with your actual name

INSERT INTO public.users (id, email, full_name, role) 
VALUES (
    'your-user-uuid-here',  -- Copy the UUID from step 1
    'your-email@example.com', -- Your email
    'Your Full Name',         -- Your name
    'admin'                   -- Role
);

-- Step 3: Verify the user was created
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM public.users
WHERE role = 'admin';

-- Step 4: Test the helper functions
SELECT 
    public.get_user_role() as current_user_role,
    public.is_admin() as is_current_user_admin;

-- Step 5: Check RLS policies are working
-- This should return data (public access allowed)
SELECT COUNT(*) as total_properties FROM common_fields;

-- Step 6: Create a user profile (optional)
INSERT INTO public.user_profiles (id, phone, company, license_number)
VALUES (
    'your-user-uuid-here',  -- Same UUID as above
    '+1-555-0123',          -- Your phone
    'Your Company Name',     -- Your company
    'LIC123456'              -- Your license number
);

-- Step 7: Verify everything is set up correctly
SELECT 
    'Users Table' as table_name,
    COUNT(*) as record_count
FROM public.users
UNION ALL
SELECT 
    'User Profiles Table',
    COUNT(*)
FROM public.user_profiles
UNION ALL
SELECT 
    'API Keys Table',
    COUNT(*)
FROM public.api_keys
UNION ALL
SELECT 
    'Audit Logs Table',
    COUNT(*)
FROM public.audit_logs;

-- =============================================================================
-- QUICK FIX: Resolve Circular RLS Policy Issue
-- Run this script in your Supabase SQL editor to fix the infinite recursion
-- =============================================================================

-- Step 1: Drop all existing RLS policies that cause circular references
DROP POLICY IF EXISTS "Only admins can view all users" ON users;
DROP POLICY IF EXISTS "Only admins can create users" ON users;
DROP POLICY IF EXISTS "Only admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Only admins can view all API keys" ON api_keys;
DROP POLICY IF EXISTS "Only admins can view all audit logs" ON audit_logs;

-- Step 2: Drop policies that reference the users table directly
DROP POLICY IF EXISTS "Only admins can modify properties" ON common_fields;
DROP POLICY IF EXISTS "Only admins can modify media" ON property_media;
DROP POLICY IF EXISTS "Only admins can modify open houses" ON property_openhouse;
DROP POLICY IF EXISTS "Only admins can modify rooms" ON property_rooms;
DROP POLICY IF EXISTS "Only admins can modify residential properties" ON residential_freehold;
DROP POLICY IF EXISTS "Only admins can modify residential properties" ON residential_condo;
DROP POLICY IF EXISTS "Only admins can modify residential properties" ON residential_lease;

-- Step 3: Create helper functions that bypass RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM public.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate policies using the helper function
CREATE POLICY "Only admins can view all users" ON users
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can view all profiles" ON user_profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Only admins can view all API keys" ON api_keys
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Only admins can view all audit logs" ON audit_logs
    FOR SELECT USING (public.is_admin());

-- Step 5: Recreate property modification policies
CREATE POLICY "Only admins can modify properties" ON common_fields
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify media" ON property_media
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify open houses" ON property_openhouse
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify rooms" ON property_rooms
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify residential properties" ON residential_freehold
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify residential properties" ON residential_condo
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify residential properties" ON residential_lease
    FOR ALL USING (public.is_admin());

-- Step 6: Verify the fix
SELECT 'RLS policies fixed successfully!' as status;


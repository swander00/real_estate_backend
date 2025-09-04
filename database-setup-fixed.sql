-- =============================================================================
-- Real Estate Backend - Database Security Setup (FIXED VERSION)
-- Phase 2A: Authentication Tables and RLS Policies
-- =============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE common_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_openhouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_freehold ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_condo ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_lease ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 1. USER MANAGEMENT TABLES
-- =============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'agent', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles for additional information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    phone TEXT,
    company TEXT,
    license_number TEXT,
    specialization TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys for external access
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    permissions TEXT[] DEFAULT ARRAY['read']::TEXT[],
    rate_limit_per_hour INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. AUDIT LOGGING TABLES
-- =============================================================================

-- Audit log for tracking user actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

-- Function to get current user role (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin (SECURITY DEFINER bypasses RLS)
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

-- Function to check if user is agent or admin
CREATE OR REPLACE FUNCTION public.is_agent_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('admin', 'agent')
        FROM public.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. RLS POLICIES FOR PROPERTY TABLES (FIXED)
-- =============================================================================

-- Common Fields RLS Policies
CREATE POLICY "Public can view basic property info" ON common_fields
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify properties" ON common_fields
    FOR ALL USING (public.is_admin());

-- Property Media RLS Policies
CREATE POLICY "Public can view property media" ON property_media
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify media" ON property_media
    FOR ALL USING (public.is_admin());

-- Property OpenHouse RLS Policies
CREATE POLICY "Public can view open houses" ON property_openhouse
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify open houses" ON property_openhouse
    FOR ALL USING (public.is_admin());

-- Property Rooms RLS Policies
CREATE POLICY "Public can view property rooms" ON property_rooms
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify rooms" ON property_rooms
    FOR ALL USING (public.is_admin());

-- Residential Property Tables RLS Policies
CREATE POLICY "Public can view residential properties" ON residential_freehold
    FOR SELECT USING (true);

CREATE POLICY "Public can view residential properties" ON residential_condo
    FOR SELECT USING (true);

CREATE POLICY "Public can view residential properties" ON residential_lease
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify residential properties" ON residential_freehold
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify residential properties" ON residential_condo
    FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins can modify residential properties" ON residential_lease
    FOR ALL USING (public.is_admin());

-- =============================================================================
-- 5. RLS POLICIES FOR USER TABLES (FIXED)
-- =============================================================================

-- Users table RLS policies (FIXED - no circular references)
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- IMPORTANT: Use function calls instead of direct table queries
CREATE POLICY "Only admins can view all users" ON users
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (public.is_admin());

-- User profiles RLS policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Only admins can view all profiles" ON user_profiles
    FOR SELECT USING (public.is_admin());

-- API keys RLS policies
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Only admins can view all API keys" ON api_keys
    FOR SELECT USING (public.is_admin());

-- Audit logs RLS policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can view all audit logs" ON audit_logs
    FOR SELECT USING (public.is_admin());

-- =============================================================================
-- 6. ADDITIONAL HELPER FUNCTIONS
-- =============================================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_record_id TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
        auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user last activity
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_activity();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_activity();

-- =============================================================================
-- 8. INITIAL DATA (OPTIONAL)
-- =============================================================================

-- Insert a default admin user (you'll need to create the auth.users record first)
-- INSERT INTO public.users (id, email, full_name, role) 
-- VALUES ('your-admin-uuid', 'admin@example.com', 'System Administrator', 'admin');

-- =============================================================================
-- 9. GRANTS AND PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant necessary permissions to anon users (for public read access)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;


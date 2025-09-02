-- =============================================================================
-- Real Estate Backend - Database Security Setup
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
-- 3. RLS POLICIES FOR PROPERTY TABLES
-- =============================================================================

-- Common Fields RLS Policies
CREATE POLICY "Public can view basic property info" ON common_fields
    FOR SELECT USING (
        -- Allow public access to basic property information
        true
    );

CREATE POLICY "Authenticated users can view full property details" ON common_fields
    FOR SELECT USING (
        -- Allow authenticated users to see everything
        auth.role() = 'authenticated'
    );

CREATE POLICY "Only admins can modify properties" ON common_fields
    FOR ALL USING (
        -- Only admins can insert/update/delete
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Property Media RLS Policies
CREATE POLICY "Public can view property media" ON property_media
    FOR SELECT USING (
        -- Allow public access to media
        true
    );

CREATE POLICY "Only admins can modify media" ON property_media
    FOR ALL USING (
        -- Only admins can insert/update/delete
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Property OpenHouse RLS Policies
CREATE POLICY "Public can view open houses" ON property_openhouse
    FOR SELECT USING (
        -- Allow public access to open houses
        true
    );

CREATE POLICY "Only admins can modify open houses" ON property_openhouse
    FOR ALL USING (
        -- Only admins can insert/update/delete
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Property Rooms RLS Policies
CREATE POLICY "Public can view property rooms" ON property_rooms
    FOR SELECT USING (
        -- Allow public access to room details
        true
    );

CREATE POLICY "Only admins can modify rooms" ON property_rooms
    FOR ALL USING (
        -- Only admins can insert/update/delete
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Residential Property Tables RLS Policies
CREATE POLICY "Public can view residential properties" ON residential_freehold
    FOR SELECT USING (true);

CREATE POLICY "Public can view residential properties" ON residential_condo
    FOR SELECT USING (true);

CREATE POLICY "Public can view residential properties" ON residential_lease
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify residential properties" ON residential_freehold
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Only admins can modify residential properties" ON residential_condo
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Only admins can modify residential properties" ON residential_lease
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =============================================================================
-- 4. RLS POLICIES FOR USER TABLES
-- =============================================================================

-- Users table RLS policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (
        auth.uid() = id
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (
        auth.uid() = id
    );

CREATE POLICY "Only admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- User profiles RLS policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (
        auth.uid() = id
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (
        auth.uid() = id
    );

CREATE POLICY "Only admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- API keys RLS policies
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (
        auth.uid() = user_id
    );

CREATE POLICY "Only admins can view all API keys" ON api_keys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Audit logs RLS policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Only admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Function to get current user role
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

-- Function to check if user is admin
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

-- Function to log user actions
CREATE OR REPLACE FUNCTION public.log_user_action(
    action_name TEXT,
    table_name TEXT DEFAULT NULL,
    record_id TEXT DEFAULT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, 
        old_values, new_values, ip_address, user_agent
    ) VALUES (
        auth.uid(), action_name, table_name, record_id,
        old_values, new_values, 
        inet_client_addr(), current_setting('request.headers')::json->>'user-agent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. INITIAL DATA SETUP
-- =============================================================================

-- Create a default admin user (you'll need to create this user in Supabase Auth first)
-- Then run this to set their role:
-- INSERT INTO public.users (id, email, full_name, role) 
-- VALUES ('your-user-uuid', 'your-email@example.com', 'Admin User', 'admin');

-- =============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for user tables
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =============================================================================
-- 8. TRIGGERS FOR AUDIT LOGGING
-- =============================================================================

-- Trigger function for logging changes
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_user_action(
            'INSERT',
            TG_TABLE_NAME,
            NEW.id::TEXT,
            NULL,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_user_action(
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id::TEXT,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_user_action(
            'DELETE',
            TG_TABLE_NAME,
            OLD.id::TEXT,
            to_jsonb(OLD),
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to key tables
CREATE TRIGGER audit_common_fields_trigger
    AFTER INSERT OR UPDATE OR DELETE ON common_fields
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_property_media_trigger
    AFTER INSERT OR UPDATE OR DELETE ON property_media
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- This script sets up:
-- ✅ Row Level Security (RLS) on all property tables
-- ✅ User management tables (users, user_profiles, api_keys)
-- ✅ Audit logging system
-- ✅ RLS policies for different user roles
-- ✅ Helper functions for security checks
-- ✅ Performance indexes
-- ✅ Audit triggers for change tracking

-- Next steps:
-- 1. Run this script in your Supabase SQL editor
-- 2. Create your first admin user in Supabase Auth
-- 3. Update the users table with your admin role
-- 4. Test the security policies

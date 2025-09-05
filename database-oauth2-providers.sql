-- =============================================================================
-- Real Estate Backend - OAuth2 Providers Table
-- =============================================================================

-- Create OAuth2 providers table
CREATE TABLE IF NOT EXISTS public.oauth2_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'github')),
    provider_id TEXT NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    picture_url TEXT,
    access_token TEXT, -- Encrypted in production
    refresh_token TEXT, -- Encrypted in production
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one provider per user
    UNIQUE(user_id, provider),
    -- Ensure one provider_id per provider
    UNIQUE(provider, provider_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth2_providers_user_id ON public.oauth2_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth2_providers_provider ON public.oauth2_providers(provider);
CREATE INDEX IF NOT EXISTS idx_oauth2_providers_provider_id ON public.oauth2_providers(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_oauth2_providers_email ON public.oauth2_providers(email);

-- Enable RLS
ALTER TABLE public.oauth2_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for OAuth2 providers
CREATE POLICY "Users can view their own OAuth2 providers" ON public.oauth2_providers
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert their own OAuth2 providers" ON public.oauth2_providers
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own OAuth2 providers" ON public.oauth2_providers
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their own OAuth2 providers" ON public.oauth2_providers
    FOR DELETE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Only admins can view all OAuth2 providers" ON public.oauth2_providers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_oauth2_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_oauth2_providers_updated_at
    BEFORE UPDATE ON public.oauth2_providers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_oauth2_providers_updated_at();

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth2_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE public.oauth2_providers 
    SET access_token = NULL, refresh_token = NULL, token_expires_at = NULL
    WHERE token_expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth2_providers TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

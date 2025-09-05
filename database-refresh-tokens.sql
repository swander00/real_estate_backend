-- =============================================================================
-- Real Estate Backend - Refresh Tokens Table
-- =============================================================================

-- Create refresh tokens table
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for refresh tokens
CREATE POLICY "Users can view their own refresh tokens" ON public.refresh_tokens
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert their own refresh tokens" ON public.refresh_tokens
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own refresh tokens" ON public.refresh_tokens
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their own refresh tokens" ON public.refresh_tokens
    FOR DELETE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Only admins can view all refresh tokens" ON public.refresh_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.refresh_tokens 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired tokens (if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT public.cleanup_expired_tokens();');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refresh_tokens TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

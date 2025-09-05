-- Create sync_jobs table for tracking synchronization jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('idx', 'vow')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('full', 'incremental', 'backfill')),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- User tracking
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by VARCHAR(255),
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Job configuration
    force BOOLEAN DEFAULT FALSE,
    
    -- Progress tracking
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Record counts
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    CONSTRAINT valid_timing CHECK (
        (started_at IS NULL OR started_at >= created_at) AND
        (completed_at IS NULL OR completed_at >= COALESCE(started_at, created_at))
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_provider ON sync_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_provider_status ON sync_jobs(provider, status);

-- Create a function to create the table (for RPC calls)
CREATE OR REPLACE FUNCTION create_sync_jobs_table()
RETURNS void AS $$
BEGIN
    -- Table creation is handled above, this function exists for RPC compatibility
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a view for sync job statistics
CREATE OR REPLACE VIEW sync_job_stats AS
SELECT 
    provider,
    type,
    status,
    COUNT(*) as job_count,
    AVG(progress) as avg_progress,
    SUM(records_processed) as total_processed,
    SUM(records_created) as total_created,
    SUM(records_updated) as total_updated,
    SUM(records_skipped) as total_skipped,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM sync_jobs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider, type, status;

-- Create a function to clean up old completed jobs
CREATE OR REPLACE FUNCTION cleanup_old_sync_jobs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_jobs 
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_jobs TO authenticated;
GRANT SELECT ON sync_job_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sync_jobs(INTEGER) TO authenticated;

-- =====================================================
-- CREATE AUDIT_LOGS TABLE
-- =====================================================
-- This table stores audit logs for system activities

-- Create the audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admins can see all audit logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
            AND profiles.is_active = true
        )
    );

-- Users can only see their own audit logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (user_id = auth.uid());

-- Only the system (service role) can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.audit_logs IS 'System audit log for tracking user actions and system events';
COMMENT ON COLUMN public.audit_logs.action IS 'The action that was performed (e.g., CREATE, UPDATE, DELETE, LOGIN, etc.)';
COMMENT ON COLUMN public.audit_logs.table_name IS 'The table that was affected by the action';
COMMENT ON COLUMN public.audit_logs.record_id IS 'The ID of the record that was affected';
COMMENT ON COLUMN public.audit_logs.old_values IS 'The previous values before the change (for UPDATE actions)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'The new values after the change (for CREATE/UPDATE actions)';

-- Test the table creation
SELECT 'audit_logs table created successfully' as status;
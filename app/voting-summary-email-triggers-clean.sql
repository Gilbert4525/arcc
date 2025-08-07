-- =====================================================
-- Voting Summary Email Triggers - CLEAN VERSION
-- =====================================================
-- This file contains database triggers that automatically detect
-- voting completion and trigger summary email sending.

-- Function to get total eligible voters (board members and admins)
CREATE OR REPLACE FUNCTION get_total_eligible_voters()
RETURNS INTEGER AS $$
DECLARE
    voter_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO voter_count
    FROM profiles
    WHERE is_active = true
    AND role IN ('admin', 'board_member');
    
    RETURN COALESCE(voter_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger voting summary email (FIXED VERSION)
CREATE OR REPLACE FUNCTION trigger_voting_summary_email_enhanced(item_type TEXT, item_id UUID)
RETURNS VOID AS $$
DECLARE
    payload JSONB;
    audit_log_id UUID;
    item_title TEXT;
    voting_status TEXT;
BEGIN
    -- Get item details for better logging
    IF item_type = 'resolution' THEN
        SELECT title, status INTO item_title, voting_status
        FROM resolutions WHERE id = item_id;
    ELSE
        SELECT title, status INTO item_title, voting_status
        FROM minutes WHERE id = item_id;
    END IF;
    
    -- Prepare enhanced payload
    payload := jsonb_build_object(
        'action', 'trigger_email',
        'type', item_type,
        'id', item_id,
        'title', COALESCE(item_title, 'Unknown'),
        'status', COALESCE(voting_status, 'unknown'),
        'timestamp', NOW(),
        'trigger_reason', 'voting_complete',
        'source', 'database_trigger_enhanced'
    );
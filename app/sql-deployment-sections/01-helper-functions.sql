-- =====================================================
-- Voting Summary Email Triggers - Helper Functions
-- =====================================================

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

-- Function to check if resolution voting is complete
CREATE OR REPLACE FUNCTION check_resolution_voting_complete(resolution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    resolution_record RECORD;
    total_votes INTEGER;
    eligible_voters INTEGER;
    deadline_passed BOOLEAN := false;
BEGIN
    -- Get resolution details
    SELECT * INTO resolution_record
    FROM resolutions
    WHERE id = resolution_id;
    
    -- Only check resolutions in voting status
    IF resolution_record.status != 'voting' THEN
        RETURN false;
    END IF;
    
    -- Get vote count
    SELECT COUNT(*) INTO total_votes
    FROM resolution_votes
    WHERE resolution_id = resolution_record.id;
    
    -- Get eligible voters count
    eligible_voters := get_total_eligible_voters();
    
    -- Check if deadline has passed
    IF resolution_record.voting_deadline IS NOT NULL THEN
        deadline_passed := resolution_record.voting_deadline < NOW();
    END IF;
    
    -- Voting is complete if all eligible voters have voted OR deadline has passed
    RETURN (total_votes >= eligible_voters) OR deadline_passed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
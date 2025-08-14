-- =====================================================
-- SIMPLIFIED VOTING COMPLETION TRIGGERS
-- No webhook URL needed - uses pg_notify only
-- =====================================================

-- Function to get total eligible voters
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
    SELECT * INTO resolution_record
    FROM resolutions
    WHERE id = resolution_id;
    
    IF resolution_record.status != 'voting' THEN
        RETURN false;
    END IF;
    
    SELECT COUNT(*) INTO total_votes
    FROM resolution_votes
    WHERE resolution_id = resolution_record.id;
    
    eligible_voters := get_total_eligible_voters();
    
    IF resolution_record.voting_deadline IS NOT NULL THEN
        deadline_passed := resolution_record.voting_deadline < NOW();
    END IF;
    
    RETURN (total_votes >= eligible_voters) OR deadline_passed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if minutes voting is complete
CREATE OR REPLACE FUNCTION check_minutes_voting_complete(minutes_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    minutes_record RECORD;
    total_votes INTEGER;
    eligible_voters INTEGER;
    deadline_passed BOOLEAN := false;
BEGIN
    SELECT * INTO minutes_record
    FROM minutes
    WHERE id = minutes_id;
    
    IF minutes_record.status != 'voting' THEN
        RETURN false;
    END IF;
    
    SELECT COUNT(*) INTO total_votes
    FROM minutes_votes
    WHERE minutes_id = minutes_record.id;
    
    eligible_voters := get_total_eligible_voters();
    
    IF minutes_record.voting_deadline IS NOT NULL THEN
        deadline_passed := minutes_record.voting_deadline < NOW();
    END IF;
    
    RETURN (total_votes >= eligible_voters) OR deadline_passed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified function to trigger voting summary email
-- Uses only pg_notify - no HTTP calls needed
CREATE OR REPLACE FUNCTION trigger_voting_summary_email(item_type TEXT, item_id UUID)
RETURNS VOID AS $$
DECLARE
    payload JSONB;
    item_title TEXT;
BEGIN
    -- Get item title for better logging
    IF item_type = 'resolution' THEN
        SELECT title INTO item_title FROM resolutions WHERE id = item_id;
    ELSE
        SELECT title INTO item_title FROM minutes WHERE id = item_id;
    END IF;
    
    payload := jsonb_build_object(
        'action', 'send_voting_summary',
        'type', item_type,
        'id', item_id,
        'title', COALESCE(item_title, 'Unknown'),
        'timestamp', NOW(),
        'source', 'database_trigger'
    );
    
    -- Log the trigger
    RAISE NOTICE 'Triggering voting summary email for % "%" (%)', item_type, COALESCE(item_title, 'Unknown'), item_id;
    
    -- Send notification (this will be picked up by the API)
    PERFORM pg_notify('voting_summary_email', payload::text);
    
    -- Also send to general voting completion channel
    PERFORM pg_notify('voting_completion', payload::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolution voting completion trigger function
CREATE OR REPLACE FUNCTION handle_resolution_vote_change()
RETURNS TRIGGER AS $$
DECLARE
    voting_complete BOOLEAN;
    new_status TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    -- Update vote counts first
    UPDATE resolutions SET
        votes_for = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = NEW.resolution_id AND vote = 'for'),
        votes_against = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = NEW.resolution_id AND vote = 'against'),
        votes_abstain = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = NEW.resolution_id AND vote = 'abstain'),
        updated_at = NOW()
    WHERE id = NEW.resolution_id;
    
    -- Check if voting is complete
    voting_complete := check_resolution_voting_complete(NEW.resolution_id);
    
    IF voting_complete THEN
        -- Calculate new status based on votes
        SELECT CASE 
            WHEN votes_for > votes_against THEN 'approved'
            ELSE 'rejected'
        END INTO new_status
        FROM resolutions WHERE id = NEW.resolution_id;
        
        -- Update resolution status
        UPDATE resolutions SET
            status = new_status,
            updated_at = NOW()
        WHERE id = NEW.resolution_id AND status = 'voting';
        
        -- Only trigger email if status was actually updated (prevents duplicate triggers)
        IF FOUND THEN
            PERFORM trigger_voting_summary_email('resolution', NEW.resolution_id);
            RAISE NOTICE 'Resolution % voting completed with status: %', NEW.resolution_id, new_status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Minutes voting completion trigger function
CREATE OR REPLACE FUNCTION handle_minutes_vote_change()
RETURNS TRIGGER AS $$
DECLARE
    voting_complete BOOLEAN;
    new_status TEXT;
    approve_count INTEGER;
    reject_count INTEGER;
    abstain_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    -- Update vote counts first
    SELECT 
        COUNT(CASE WHEN vote = 'approve' THEN 1 END),
        COUNT(CASE WHEN vote = 'reject' THEN 1 END),
        COUNT(CASE WHEN vote = 'abstain' THEN 1 END)
    INTO approve_count, reject_count, abstain_count
    FROM minutes_votes
    WHERE minutes_id = NEW.minutes_id;
    
    UPDATE minutes SET
        approve_votes = approve_count,
        reject_votes = reject_count,
        abstain_votes = abstain_count,
        total_votes = approve_count + reject_count + abstain_count,
        updated_at = NOW()
    WHERE id = NEW.minutes_id;
    
    -- Check if voting is complete
    voting_complete := check_minutes_voting_complete(NEW.minutes_id);
    
    IF voting_complete THEN
        -- Calculate new status based on votes
        new_status := CASE 
            WHEN approve_count > reject_count THEN 'passed'
            ELSE 'failed'
        END;
        
        -- Update minutes status
        UPDATE minutes SET
            status = new_status,
            updated_at = NOW()
        WHERE id = NEW.minutes_id AND status = 'voting';
        
        -- Only trigger email if status was actually updated (prevents duplicate triggers)
        IF FOUND THEN
            PERFORM trigger_voting_summary_email('minutes', NEW.minutes_id);
            RAISE NOTICE 'Minutes % voting completed with status: %', NEW.minutes_id, new_status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the triggers
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion ON resolution_votes;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion ON minutes_votes;

CREATE TRIGGER trigger_resolution_vote_completion
    AFTER INSERT OR UPDATE ON resolution_votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_resolution_vote_change();

CREATE TRIGGER trigger_minutes_vote_completion
    AFTER INSERT OR UPDATE ON minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_minutes_vote_change();

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_total_eligible_voters() TO authenticated;
GRANT EXECUTE ON FUNCTION check_resolution_voting_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_minutes_voting_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_voting_summary_email(TEXT, UUID) TO authenticated;

-- Test the notification system
SELECT 'Voting completion triggers installed successfully!' as status;
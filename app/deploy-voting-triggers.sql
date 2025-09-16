-- =====================================================
-- DEPLOY VOTING EMAIL TRIGGERS - SAFE DEPLOYMENT
-- =====================================================
-- This script safely deploys the voting completion email triggers
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 1: Create Helper Functions
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

-- Function to check if minutes voting is complete
CREATE OR REPLACE FUNCTION check_minutes_voting_complete(minutes_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    minutes_record RECORD;
    total_votes INTEGER;
    eligible_voters INTEGER;
    deadline_passed BOOLEAN := false;
BEGIN
    -- Get minutes details
    SELECT * INTO minutes_record
    FROM minutes
    WHERE id = minutes_id;
    
    -- Only check minutes in voting status
    IF minutes_record.status != 'voting' THEN
        RETURN false;
    END IF;
    
    -- Get vote count
    SELECT COUNT(*) INTO total_votes
    FROM minutes_votes
    WHERE minutes_id = minutes_record.id;
    
    -- Get eligible voters count
    eligible_voters := get_total_eligible_voters();
    
    -- Check if deadline has passed
    IF minutes_record.voting_deadline IS NOT NULL THEN
        deadline_passed := minutes_record.voting_deadline < NOW();
    END IF;
    
    -- Voting is complete if all eligible voters have voted OR deadline has passed
    RETURN (total_votes >= eligible_voters) OR deadline_passed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate resolution outcome
CREATE OR REPLACE FUNCTION calculate_resolution_outcome(resolution_id UUID)
RETURNS TEXT AS $$
DECLARE
    resolution_record RECORD;
    total_votes INTEGER;
    eligible_voters INTEGER;
    participation_rate NUMERIC;
    approval_rate NUMERIC;
    quorum_met BOOLEAN;
    approval_met BOOLEAN;
BEGIN
    -- Get resolution with vote counts
    SELECT r.*, 
           COALESCE(r.votes_for, 0) as votes_for,
           COALESCE(r.votes_against, 0) as votes_against,
           COALESCE(r.votes_abstain, 0) as votes_abstain
    INTO resolution_record
    FROM resolutions r
    WHERE r.id = resolution_id;
    
    total_votes := resolution_record.votes_for + resolution_record.votes_against + resolution_record.votes_abstain;
    eligible_voters := get_total_eligible_voters();
    
    -- Calculate rates
    participation_rate := CASE WHEN eligible_voters > 0 THEN (total_votes::NUMERIC / eligible_voters) * 100 ELSE 0 END;
    approval_rate := CASE WHEN total_votes > 0 THEN (resolution_record.votes_for::NUMERIC / total_votes) * 100 ELSE 0 END;
    
    -- Check thresholds
    quorum_met := participation_rate >= COALESCE(resolution_record.minimum_quorum, 50);
    approval_met := approval_rate >= 75; -- Default approval threshold
    
    -- Determine outcome
    IF quorum_met AND approval_met THEN
        RETURN 'approved';
    ELSE
        RETURN 'rejected';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate minutes outcome
CREATE OR REPLACE FUNCTION calculate_minutes_outcome(minutes_id UUID)
RETURNS TEXT AS $$
DECLARE
    approve_votes INTEGER;
    reject_votes INTEGER;
    abstain_votes INTEGER;
    total_votes INTEGER;
    eligible_voters INTEGER;
    participation_rate NUMERIC;
    approval_rate NUMERIC;
    quorum_met BOOLEAN;
    approval_met BOOLEAN;
BEGIN
    -- Get vote counts
    SELECT 
        COUNT(CASE WHEN vote = 'approve' THEN 1 END),
        COUNT(CASE WHEN vote = 'reject' THEN 1 END),
        COUNT(CASE WHEN vote = 'abstain' THEN 1 END),
        COUNT(*)
    INTO approve_votes, reject_votes, abstain_votes, total_votes
    FROM minutes_votes
    WHERE minutes_id = minutes_id;
    
    eligible_voters := get_total_eligible_voters();
    
    -- Calculate rates
    participation_rate := CASE WHEN eligible_voters > 0 THEN (total_votes::NUMERIC / eligible_voters) * 100 ELSE 0 END;
    approval_rate := CASE WHEN total_votes > 0 THEN (approve_votes::NUMERIC / total_votes) * 100 ELSE 0 END;
    
    -- Check thresholds
    quorum_met := participation_rate >= 50; -- Default quorum
    approval_met := approval_rate >= 75; -- Default approval threshold
    
    -- Determine outcome
    IF quorum_met AND approval_met THEN
        RETURN 'passed';
    ELSE
        RETURN 'failed';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Create Email Trigger Function
-- =====================================================

-- Enhanced function to trigger voting summary email with better logging and error handling
CREATE OR REPLACE FUNCTION trigger_voting_summary_email_enhanced(item_type TEXT, item_id UUID)
RETURNS VOID AS $$
DECLARE
    webhook_url TEXT;
    payload JSONB;
    response TEXT;
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
    
    -- Construct webhook URL (this would be configured based on your deployment)
    webhook_url := COALESCE(
        current_setting('app.webhook_base_url', true),
        'http://localhost:3000'
    ) || '/api/voting-completion';
    
    -- Prepare enhanced payload
    payload := jsonb_build_object(
        'action', 'trigger_email',
        'type', item_type,
        'id', item_id,
        'title', item_title,
        'status', voting_status,
        'timestamp', NOW(),
        'trigger_reason', 'voting_complete',
        'source', 'database_trigger_enhanced'
    );
    
    -- Log the trigger attempt in audit logs
    INSERT INTO audit_logs (
        user_id, 
        action, 
        table_name, 
        record_id, 
        new_values,
        created_at
    ) VALUES (
        NULL, -- System action
        'VOTING_SUMMARY_EMAIL_TRIGGERED',
        CASE WHEN item_type = 'resolution' THEN 'resolutions' ELSE 'minutes' END,
        item_id,
        payload,
        NOW()
    ) RETURNING id INTO audit_log_id;
    
    -- Log the trigger attempt with more details
    RAISE NOTICE 'Triggering voting summary email for % "%" (%) - Status: % (audit_log_id: %)', 
        item_type, item_title, item_id, voting_status, audit_log_id;
    
    -- Send notification that can be picked up by the background process
    -- This will trigger the VotingNotificationListener which will call our email service
    PERFORM pg_notify('voting_completion', payload::text);
    
    -- Also send a direct notification for immediate processing by our voting summary service
    PERFORM pg_notify('voting_summary_email', jsonb_build_object(
        'type', item_type,
        'id', item_id,
        'title', item_title,
        'status', voting_status,
        'action', 'send_summary',
        'audit_log_id', audit_log_id,
        'timestamp', NOW()
    )::text);
    
    -- Log successful trigger
    RAISE NOTICE 'Successfully triggered voting summary email notifications for % %', item_type, item_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error in audit logs with detailed information
        INSERT INTO audit_logs (
            user_id, 
            action, 
            table_name, 
            record_id, 
            new_values,
            created_at
        ) VALUES (
            NULL,
            'VOTING_SUMMARY_EMAIL_ERROR',
            CASE WHEN item_type = 'resolution' THEN 'resolutions' ELSE 'minutes' END,
            item_id,
            jsonb_build_object(
                'error', SQLERRM,
                'sqlstate', SQLSTATE,
                'payload', payload,
                'item_title', item_title,
                'voting_status', voting_status
            ),
            NOW()
        );
        
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to trigger voting summary email for % "%" (%): % (SQLSTATE: %)', 
            item_type, COALESCE(item_title, 'Unknown'), item_id, SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: Create Trigger Handler Functions
-- =====================================================

-- Enhanced resolution voting completion trigger
CREATE OR REPLACE FUNCTION handle_resolution_vote_change_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    voting_complete BOOLEAN;
    new_status TEXT;
BEGIN
    -- Only process if this is an INSERT or UPDATE on an active voting resolution
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record
        IF NOT check_resolution_voting_complete(OLD.resolution_id) THEN
            RETURN OLD;
        END IF;
        
        -- Update vote counts after deletion
        UPDATE resolutions SET
            votes_for = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = OLD.resolution_id AND vote = 'for'),
            votes_against = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = OLD.resolution_id AND vote = 'against'),
            votes_abstain = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = OLD.resolution_id AND vote = 'abstain'),
            updated_at = NOW()
        WHERE id = OLD.resolution_id;
        
        RETURN OLD;
    END IF;
    
    -- For INSERT and UPDATE, use NEW record
    -- Update vote counts first
    UPDATE resolutions SET
        votes_for = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = NEW.resolution_id AND vote = 'for'),
        votes_against = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = NEW.resolution_id AND vote = 'against'),
        votes_abstain = (SELECT COUNT(*) FROM resolution_votes WHERE resolution_id = NEW.resolution_id AND vote = 'abstain'),
        updated_at = NOW()
    WHERE id = NEW.resolution_id;
    
    -- Check if voting is now complete
    voting_complete := check_resolution_voting_complete(NEW.resolution_id);
    
    IF voting_complete THEN
        -- Calculate outcome and update status
        new_status := calculate_resolution_outcome(NEW.resolution_id);
        
        -- Update resolution status
        UPDATE resolutions SET
            status = new_status,
            updated_at = NOW()
        WHERE id = NEW.resolution_id AND status = 'voting';
        
        -- Only trigger email if status was actually updated (prevents duplicate triggers)
        IF FOUND THEN
            -- Trigger voting summary email using enhanced function
            PERFORM trigger_voting_summary_email_enhanced('resolution', NEW.resolution_id);
            
            RAISE NOTICE 'Resolution % voting completed with status: %', NEW.resolution_id, new_status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced minutes voting completion trigger
CREATE OR REPLACE FUNCTION handle_minutes_vote_change_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    voting_complete BOOLEAN;
    new_status TEXT;
    approve_count INTEGER;
    reject_count INTEGER;
    abstain_count INTEGER;
BEGIN
    -- Only process if this is an INSERT or UPDATE on an active voting minutes
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record
        IF NOT check_minutes_voting_complete(OLD.minutes_id) THEN
            RETURN OLD;
        END IF;
        
        -- Update vote counts after deletion
        SELECT 
            COUNT(CASE WHEN vote = 'approve' THEN 1 END),
            COUNT(CASE WHEN vote = 'reject' THEN 1 END),
            COUNT(CASE WHEN vote = 'abstain' THEN 1 END)
        INTO approve_count, reject_count, abstain_count
        FROM minutes_votes
        WHERE minutes_id = OLD.minutes_id;
        
        UPDATE minutes SET
            approve_votes = approve_count,
            reject_votes = reject_count,
            abstain_votes = abstain_count,
            total_votes = approve_count + reject_count + abstain_count,
            updated_at = NOW()
        WHERE id = OLD.minutes_id;
        
        RETURN OLD;
    END IF;
    
    -- For INSERT and UPDATE, use NEW record
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
    
    -- Check if voting is now complete
    voting_complete := check_minutes_voting_complete(NEW.minutes_id);
    
    IF voting_complete THEN
        -- Calculate outcome and update status
        new_status := calculate_minutes_outcome(NEW.minutes_id);
        
        -- Update minutes status
        UPDATE minutes SET
            status = new_status,
            updated_at = NOW()
        WHERE id = NEW.minutes_id AND status = 'voting';
        
        -- Only trigger email if status was actually updated (prevents duplicate triggers)
        IF FOUND THEN
            -- Trigger voting summary email using enhanced function
            PERFORM trigger_voting_summary_email_enhanced('minutes', NEW.minutes_id);
            
            RAISE NOTICE 'Minutes % voting completed with status: %', NEW.minutes_id, new_status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Create Triggers
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion ON resolution_votes;
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion_enhanced ON resolution_votes;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion ON minutes_votes;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion_enhanced ON minutes_votes;

-- Create enhanced triggers
CREATE TRIGGER trigger_resolution_vote_completion_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON resolution_votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_resolution_vote_change_enhanced();

CREATE TRIGGER trigger_minutes_vote_completion_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_minutes_vote_change_enhanced();

-- =====================================================
-- STEP 5: Grant Permissions
-- =====================================================

-- Grant necessary permissions for the trigger functions
GRANT EXECUTE ON FUNCTION get_total_eligible_voters() TO authenticated;
GRANT EXECUTE ON FUNCTION check_resolution_voting_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_minutes_voting_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_resolution_outcome(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_minutes_outcome(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_voting_summary_email_enhanced(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_resolution_vote_change_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_minutes_vote_change_enhanced() TO authenticated;

-- =====================================================
-- STEP 6: Create Deadline Expiration Function
-- =====================================================

-- Function to check and process expired voting deadlines
-- This should be called periodically by a cron job or scheduled task
CREATE OR REPLACE FUNCTION process_expired_voting_deadlines()
RETURNS TABLE(
    item_type TEXT,
    item_id UUID,
    item_title TEXT,
    expired_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    expired_resolution RECORD;
    expired_minutes RECORD;
    new_status TEXT;
BEGIN
    -- Process expired resolutions
    FOR expired_resolution IN
        SELECT r.id, r.title, r.voting_deadline
        FROM resolutions r
        WHERE r.status = 'voting'
        AND r.voting_deadline IS NOT NULL
        AND r.voting_deadline < NOW()
    LOOP
        -- Calculate outcome and update status
        new_status := calculate_resolution_outcome(expired_resolution.id);
        
        -- Update resolution status
        UPDATE resolutions SET
            status = new_status,
            updated_at = NOW()
        WHERE id = expired_resolution.id;
        
        -- Trigger voting summary email
        PERFORM trigger_voting_summary_email_enhanced('resolution', expired_resolution.id);
        
        -- Return result
        item_type := 'resolution';
        item_id := expired_resolution.id;
        item_title := expired_resolution.title;
        expired_at := expired_resolution.voting_deadline;
        RETURN NEXT;
        
        RAISE NOTICE 'Processed expired resolution: % (%) - Status: %', 
            expired_resolution.title, expired_resolution.id, new_status;
    END LOOP;
    
    -- Process expired minutes
    FOR expired_minutes IN
        SELECT m.id, m.title, m.voting_deadline
        FROM minutes m
        WHERE m.status = 'voting'
        AND m.voting_deadline IS NOT NULL
        AND m.voting_deadline < NOW()
    LOOP
        -- Calculate outcome and update status
        new_status := calculate_minutes_outcome(expired_minutes.id);
        
        -- Update minutes status
        UPDATE minutes SET
            status = new_status,
            updated_at = NOW()
        WHERE id = expired_minutes.id;
        
        -- Trigger voting summary email
        PERFORM trigger_voting_summary_email_enhanced('minutes', expired_minutes.id);
        
        -- Return result
        item_type := 'minutes';
        item_id := expired_minutes.id;
        item_title := expired_minutes.title;
        expired_at := expired_minutes.voting_deadline;
        RETURN NEXT;
        
        RAISE NOTICE 'Processed expired minutes: % (%) - Status: %', 
            expired_minutes.title, expired_minutes.id, new_status;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for deadline processing function
GRANT EXECUTE ON FUNCTION process_expired_voting_deadlines() TO authenticated;

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

-- Log successful deployment
INSERT INTO audit_logs (
    user_id, 
    action, 
    table_name, 
    record_id, 
    new_values,
    created_at
) VALUES (
    NULL,
    'VOTING_TRIGGERS_DEPLOYED',
    'system',
    gen_random_uuid(),
    jsonb_build_object(
        'deployment_timestamp', NOW(),
        'triggers_created', ARRAY[
            'trigger_resolution_vote_completion_enhanced',
            'trigger_minutes_vote_completion_enhanced'
        ],
        'functions_created', ARRAY[
            'get_total_eligible_voters',
            'check_resolution_voting_complete',
            'check_minutes_voting_complete',
            'calculate_resolution_outcome',
            'calculate_minutes_outcome',
            'trigger_voting_summary_email_enhanced',
            'handle_resolution_vote_change_enhanced',
            'handle_minutes_vote_change_enhanced',
            'process_expired_voting_deadlines'
        ],
        'status', 'success'
    ),
    NOW()
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'VOTING EMAIL TRIGGERS DEPLOYED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Triggers created:';
    RAISE NOTICE '- trigger_resolution_vote_completion_enhanced';
    RAISE NOTICE '- trigger_minutes_vote_completion_enhanced';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_total_eligible_voters';
    RAISE NOTICE '- check_resolution_voting_complete';
    RAISE NOTICE '- check_minutes_voting_complete';
    RAISE NOTICE '- calculate_resolution_outcome';
    RAISE NOTICE '- calculate_minutes_outcome';
    RAISE NOTICE '- trigger_voting_summary_email_enhanced';
    RAISE NOTICE '- handle_resolution_vote_change_enhanced';
    RAISE NOTICE '- handle_minutes_vote_change_enhanced';
    RAISE NOTICE '- process_expired_voting_deadlines';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Start the VotingNotificationListener background process';
    RAISE NOTICE '2. Test voting completion by creating test votes';
    RAISE NOTICE '3. Monitor audit_logs for trigger activity';
    RAISE NOTICE '=====================================================';
END $$;

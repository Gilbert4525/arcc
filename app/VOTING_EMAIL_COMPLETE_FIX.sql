-- COMPLETE VOTING EMAIL FIX
-- This script will fix the voting completion detection and email triggering

-- 1. First, let's create a function to properly detect voting completion
CREATE OR REPLACE FUNCTION check_voting_completion(
    item_type TEXT, -- 'resolution' or 'minutes'
    item_id UUID
) RETURNS JSONB AS $$
DECLARE
    total_votes INTEGER := 0;
    eligible_voters INTEGER := 0;
    voting_deadline TIMESTAMPTZ;
    item_status TEXT;
    is_complete BOOLEAN := false;
    completion_reason TEXT := 'not_complete';
    result JSONB;
BEGIN
    -- Get eligible voters count (board members and admins)
    SELECT COUNT(*) INTO eligible_voters
    FROM profiles 
    WHERE role IN ('admin', 'board_member') 
    AND is_active = true;
    
    IF item_type = 'resolution' THEN
        -- Get resolution details
        SELECT status, voting_deadline INTO item_status, voting_deadline
        FROM resolutions 
        WHERE id = item_id;
        
        -- Count votes for this resolution
        SELECT COUNT(*) INTO total_votes
        FROM resolution_votes 
        WHERE resolution_id = item_id;
        
        -- Check if resolution is open for voting (published status means voting is open)
        IF item_status != 'published' THEN
            completion_reason := 'not_open_for_voting';
        END IF;
        
    ELSIF item_type = 'minutes' THEN
        -- Get minutes details
        SELECT status, voting_deadline INTO item_status, voting_deadline
        FROM minutes 
        WHERE id = item_id;
        
        -- Count votes for this minutes
        SELECT COUNT(*) INTO total_votes
        FROM minutes_votes 
        WHERE minutes_id = item_id;
        
        -- Check if minutes is open for voting
        IF item_status != 'voting' THEN
            completion_reason := 'not_open_for_voting';
        END IF;
    END IF;
    
    -- Check completion conditions only if voting is open
    IF completion_reason = 'not_complete' THEN
        -- Check if all eligible voters have voted
        IF total_votes >= eligible_voters AND eligible_voters > 0 THEN
            is_complete := true;
            completion_reason := 'all_voted';
        -- Check if deadline has passed
        ELSIF voting_deadline IS NOT NULL AND voting_deadline <= NOW() THEN
            is_complete := true;
            completion_reason := 'deadline_expired';
        END IF;
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'isComplete', is_complete,
        'reason', completion_reason,
        'totalVotes', total_votes,
        'eligibleVoters', eligible_voters,
        'participationRate', CASE WHEN eligible_voters > 0 THEN (total_votes::FLOAT / eligible_voters::FLOAT) * 100 ELSE 0 END,
        'deadlineExpired', CASE WHEN voting_deadline IS NOT NULL THEN voting_deadline <= NOW() ELSE false END,
        'itemStatus', item_status,
        'votingDeadline', voting_deadline
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to trigger voting completion emails
CREATE OR REPLACE FUNCTION trigger_voting_completion_email(
    item_type TEXT,
    item_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    completion_status JSONB;
    email_triggered BOOLEAN := false;
BEGIN
    -- Check if voting is complete
    completion_status := check_voting_completion(item_type, item_id);
    
    -- If voting is complete, log the event (email will be triggered by the API)
    IF (completion_status->>'isComplete')::BOOLEAN = true THEN
        -- Insert a record to track that email should be sent
        INSERT INTO voting_completion_events (
            item_type,
            item_id,
            completion_reason,
            total_votes,
            eligible_voters,
            participation_rate,
            completed_at
        ) VALUES (
            item_type,
            item_id,
            completion_status->>'reason',
            (completion_status->>'totalVotes')::INTEGER,
            (completion_status->>'eligibleVoters')::INTEGER,
            (completion_status->>'participationRate')::FLOAT,
            NOW()
        )
        ON CONFLICT (item_type, item_id) DO UPDATE SET
            completion_reason = EXCLUDED.completion_reason,
            total_votes = EXCLUDED.total_votes,
            eligible_voters = EXCLUDED.eligible_voters,
            participation_rate = EXCLUDED.participation_rate,
            completed_at = EXCLUDED.completed_at,
            email_sent = false, -- Reset email_sent flag
            updated_at = NOW();
        
        email_triggered := true;
        
        RAISE NOTICE 'Voting completion detected for % %: % (% votes from % eligible voters)', 
            item_type, item_id, completion_status->>'reason', 
            completion_status->>'totalVotes', completion_status->>'eligibleVoters';
    END IF;
    
    RETURN email_triggered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create table to track voting completion events
CREATE TABLE IF NOT EXISTS voting_completion_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type TEXT NOT NULL CHECK (item_type IN ('resolution', 'minutes')),
    item_id UUID NOT NULL,
    completion_reason TEXT NOT NULL,
    total_votes INTEGER NOT NULL DEFAULT 0,
    eligible_voters INTEGER NOT NULL DEFAULT 0,
    participation_rate FLOAT NOT NULL DEFAULT 0,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    email_error TEXT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_type, item_id)
);

-- 4. Create triggers to automatically detect voting completion
CREATE OR REPLACE FUNCTION on_vote_cast() RETURNS TRIGGER AS $$
BEGIN
    -- Trigger completion check for resolution votes
    IF TG_TABLE_NAME = 'resolution_votes' THEN
        PERFORM trigger_voting_completion_email('resolution', NEW.resolution_id);
    -- Trigger completion check for minutes votes
    ELSIF TG_TABLE_NAME = 'minutes_votes' THEN
        PERFORM trigger_voting_completion_email('minutes', NEW.minutes_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion ON resolution_votes;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion ON minutes_votes;

-- Create new triggers
CREATE TRIGGER trigger_resolution_vote_completion
    AFTER INSERT OR UPDATE ON resolution_votes
    FOR EACH ROW
    EXECUTE FUNCTION on_vote_cast();

CREATE TRIGGER trigger_minutes_vote_completion
    AFTER INSERT OR UPDATE ON minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION on_vote_cast();

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voting_completion_events_pending 
ON voting_completion_events(item_type, item_id, email_sent) 
WHERE email_sent = false;

CREATE INDEX IF NOT EXISTS idx_voting_completion_events_completed 
ON voting_completion_events(completed_at DESC);

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON voting_completion_events TO authenticated;
GRANT EXECUTE ON FUNCTION check_voting_completion(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_voting_completion_email(TEXT, UUID) TO authenticated;

-- 7. Test the functions with current data
DO $$
DECLARE
    resolution_record RECORD;
    minutes_record RECORD;
    test_result JSONB;
BEGIN
    RAISE NOTICE '=== TESTING VOTING COMPLETION DETECTION ===';
    
    -- Test with published resolutions
    FOR resolution_record IN 
        SELECT id, title, status FROM resolutions WHERE status = 'published' ORDER BY created_at DESC LIMIT 3
    LOOP
        test_result := check_voting_completion('resolution', resolution_record.id);
        RAISE NOTICE 'Resolution "%" (%) - Complete: %, Reason: %, Votes: %/%', 
            resolution_record.title, resolution_record.id, 
            test_result->>'isComplete', test_result->>'reason',
            test_result->>'totalVotes', test_result->>'eligibleVoters';
    END LOOP;
    
    -- Test with voting minutes
    FOR minutes_record IN 
        SELECT id, title, status FROM minutes WHERE status = 'voting' ORDER BY created_at DESC LIMIT 3
    LOOP
        test_result := check_voting_completion('minutes', minutes_record.id);
        RAISE NOTICE 'Minutes "%" (%) - Complete: %, Reason: %, Votes: %/%', 
            minutes_record.title, minutes_record.id, 
            test_result->>'isComplete', test_result->>'reason',
            test_result->>'totalVotes', test_result->>'eligibleVoters';
    END LOOP;
    
    RAISE NOTICE '=== TEST COMPLETE ===';
END $$;

-- 8. Show current voting status for all active items
SELECT 
    'resolution' as type,
    r.id,
    r.title,
    r.status,
    r.voting_deadline,
    (SELECT COUNT(*) FROM resolution_votes rv WHERE rv.resolution_id = r.id) as current_votes,
    (SELECT COUNT(*) FROM profiles p WHERE p.role IN ('admin', 'board_member') AND p.is_active = true) as eligible_voters,
    check_voting_completion('resolution', r.id) as completion_status
FROM resolutions r 
WHERE r.status = 'published'
UNION ALL
SELECT 
    'minutes' as type,
    m.id,
    m.title,
    m.status,
    m.voting_deadline,
    (SELECT COUNT(*) FROM minutes_votes mv WHERE mv.minutes_id = m.id) as current_votes,
    (SELECT COUNT(*) FROM profiles p WHERE p.role IN ('admin', 'board_member') AND p.is_active = true) as eligible_voters,
    check_voting_completion('minutes', m.id) as completion_status
FROM minutes m 
WHERE m.status = 'voting'
ORDER BY type, title;
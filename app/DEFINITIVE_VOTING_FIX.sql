-- DEFINITIVE VOTING EMAIL FIX
-- Based on audit results: Vote counts are 0 but actual votes exist

-- 1. Fix existing vote count mismatches
UPDATE minutes 
SET 
    total_votes = (SELECT COUNT(*) FROM minutes_votes WHERE minutes_id = minutes.id),
    approve_votes = (SELECT COUNT(*) FROM minutes_votes WHERE minutes_id = minutes.id AND vote = 'approve'),
    reject_votes = (SELECT COUNT(*) FROM minutes_votes WHERE minutes_id = minutes.id AND vote = 'reject'),
    abstain_votes = (SELECT COUNT(*) FROM minutes_votes WHERE minutes_id = minutes.id AND vote = 'abstain'),
    updated_at = NOW()
WHERE total_votes != (SELECT COUNT(*) FROM minutes_votes mv WHERE mv.minutes_id = minutes.id);

-- 2. Drop broken triggers
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion ON resolution_votes;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion ON minutes_votes;

-- 3. Create working vote count update function
CREATE OR REPLACE FUNCTION update_minutes_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    minutes_id_to_update UUID;
    new_total INTEGER;
    new_approve INTEGER;
    new_reject INTEGER;
    new_abstain INTEGER;
BEGIN
    minutes_id_to_update := COALESCE(NEW.minutes_id, OLD.minutes_id);
    
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE vote = 'approve'),
        COUNT(*) FILTER (WHERE vote = 'reject'),
        COUNT(*) FILTER (WHERE vote = 'abstain')
    INTO new_total, new_approve, new_reject, new_abstain
    FROM minutes_votes 
    WHERE minutes_id = minutes_id_to_update;
    
    UPDATE minutes 
    SET 
        total_votes = new_total,
        approve_votes = new_approve,
        reject_votes = new_reject,
        abstain_votes = new_abstain,
        updated_at = NOW()
    WHERE id = minutes_id_to_update;
    
    RAISE NOTICE 'Updated vote counts for minutes %: total=%', minutes_id_to_update, new_total;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create completion detection function
CREATE OR REPLACE FUNCTION check_and_trigger_completion()
RETURNS TRIGGER AS $$
DECLARE
    item_id UUID;
    item_type TEXT;
    total_votes INTEGER := 0;
    eligible_voters INTEGER := 0;
    is_complete BOOLEAN := false;
BEGIN
    IF TG_TABLE_NAME = 'minutes_votes' THEN
        item_type := 'minutes';
        item_id := COALESCE(NEW.minutes_id, OLD.minutes_id);
        
        SELECT COUNT(*) INTO total_votes
        FROM minutes_votes 
        WHERE minutes_id = item_id;
    END IF;
    
    SELECT COUNT(*) INTO eligible_voters
    FROM profiles 
    WHERE role IN ('admin', 'board_member') 
    AND is_active = true;
    
    IF total_votes >= eligible_voters AND eligible_voters > 0 THEN
        is_complete := true;
        
        INSERT INTO voting_completion_events (
            item_type, item_id, completion_reason, total_votes, eligible_voters,
            participation_rate, completed_at
        ) VALUES (
            item_type, item_id, 'all_voted', total_votes, eligible_voters,
            (total_votes::FLOAT / eligible_voters::FLOAT) * 100, NOW()
        )
        ON CONFLICT (item_type, item_id) DO UPDATE SET
            email_sent = false, updated_at = NOW();
        
        RAISE NOTICE 'VOTING COMPLETED: % % - % votes from % eligible voters', 
            item_type, item_id, total_votes, eligible_voters;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Create completion events table
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
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_type, item_id)
);

-- 6. Create working triggers
CREATE TRIGGER trigger_minutes_vote_counts
    AFTER INSERT OR UPDATE OR DELETE ON minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_vote_counts();

CREATE TRIGGER trigger_minutes_completion_check
    AFTER INSERT OR UPDATE ON minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION check_and_trigger_completion();

-- 7. Test with existing data
DO $$
DECLARE
    test_minutes_id UUID := '1690328f-7d8b-4d53-a048-3838f2a3ad57';
    vote_count INTEGER;
    eligible_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO vote_count FROM minutes_votes WHERE minutes_id = test_minutes_id;
    SELECT COUNT(*) INTO eligible_count FROM profiles WHERE role IN ('admin', 'board_member') AND is_active = true;
    
    RAISE NOTICE 'TEST: ID=%, Votes=%, Eligible=%, Complete=%', 
        test_minutes_id, vote_count, eligible_count, 
        CASE WHEN vote_count >= eligible_count THEN 'YES' ELSE 'NO' END;
        
    IF vote_count >= eligible_count AND eligible_count > 0 THEN
        INSERT INTO voting_completion_events (
            item_type, item_id, completion_reason, total_votes, eligible_voters, 
            participation_rate, completed_at
        ) VALUES (
            'minutes', test_minutes_id, 'all_voted', vote_count, eligible_count,
            (vote_count::FLOAT / eligible_count::FLOAT) * 100, NOW()
        )
        ON CONFLICT (item_type, item_id) DO UPDATE SET
            email_sent = false, updated_at = NOW();
        
        RAISE NOTICE 'Created completion event for minutes %', test_minutes_id;
    END IF;
END $$;

RAISE NOTICE 'DEFINITIVE VOTING FIX COMPLETE!';
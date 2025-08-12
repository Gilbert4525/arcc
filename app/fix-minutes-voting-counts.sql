-- Fix Minutes Voting Count Issues
-- This script fixes the vote counting system for meeting minutes

-- 1. Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;
DROP FUNCTION IF EXISTS update_minutes_voting_results();

-- 2. Create corrected function to update minutes voting results
CREATE OR REPLACE FUNCTION update_minutes_voting_results()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the minutes table with current vote counts
    UPDATE public.minutes 
    SET 
        total_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id)
        ),
        approve_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id) 
            AND vote = 'approve'
        ),
        reject_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id) 
            AND vote = 'reject'
        ),
        abstain_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id) 
            AND vote = 'abstain'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.minutes_id, OLD.minutes_id);
    
    -- Check if voting should be automatically closed and status updated
    -- Fixed: Use 'passed'/'failed' instead of 'approved'/'rejected'
    UPDATE public.minutes 
    SET 
        status = CASE 
            WHEN (approve_votes::FLOAT / NULLIF(total_votes, 0) * 100) >= approval_threshold 
                 AND total_votes >= (total_eligible_voters * minimum_quorum / 100) 
            THEN 'passed'
            WHEN voting_deadline < NOW() 
            THEN CASE 
                WHEN (approve_votes::FLOAT / NULLIF(total_votes, 0) * 100) >= approval_threshold 
                     AND total_votes >= (total_eligible_voters * minimum_quorum / 100) 
                THEN 'passed'
                ELSE 'failed'
            END
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.minutes_id, OLD.minutes_id)
    AND status = 'voting';
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the trigger
CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();

-- 4. Create the missing refresh_minutes_vote_counts function
CREATE OR REPLACE FUNCTION refresh_minutes_vote_counts(minutes_id_param UUID)
RETURNS VOID AS $$
BEGIN
    -- Manually refresh vote counts for a specific minutes
    UPDATE public.minutes 
    SET 
        total_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = minutes_id_param
        ),
        approve_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = minutes_id_param 
            AND vote = 'approve'
        ),
        reject_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = minutes_id_param 
            AND vote = 'reject'
        ),
        abstain_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = minutes_id_param 
            AND vote = 'abstain'
        ),
        updated_at = NOW()
    WHERE id = minutes_id_param;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated vote counts for minutes %', minutes_id_param;
END;
$$ LANGUAGE plpgsql;

-- 5. Fix any existing minutes with incorrect vote counts
-- This will recalculate all vote counts for all minutes
UPDATE public.minutes 
SET 
    total_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id
    ),
    approve_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id 
        AND vote = 'approve'
    ),
    reject_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id 
        AND vote = 'reject'
    ),
    abstain_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id 
        AND vote = 'abstain'
    ),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM public.minutes_votes WHERE minutes_id = minutes.id
);

-- 6. Create a function to get detailed voting statistics for debugging
CREATE OR REPLACE FUNCTION get_minutes_voting_debug(minutes_id_param UUID)
RETURNS TABLE (
    minutes_id UUID,
    minutes_title TEXT,
    total_votes_calculated INTEGER,
    approve_votes_calculated INTEGER,
    reject_votes_calculated INTEGER,
    abstain_votes_calculated INTEGER,
    total_votes_stored INTEGER,
    approve_votes_stored INTEGER,
    reject_votes_stored INTEGER,
    abstain_votes_stored INTEGER,
    counts_match BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        (SELECT COUNT(*)::INTEGER FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id) as total_calc,
        (SELECT COUNT(*)::INTEGER FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id AND vote = 'approve') as approve_calc,
        (SELECT COUNT(*)::INTEGER FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id AND vote = 'reject') as reject_calc,
        (SELECT COUNT(*)::INTEGER FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id AND vote = 'abstain') as abstain_calc,
        m.total_votes,
        m.approve_votes,
        m.reject_votes,
        m.abstain_votes,
        (
            m.total_votes = (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id) AND
            m.approve_votes = (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id AND vote = 'approve') AND
            m.reject_votes = (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id AND vote = 'reject') AND
            m.abstain_votes = (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_votes.minutes_id = m.id AND vote = 'abstain')
        ) as counts_match
    FROM public.minutes m
    WHERE m.id = minutes_id_param;
END;
$$ LANGUAGE plpgsql;

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION refresh_minutes_vote_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_minutes_voting_debug(UUID) TO authenticated;
-- COMPLETE FIX: Fix trigger function syntax and update vote counts
-- This fixes the root cause of the vote count display issue

-- Step 1: Drop the existing trigger (in case it has syntax errors)
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;

-- Step 2: Recreate the trigger function with correct syntax
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

-- Step 3: Recreate the trigger
CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();

-- Step 4: Manually fix all existing vote counts
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
        WHERE minutes_id = minutes.id AND vote = 'approve'
    ),
    reject_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id AND vote = 'reject'
    ),
    abstain_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id AND vote = 'abstain'
    ),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM public.minutes_votes WHERE minutes_id = minutes.id
);

-- Step 5: Verify the fix worked
SELECT 
    m.id,
    m.title,
    m.status,
    m.total_votes,
    m.approve_votes,
    m.reject_votes,
    m.abstain_votes,
    (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_id = m.id) as actual_total_votes,
    (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_id = m.id AND vote = 'approve') as actual_approve_votes,
    (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_id = m.id AND vote = 'reject') as actual_reject_votes,
    (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_id = m.id AND vote = 'abstain') as actual_abstain_votes
FROM public.minutes m
WHERE m.status = 'voting'
ORDER BY m.created_at DESC;
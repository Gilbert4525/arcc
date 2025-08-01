-- ALTERNATIVE PERMANENT SOLUTION: Remove the broken trigger entirely
-- Instead, update vote counts directly in the application code

-- Step 1: Drop the broken trigger completely
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;
DROP FUNCTION IF EXISTS update_minutes_voting_results();

-- Step 2: Create a simple function to update vote counts (called manually from code)
CREATE OR REPLACE FUNCTION refresh_minutes_vote_counts(minutes_id_param UUID)
RETURNS void AS $$
BEGIN
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
            WHERE minutes_id = minutes_id_param AND vote = 'approve'
        ),
        reject_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = minutes_id_param AND vote = 'reject'
        ),
        abstain_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = minutes_id_param AND vote = 'abstain'
        ),
        updated_at = NOW()
    WHERE id = minutes_id_param;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Fix all existing vote counts
DO $$
DECLARE
    minutes_record RECORD;
BEGIN
    FOR minutes_record IN 
        SELECT DISTINCT minutes_id FROM public.minutes_votes
    LOOP
        PERFORM refresh_minutes_vote_counts(minutes_record.minutes_id);
    END LOOP;
END $$;

-- Step 4: Verify the fix
SELECT 
    m.id,
    m.title,
    m.total_votes,
    m.approve_votes,
    m.reject_votes,
    m.abstain_votes,
    (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_id = m.id) as actual_total_votes
FROM public.minutes m
WHERE EXISTS (SELECT 1 FROM public.minutes_votes WHERE minutes_id = m.id)
ORDER BY m.created_at DESC;
-- Fix Vote Count Display Issue
-- This script will fix the vote counting problem where 3 votes are showing as 1

-- 1. First, let's manually recalculate and update all vote counts
UPDATE public.resolutions 
SET 
    votes_for = COALESCE((
        SELECT COUNT(*) 
        FROM public.resolution_votes 
        WHERE resolution_id = resolutions.id AND vote = 'for'
    ), 0),
    votes_against = COALESCE((
        SELECT COUNT(*) 
        FROM public.resolution_votes 
        WHERE resolution_id = resolutions.id AND vote = 'against'
    ), 0),
    votes_abstain = COALESCE((
        SELECT COUNT(*) 
        FROM public.resolution_votes 
        WHERE resolution_id = resolutions.id AND vote = 'abstain'
    ), 0),
    updated_at = NOW()
WHERE status IN ('voting', 'approved', 'rejected');

-- 2. Verify the update worked
SELECT 
    r.id,
    r.title,
    r.resolution_number,
    r.status,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as total_votes,
    actual_counts.actual_total
FROM public.resolutions r
LEFT JOIN (
    SELECT 
        resolution_id,
        COUNT(*) as actual_total,
        COUNT(CASE WHEN vote = 'for' THEN 1 END) as actual_for,
        COUNT(CASE WHEN vote = 'against' THEN 1 END) as actual_against,
        COUNT(CASE WHEN vote = 'abstain' THEN 1 END) as actual_abstain
    FROM public.resolution_votes
    GROUP BY resolution_id
) actual_counts ON r.id = actual_counts.resolution_id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 3. Ensure the trigger function is working correctly
CREATE OR REPLACE FUNCTION update_resolution_vote_counts()
RETURNS TRIGGER AS $
BEGIN
    -- Log the trigger execution for debugging
    RAISE NOTICE 'Updating vote counts for resolution: %', COALESCE(NEW.resolution_id, OLD.resolution_id);
    
    -- Update vote counts for the affected resolution
    UPDATE public.resolutions 
    SET 
        votes_for = (
            SELECT COUNT(*) 
            FROM public.resolution_votes 
            WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) 
            AND vote = 'for'
        ),
        votes_against = (
            SELECT COUNT(*) 
            FROM public.resolution_votes 
            WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) 
            AND vote = 'against'
        ),
        votes_abstain = (
            SELECT COUNT(*) 
            FROM public.resolution_votes 
            WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) 
            AND vote = 'abstain'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.resolution_id, OLD.resolution_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- 4. Recreate the triggers to ensure they're working
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_insert ON public.resolution_votes;
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_update ON public.resolution_votes;
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_delete ON public.resolution_votes;

CREATE TRIGGER trigger_update_resolution_vote_counts_insert
    AFTER INSERT ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

CREATE TRIGGER trigger_update_resolution_vote_counts_update
    AFTER UPDATE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

CREATE TRIGGER trigger_update_resolution_vote_counts_delete
    AFTER DELETE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

-- 5. Test the trigger by updating a vote timestamp (this should trigger the count update)
-- This is a safe operation that won't change the actual vote but will test the trigger
UPDATE public.resolution_votes 
SET updated_at = NOW() 
WHERE id IN (
    SELECT rv.id 
    FROM public.resolution_votes rv
    JOIN public.resolutions r ON rv.resolution_id = r.id
    WHERE r.status = 'voting'
    LIMIT 1
);

-- 6. Final verification
SELECT 
    'After Fix' as status,
    r.id,
    r.title,
    r.resolution_number,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as stored_total,
    COALESCE(actual_counts.total_votes, 0) as actual_total,
    CASE 
        WHEN (r.votes_for + r.votes_against + r.votes_abstain) = COALESCE(actual_counts.total_votes, 0)
        THEN 'FIXED'
        ELSE 'STILL_BROKEN'
    END as fix_status
FROM public.resolutions r
LEFT JOIN (
    SELECT 
        resolution_id,
        COUNT(*) as total_votes
    FROM public.resolution_votes
    GROUP BY resolution_id
) actual_counts ON r.id = actual_counts.resolution_id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;
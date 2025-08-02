-- Comprehensive Fix for Vote Count Display Issue
-- This script addresses all potential causes of the vote counting problem

-- 1. Check current state before fixing
SELECT 
    'BEFORE FIX' as status,
    r.id,
    r.title,
    r.resolution_number,
    r.status,
    r.votes_for as stored_for,
    r.votes_against as stored_against,
    r.votes_abstain as stored_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as stored_total,
    COALESCE(vote_counts.actual_for, 0) as actual_for,
    COALESCE(vote_counts.actual_against, 0) as actual_against,
    COALESCE(vote_counts.actual_abstain, 0) as actual_abstain,
    COALESCE(vote_counts.actual_total, 0) as actual_total
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
) vote_counts ON r.id = vote_counts.resolution_id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 2. Remove any potential duplicate votes (safety check)
WITH duplicate_votes AS (
    SELECT 
        id,
        resolution_id,
        voter_id,
        ROW_NUMBER() OVER (
            PARTITION BY resolution_id, voter_id 
            ORDER BY voted_at DESC, created_at DESC
        ) as rn
    FROM public.resolution_votes
)
DELETE FROM public.resolution_votes 
WHERE id IN (
    SELECT id FROM duplicate_votes WHERE rn > 1
);

-- 3. Ensure unique constraint exists (ignore error if it already exists)
ALTER TABLE public.resolution_votes 
ADD CONSTRAINT resolution_votes_resolution_id_voter_id_key 
UNIQUE (resolution_id, voter_id);

-- 4. Recalculate ALL vote counts from scratch
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
WHERE id IN (
    SELECT DISTINCT resolution_id 
    FROM public.resolution_votes
    UNION
    SELECT id FROM public.resolutions 
    WHERE status IN ('voting', 'approved', 'rejected')
);

-- 5. Create improved trigger function with better error handling
CREATE OR REPLACE FUNCTION update_resolution_vote_counts()
RETURNS TRIGGER AS $
DECLARE
    target_resolution_id UUID;
    for_count INTEGER;
    against_count INTEGER;
    abstain_count INTEGER;
BEGIN
    -- Determine which resolution to update
    target_resolution_id := COALESCE(NEW.resolution_id, OLD.resolution_id);
    
    -- Get current vote counts
    SELECT 
        COUNT(CASE WHEN vote = 'for' THEN 1 END),
        COUNT(CASE WHEN vote = 'against' THEN 1 END),
        COUNT(CASE WHEN vote = 'abstain' THEN 1 END)
    INTO for_count, against_count, abstain_count
    FROM public.resolution_votes 
    WHERE resolution_id = target_resolution_id;
    
    -- Update the resolution with new counts
    UPDATE public.resolutions 
    SET 
        votes_for = for_count,
        votes_against = against_count,
        votes_abstain = abstain_count,
        updated_at = NOW()
    WHERE id = target_resolution_id;
    
    -- Log for debugging (can be removed in production)
    RAISE NOTICE 'Updated vote counts for resolution %: for=%, against=%, abstain=%', 
        target_resolution_id, for_count, against_count, abstain_count;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original operation
        RAISE WARNING 'Error updating vote counts for resolution %: %', target_resolution_id, SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- 6. Drop and recreate all triggers
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

-- 7. Test the trigger by updating a vote (safe operation)
-- Update the most recent vote to test the trigger
UPDATE public.resolution_votes 
SET updated_at = NOW() 
WHERE id = (
    SELECT rv.id
    FROM public.resolution_votes rv
    JOIN public.resolutions r ON rv.resolution_id = r.id
    WHERE r.status = 'voting'
    ORDER BY rv.created_at DESC
    LIMIT 1
);

-- 8. Final verification
SELECT 
    'AFTER FIX' as status,
    r.id,
    r.title,
    r.resolution_number,
    r.status,
    r.votes_for as stored_for,
    r.votes_against as stored_against,
    r.votes_abstain as stored_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as stored_total,
    COALESCE(vote_counts.actual_for, 0) as actual_for,
    COALESCE(vote_counts.actual_against, 0) as actual_against,
    COALESCE(vote_counts.actual_abstain, 0) as actual_abstain,
    COALESCE(vote_counts.actual_total, 0) as actual_total,
    CASE 
        WHEN r.votes_for = COALESCE(vote_counts.actual_for, 0) AND
             r.votes_against = COALESCE(vote_counts.actual_against, 0) AND
             r.votes_abstain = COALESCE(vote_counts.actual_abstain, 0)
        THEN '✅ FIXED'
        ELSE '❌ STILL BROKEN'
    END as fix_status
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
) vote_counts ON r.id = vote_counts.resolution_id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 9. Show individual votes for verification
SELECT 
    'INDIVIDUAL VOTES' as section,
    rv.resolution_id,
    r.title,
    r.resolution_number,
    COUNT(*) as total_votes,
    STRING_AGG(
        CASE 
            WHEN rv.vote = 'for' THEN '👍'
            WHEN rv.vote = 'against' THEN '👎'
            WHEN rv.vote = 'abstain' THEN '🤷'
        END, ' '
    ) as vote_summary,
    STRING_AGG(p.full_name, ', ') as voters
FROM public.resolution_votes rv
JOIN public.resolutions r ON rv.resolution_id = r.id
LEFT JOIN public.profiles p ON rv.voter_id = p.id
WHERE r.status IN ('voting', 'approved', 'rejected')
GROUP BY rv.resolution_id, r.title, r.resolution_number
ORDER BY r.created_at DESC;
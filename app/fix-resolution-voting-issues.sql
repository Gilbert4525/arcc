-- Fix Resolution Voting Issues
-- This script addresses duplicate vote issues and ensures vote counts are accurate

-- 1. First, let's check for any duplicate votes that might exist
SELECT 
    resolution_id,
    voter_id,
    COUNT(*) as vote_count
FROM public.resolution_votes 
GROUP BY resolution_id, voter_id 
HAVING COUNT(*) > 1;

-- 2. Remove any duplicate votes (keep the latest one)
WITH ranked_votes AS (
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
    SELECT id FROM ranked_votes WHERE rn > 1
);

-- 3. Ensure the unique constraint exists
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'resolution_votes' 
        AND constraint_name = 'resolution_votes_resolution_id_voter_id_key'
    ) THEN
        ALTER TABLE public.resolution_votes 
        DROP CONSTRAINT resolution_votes_resolution_id_voter_id_key;
    END IF;
    
    -- Add the unique constraint
    ALTER TABLE public.resolution_votes 
    ADD CONSTRAINT resolution_votes_resolution_id_voter_id_key 
    UNIQUE (resolution_id, voter_id);
END $$;

-- 4. Update all resolution vote counts to ensure they're accurate
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

-- 5. Create or replace the trigger function for automatic vote count updates
CREATE OR REPLACE FUNCTION update_resolution_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

-- 6. Drop existing triggers if they exist and create new ones
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_insert ON public.resolution_votes;
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_update ON public.resolution_votes;
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_delete ON public.resolution_votes;

-- Create triggers for automatic vote count updates
CREATE TRIGGER trigger_update_resolution_vote_counts_insert
    AFTER INSERT ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

CREATE TRIGGER trigger_update_resolution_vote_counts_update
    AFTER UPDATE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

CREATE TRIGGER trigger_update_resolution_vote_counts_delete
    AFTER DELETE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

-- 7. Verify the data integrity
SELECT 
    r.id,
    r.title,
    r.status,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    (
        SELECT COUNT(*) 
        FROM public.resolution_votes rv 
        WHERE rv.resolution_id = r.id AND rv.vote = 'for'
    ) as actual_votes_for,
    (
        SELECT COUNT(*) 
        FROM public.resolution_votes rv 
        WHERE rv.resolution_id = r.id AND rv.vote = 'against'
    ) as actual_votes_against,
    (
        SELECT COUNT(*) 
        FROM public.resolution_votes rv 
        WHERE rv.resolution_id = r.id AND rv.vote = 'abstain'
    ) as actual_votes_abstain
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 8. Show any remaining issues
SELECT 
    'Mismatched vote counts' as issue_type,
    r.id,
    r.title,
    r.votes_for as stored_for,
    actual_counts.votes_for as actual_for,
    r.votes_against as stored_against,
    actual_counts.votes_against as actual_against,
    r.votes_abstain as stored_abstain,
    actual_counts.votes_abstain as actual_abstain
FROM public.resolutions r
JOIN (
    SELECT 
        resolution_id,
        COUNT(CASE WHEN vote = 'for' THEN 1 END) as votes_for,
        COUNT(CASE WHEN vote = 'against' THEN 1 END) as votes_against,
        COUNT(CASE WHEN vote = 'abstain' THEN 1 END) as votes_abstain
    FROM public.resolution_votes
    GROUP BY resolution_id
) actual_counts ON r.id = actual_counts.resolution_id
WHERE 
    r.votes_for != actual_counts.votes_for OR
    r.votes_against != actual_counts.votes_against OR
    r.votes_abstain != actual_counts.votes_abstain;

COMMENT ON FUNCTION update_resolution_vote_counts() IS 'Automatically updates resolution vote counts when votes are inserted, updated, or deleted';
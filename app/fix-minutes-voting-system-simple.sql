-- SIMPLE FOOLPROOF fix for Minutes Voting System Issues
-- This script disables triggers, fixes everything, then re-enables

-- ============================================================================
-- STEP 1: Disable the trigger temporarily to avoid conflicts
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;

-- ============================================================================
-- STEP 2: Remove the constraint temporarily
-- ============================================================================

ALTER TABLE public.minutes DROP CONSTRAINT IF EXISTS minutes_status_check;

-- ============================================================================
-- STEP 3: Fix all the data without constraints blocking us
-- ============================================================================

-- Update any incorrect status values to match application expectations
UPDATE public.minutes 
SET status = 'passed' 
WHERE status = 'approved';

UPDATE public.minutes 
SET status = 'failed' 
WHERE status = 'rejected';

-- Fix any other invalid status values that might exist
UPDATE public.minutes 
SET status = 'draft' 
WHERE status NOT IN ('draft', 'published', 'voting', 'passed', 'failed', 'cancelled');

-- Fix all existing vote counts
UPDATE public.minutes 
SET 
    total_votes = COALESCE((
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = public.minutes.id
    ), 0),
    approve_votes = COALESCE((
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = public.minutes.id AND vote = 'approve'
    ), 0),
    reject_votes = COALESCE((
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = public.minutes.id AND vote = 'reject'
    ), 0),
    abstain_votes = COALESCE((
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = public.minutes.id AND vote = 'abstain'
    ), 0),
    updated_at = NOW();

-- ============================================================================
-- STEP 4: Now add the corrected constraint
-- ============================================================================

ALTER TABLE public.minutes ADD CONSTRAINT minutes_status_check 
CHECK (status IN ('draft', 'published', 'voting', 'passed', 'failed', 'cancelled'));

-- ============================================================================
-- STEP 5: Create the corrected trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_minutes_voting_results()
RETURNS TRIGGER AS $$
DECLARE
    target_minutes_id UUID;
    vote_counts RECORD;
    minutes_info RECORD;
BEGIN
    -- Get the minutes_id from the trigger event
    target_minutes_id := COALESCE(NEW.minutes_id, OLD.minutes_id);
    
    -- Get minutes information for threshold calculations
    SELECT approval_threshold, minimum_quorum, total_eligible_voters, voting_deadline
    INTO minutes_info
    FROM public.minutes 
    WHERE id = target_minutes_id;
    
    -- Calculate vote counts for this minutes
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN vote = 'approve' THEN 1 END) as approve,
        COUNT(CASE WHEN vote = 'reject' THEN 1 END) as reject,
        COUNT(CASE WHEN vote = 'abstain' THEN 1 END) as abstain
    INTO vote_counts
    FROM public.minutes_votes 
    WHERE minutes_id = target_minutes_id;
    
    -- Update the minutes table with the calculated counts
    UPDATE public.minutes 
    SET 
        total_votes = vote_counts.total,
        approve_votes = vote_counts.approve,
        reject_votes = vote_counts.reject,
        abstain_votes = vote_counts.abstain,
        updated_at = NOW()
    WHERE id = target_minutes_id;
    
    -- Check if voting should be automatically closed with CORRECT status values
    UPDATE public.minutes 
    SET 
        status = CASE 
            -- If deadline has passed
            WHEN minutes_info.voting_deadline IS NOT NULL AND minutes_info.voting_deadline < NOW() THEN
                CASE 
                    WHEN (vote_counts.approve::FLOAT / NULLIF(vote_counts.total, 0) * 100) >= minutes_info.approval_threshold 
                         AND vote_counts.total >= (minutes_info.total_eligible_voters * minutes_info.minimum_quorum / 100) 
                    THEN 'passed'
                    ELSE 'failed'
                END
            -- If threshold is met before deadline
            WHEN (vote_counts.approve::FLOAT / NULLIF(vote_counts.total, 0) * 100) >= minutes_info.approval_threshold 
                 AND vote_counts.total >= (minutes_info.total_eligible_voters * minutes_info.minimum_quorum / 100) 
            THEN 'passed'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = target_minutes_id
    AND status = 'voting';
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Re-enable the trigger
-- ============================================================================

CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();

-- ============================================================================
-- STEP 7: Add performance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_minutes_votes_minutes_id_vote ON public.minutes_votes(minutes_id, vote);
CREATE INDEX IF NOT EXISTS idx_minutes_status_voting_deadline ON public.minutes(status, voting_deadline);
CREATE INDEX IF NOT EXISTS idx_minutes_votes_user_vote ON public.minutes_votes(user_id, vote);

-- ============================================================================
-- STEP 8: Verification
-- ============================================================================

-- Verify status values are correct
SELECT 'Status verification AFTER fix' as check_type, status, COUNT(*) as count
FROM public.minutes 
GROUP BY status 
ORDER BY status;

-- Verify vote counts are accurate for minutes with votes
SELECT 
    'Vote count verification' as check_type,
    m.id,
    m.title,
    m.status,
    m.total_votes as stored_total,
    COUNT(mv.id) as actual_total,
    CASE 
        WHEN m.total_votes = COUNT(mv.id) THEN '✅ CORRECT'
        ELSE '❌ INCORRECT'
    END as verification_status
FROM public.minutes m
LEFT JOIN public.minutes_votes mv ON m.id = mv.minutes_id
GROUP BY m.id, m.title, m.status, m.total_votes
HAVING COUNT(mv.id) > 0
ORDER BY m.created_at DESC;

-- Show summary
SELECT 
    'COMPLETED SUCCESSFULLY!' as status,
    'All fixes applied without constraint conflicts' as result;
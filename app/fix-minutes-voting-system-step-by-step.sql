-- STEP-BY-STEP fix for Minutes Voting System Issues
-- This script fixes data first, then updates constraints

-- ============================================================================
-- STEP 1: First, let's see what invalid status values exist
-- ============================================================================

SELECT 'Current status values in database' as info, status, COUNT(*) as count
FROM public.minutes 
GROUP BY status 
ORDER BY status;

-- ============================================================================
-- STEP 2: Fix any invalid status values BEFORE updating constraint
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

-- ============================================================================
-- STEP 3: Now we can safely update the constraint
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.minutes DROP CONSTRAINT IF EXISTS minutes_status_check;

-- Add the corrected constraint with proper status values
ALTER TABLE public.minutes ADD CONSTRAINT minutes_status_check 
CHECK (status IN ('draft', 'published', 'voting', 'passed', 'failed', 'cancelled'));

-- ============================================================================
-- STEP 4: Update the trigger function
-- ============================================================================

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;

-- Create corrected trigger function with proper status values
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
                    THEN 'passed'  -- Use 'passed' not 'approved'
                    ELSE 'failed'  -- Use 'failed' not 'rejected'
                END
            -- If threshold is met before deadline
            WHEN (vote_counts.approve::FLOAT / NULLIF(vote_counts.total, 0) * 100) >= minutes_info.approval_threshold 
                 AND vote_counts.total >= (minutes_info.total_eligible_voters * minutes_info.minimum_quorum / 100) 
            THEN 'passed'  -- Use 'passed' not 'approved'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = target_minutes_id
    AND status = 'voting';
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();

-- ============================================================================
-- STEP 5: Fix all existing vote counts
-- ============================================================================

-- Fix all existing vote counts that may be incorrect
DO $$
DECLARE
    minutes_record RECORD;
    vote_counts RECORD;
BEGIN
    RAISE NOTICE 'Starting vote count correction for all minutes...';
    
    -- Loop through all minutes that have votes
    FOR minutes_record IN 
        SELECT DISTINCT m.id, m.title, m.status
        FROM public.minutes m
        INNER JOIN public.minutes_votes mv ON m.id = mv.minutes_id
    LOOP
        -- Calculate correct vote counts
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN vote = 'approve' THEN 1 END) as approve,
            COUNT(CASE WHEN vote = 'reject' THEN 1 END) as reject,
            COUNT(CASE WHEN vote = 'abstain' THEN 1 END) as abstain
        INTO vote_counts
        FROM public.minutes_votes 
        WHERE minutes_id = minutes_record.id;
        
        -- Update the minutes table
        UPDATE public.minutes 
        SET 
            total_votes = vote_counts.total,
            approve_votes = vote_counts.approve,
            reject_votes = vote_counts.reject,
            abstain_votes = vote_counts.abstain,
            updated_at = NOW()
        WHERE id = minutes_record.id;
        
        RAISE NOTICE 'Fixed vote counts for "%" (status: %): total=%, approve=%, reject=%, abstain=%', 
            minutes_record.title, minutes_record.status, vote_counts.total, vote_counts.approve, vote_counts.reject, vote_counts.abstain;
    END LOOP;
    
    RAISE NOTICE 'Vote count correction completed.';
END $$;

-- ============================================================================
-- STEP 6: Add performance indexes
-- ============================================================================

-- Add indexes that might be missing for better performance
CREATE INDEX IF NOT EXISTS idx_minutes_votes_minutes_id_vote ON public.minutes_votes(minutes_id, vote);
CREATE INDEX IF NOT EXISTS idx_minutes_status_voting_deadline ON public.minutes(status, voting_deadline);
CREATE INDEX IF NOT EXISTS idx_minutes_votes_user_vote ON public.minutes_votes(user_id, vote);

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

-- Verify status values are correct
SELECT 'Status verification AFTER fix' as check_type, status, COUNT(*) as count
FROM public.minutes 
GROUP BY status 
ORDER BY status;

-- Show summary
SELECT 
    'COMPLETED SUCCESSFULLY!' as status,
    'All fixes applied' as result;
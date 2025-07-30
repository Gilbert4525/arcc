-- FINAL CORRECTED fix for Minutes Voting System Issues
-- This script addresses database schema inconsistencies and voting logic problems

-- ============================================================================
-- FIX #0: Update Database Constraint to Allow Correct Status Values
-- ============================================================================

-- First, we need to update the check constraint to allow 'passed' and 'failed'
ALTER TABLE public.minutes DROP CONSTRAINT IF EXISTS minutes_status_check;

-- Add the corrected constraint with proper status values
ALTER TABLE public.minutes ADD CONSTRAINT minutes_status_check 
CHECK (status IN ('draft', 'published', 'voting', 'passed', 'failed', 'cancelled'));

-- ============================================================================
-- FIX #1: Database Schema Status Inconsistency
-- ============================================================================

-- Now we can safely update any incorrect status values
UPDATE public.minutes 
SET status = 'passed' 
WHERE status = 'approved';

UPDATE public.minutes 
SET status = 'failed' 
WHERE status = 'rejected';

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
-- FIX #2: Correct Vote Counts for Existing Data
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
-- FIX #3: Add Missing Indexes for Performance
-- ============================================================================

-- Add indexes that might be missing for better performance
CREATE INDEX IF NOT EXISTS idx_minutes_votes_minutes_id_vote ON public.minutes_votes(minutes_id, vote);
CREATE INDEX IF NOT EXISTS idx_minutes_status_voting_deadline ON public.minutes(status, voting_deadline);
CREATE INDEX IF NOT EXISTS idx_minutes_votes_user_vote ON public.minutes_votes(user_id, vote);

-- ============================================================================
-- VERIFICATION: Check that everything is working correctly
-- ============================================================================

-- Verify status values are correct
SELECT 'Status verification' as check_type, status, COUNT(*) as count
FROM public.minutes 
GROUP BY status 
ORDER BY status;

-- Verify vote counts are accurate
SELECT 
    'Vote count verification' as check_type,
    m.id,
    m.title,
    m.status,
    m.total_votes as stored_total,
    COUNT(mv.id) as actual_total,
    m.approve_votes as stored_approve,
    COUNT(CASE WHEN mv.vote = 'approve' THEN 1 END) as actual_approve,
    m.reject_votes as stored_reject,
    COUNT(CASE WHEN mv.vote = 'reject' THEN 1 END) as actual_reject,
    m.abstain_votes as stored_abstain,
    COUNT(CASE WHEN mv.vote = 'abstain' THEN 1 END) as actual_abstain,
    CASE 
        WHEN m.total_votes = COUNT(mv.id) AND 
             m.approve_votes = COUNT(CASE WHEN mv.vote = 'approve' THEN 1 END) AND
             m.reject_votes = COUNT(CASE WHEN mv.vote = 'reject' THEN 1 END) AND
             m.abstain_votes = COUNT(CASE WHEN mv.vote = 'abstain' THEN 1 END)
        THEN '✅ CORRECT'
        ELSE '❌ INCORRECT'
    END as verification_status
FROM public.minutes m
LEFT JOIN public.minutes_votes mv ON m.id = mv.minutes_id
WHERE EXISTS (SELECT 1 FROM public.minutes_votes WHERE minutes_id = m.id)
GROUP BY m.id, m.title, m.status, m.total_votes, m.approve_votes, m.reject_votes, m.abstain_votes
ORDER BY m.created_at DESC;

-- Show summary
SELECT 
    'Summary' as info,
    'Database constraint updated to allow passed/failed' as fix_0,
    'Database schema status inconsistency fixed' as fix_1,
    'Vote count calculations corrected' as fix_2,
    'Performance indexes added' as fix_3,
    'All existing data corrected' as fix_4;
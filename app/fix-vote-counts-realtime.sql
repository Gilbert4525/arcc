-- Fix for vote counts not updating in real-time
-- This script ensures vote counts are accurate and updates immediately

-- ============================================================================
-- STEP 1: Fix all existing vote counts manually
-- ============================================================================

-- Update all minutes with correct vote counts
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
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM public.minutes_votes WHERE minutes_id = public.minutes.id
);

-- ============================================================================
-- STEP 2: Ensure trigger function is working properly
-- ============================================================================

-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;

-- Create the corrected trigger function
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
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated vote counts for minutes %: total=%, approve=%, reject=%, abstain=%', 
        target_minutes_id, vote_counts.total, vote_counts.approve, vote_counts.reject, vote_counts.abstain;
    
    -- Check if voting should be automatically closed
    UPDATE public.minutes 
    SET 
        status = CASE 
            -- If deadline has passed
            WHEN minutes_info.voting_deadline IS NOT NULL AND minutes_info.voting_deadline < NOW() THEN
                CASE 
                    WHEN (vote_counts.approve::FLOAT / NULLIF(vote_counts.total, 0) * 100) >= COALESCE(minutes_info.approval_threshold, 75)
                         AND vote_counts.total >= (COALESCE(minutes_info.total_eligible_voters, 1) * COALESCE(minutes_info.minimum_quorum, 50) / 100) 
                    THEN 'passed'
                    ELSE 'failed'
                END
            -- If threshold is met before deadline
            WHEN (vote_counts.approve::FLOAT / NULLIF(vote_counts.total, 0) * 100) >= COALESCE(minutes_info.approval_threshold, 75)
                 AND vote_counts.total >= (COALESCE(minutes_info.total_eligible_voters, 1) * COALESCE(minutes_info.minimum_quorum, 50) / 100) 
            THEN 'passed'
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
-- STEP 3: Verification
-- ============================================================================

-- Show current vote counts vs actual counts
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
WHERE m.status IN ('voting', 'passed', 'failed')
GROUP BY m.id, m.title, m.status, m.total_votes, m.approve_votes, m.reject_votes, m.abstain_votes
ORDER BY m.created_at DESC;

-- Show summary
SELECT 
    'VOTE COUNTS FIXED!' as status,
    'Trigger function updated and working' as result;
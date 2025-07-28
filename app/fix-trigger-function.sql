-- Fix the trigger function that updates vote counts
-- This is the root cause of the voting issues

-- First, let's drop the existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;

-- Create the corrected trigger function
CREATE OR REPLACE FUNCTION update_minutes_voting_results()
RETURNS TRIGGER AS $$
DECLARE
    target_minutes_id UUID;
    vote_counts RECORD;
BEGIN
    -- Get the minutes_id from the trigger event
    target_minutes_id := COALESCE(NEW.minutes_id, OLD.minutes_id);
    
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
            WHEN voting_deadline IS NOT NULL AND voting_deadline < NOW() THEN
                CASE 
                    WHEN (vote_counts.approve::FLOAT / NULLIF(vote_counts.total, 0) * 100) >= approval_threshold 
                         AND vote_counts.total >= (total_eligible_voters * minimum_quorum / 100) 
                    THEN 'passed'
                    ELSE 'failed'
                END
            WHEN (vote_counts.approve::FLOAT / NULLIF(vote_counts.total, 0) * 100) >= approval_threshold 
                 AND vote_counts.total >= (total_eligible_voters * minimum_quorum / 100) 
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

-- Now let's fix the existing data by manually running the trigger logic
-- This will correct all the vote counts that are currently wrong

DO $$
DECLARE
    minutes_record RECORD;
    vote_counts RECORD;
BEGIN
    -- Loop through all minutes that have votes
    FOR minutes_record IN 
        SELECT DISTINCT m.id, m.title
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
        
        RAISE NOTICE 'Fixed vote counts for minutes "%" (%): total=%, approve=%, reject=%, abstain=%', 
            minutes_record.title, minutes_record.id, vote_counts.total, vote_counts.approve, vote_counts.reject, vote_counts.abstain;
    END LOOP;
END $$;

-- Verify the fix worked by showing the corrected counts
SELECT 
    'After fix - Vote count verification' as check_type,
    m.id as minutes_id,
    m.title,
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
        THEN 'FIXED ✅'
        ELSE 'STILL BROKEN ❌'
    END as status
FROM public.minutes m
LEFT JOIN public.minutes_votes mv ON m.id = mv.minutes_id
WHERE m.status = 'voting'
GROUP BY m.id, m.title, m.total_votes, m.approve_votes, m.reject_votes, m.abstain_votes
ORDER BY m.created_at DESC;
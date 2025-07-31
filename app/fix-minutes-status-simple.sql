-- Simple Fix for Minutes Status Values
-- Run these commands one by one in your Supabase SQL editor

-- Step 1: Update existing records with old status values
UPDATE public.minutes SET status = 'passed' WHERE status = 'approved';
UPDATE public.minutes SET status = 'failed' WHERE status = 'rejected';

-- Step 2: Drop the existing CHECK constraint
ALTER TABLE public.minutes DROP CONSTRAINT IF EXISTS minutes_status_check;

-- Step 3: Add the new CHECK constraint with correct status values
ALTER TABLE public.minutes ADD CONSTRAINT minutes_status_check CHECK (status IN ('draft', 'published', 'voting', 'passed', 'failed', 'cancelled'));

-- Step 4: Update the trigger function (copy and paste this entire block)
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

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;
CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();
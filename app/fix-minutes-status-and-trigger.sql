-- Fix Minutes Status Values and Database Trigger
-- This script fixes the mismatch between frontend status values ('passed'/'failed') 
-- and database status values ('approved'/'rejected')

-- Step 1: Update existing records with old status values
UPDATE public.minutes 
SET status = 'passed' 
WHERE status = 'approved';

UPDATE public.minutes 
SET status = 'failed' 
WHERE status = 'rejected';

-- Step 2: Drop the existing CHECK constraint
ALTER TABLE public.minutes 
DROP CONSTRAINT IF EXISTS minutes_status_check;

-- Step 3: Add the new CHECK constraint with correct status values
ALTER TABLE public.minutes 
ADD CONSTRAINT minutes_status_check 
CHECK (status IN ('draft', 'published', 'voting', 'passed', 'failed', 'cancelled'));

-- Step 4: Update the trigger function to use correct status values
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

-- Step 5: Verify the trigger is still attached (it should be, but let's make sure)
DROP TRIGGER IF EXISTS trigger_update_minutes_voting_results ON public.minutes_votes;
CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();

-- Step 6: Test the trigger by updating vote counts for all existing minutes
-- This will ensure all vote counts are accurate
DO $$
DECLARE
    minutes_record RECORD;
BEGIN
    FOR minutes_record IN SELECT id FROM public.minutes LOOP
        -- Trigger the vote count update for each minutes record
        UPDATE public.minutes 
        SET updated_at = NOW() 
        WHERE id = minutes_record.id;
    END LOOP;
END $$;

-- Verification queries (run these to check the results)
-- SELECT id, title, status, total_votes, approve_votes, reject_votes, abstain_votes FROM public.minutes;
-- SELECT * FROM public.minutes_votes ORDER BY created_at DESC LIMIT 10;
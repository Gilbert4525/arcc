# Immediate Vote Count Fix

## Issue
The voting progress is not showing in the resolution list even though votes are being recorded. This is because the vote counts in the `resolutions` table are not being updated when votes are cast.

## Quick Fix

Run this SQL command in your Supabase SQL editor to immediately fix the vote counts:

```sql
-- Update all resolution vote counts to match actual votes
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
```

## Verify the Fix

After running the above command, run this to verify it worked:

```sql
-- Check if vote counts are now correct
SELECT 
    r.id,
    r.title,
    r.status,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id) as total_actual_votes
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;
```

## Set Up Automatic Updates

To prevent this from happening again, run this to create database triggers:

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION update_resolution_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.resolutions 
    SET 
        votes_for = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'for'),
        votes_against = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'against'),
        votes_abstain = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'abstain'),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.resolution_id, OLD.resolution_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
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
```

## Expected Result

After running these commands:
1. The voting progress should immediately show in the resolution list
2. Future votes will automatically update the counts
3. The admin can see real-time voting progress

## If the Issue Persists

If the vote counts still don't show after running the SQL commands:

1. Check the browser console for any JavaScript errors
2. Refresh the page to reload the data
3. Check if the API is returning the updated vote counts by looking at the network tab in browser dev tools
4. Run the debug script: `debug-resolution-voting.sql` to identify any remaining issues
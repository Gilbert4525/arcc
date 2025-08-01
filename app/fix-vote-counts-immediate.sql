-- IMMEDIATE FIX: Manually update vote counts for all minutes
-- This will fix the vote count display issue immediately

-- Step 1: Manually recalculate and update vote counts for all minutes
UPDATE public.minutes 
SET 
    total_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id
    ),
    approve_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id AND vote = 'approve'
    ),
    reject_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id AND vote = 'reject'
    ),
    abstain_votes = (
        SELECT COUNT(*) 
        FROM public.minutes_votes 
        WHERE minutes_id = minutes.id AND vote = 'abstain'
    ),
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT minutes_id FROM public.minutes_votes
);

-- Step 2: Verify the results
SELECT 
    id,
    title,
    status,
    total_votes,
    approve_votes,
    reject_votes,
    abstain_votes,
    (SELECT COUNT(*) FROM public.minutes_votes WHERE minutes_id = minutes.id) as actual_total_votes
FROM public.minutes 
WHERE status = 'voting'
ORDER BY created_at DESC;

-- Step 3: Check if trigger function exists and works
-- Test the trigger by inserting a dummy vote (we'll delete it immediately)
-- DO NOT RUN THIS PART IF YOU'RE NOT SURE - IT'S JUST FOR TESTING
/*
INSERT INTO public.minutes_votes (minutes_id, user_id, vote) 
VALUES (
    (SELECT id FROM public.minutes WHERE status = 'voting' LIMIT 1),
    (SELECT id FROM public.profiles LIMIT 1),
    'approve'
);

-- Check if counts updated
SELECT id, title, total_votes, approve_votes FROM public.minutes WHERE status = 'voting' LIMIT 1;

-- Delete the test vote
DELETE FROM public.minutes_votes 
WHERE minutes_id = (SELECT id FROM public.minutes WHERE status = 'voting' LIMIT 1)
AND vote = 'approve' 
AND created_at > NOW() - INTERVAL '1 minute';
*/
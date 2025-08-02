-- IMMEDIATE Vote Count Fix
-- Run this right now to fix the vote counting issue

-- Step 1: Recalculate vote counts for all resolutions
UPDATE public.resolutions 
SET 
    votes_for = (
        SELECT COUNT(*) 
        FROM public.resolution_votes 
        WHERE resolution_id = resolutions.id AND vote = 'for'
    ),
    votes_against = (
        SELECT COUNT(*) 
        FROM public.resolution_votes 
        WHERE resolution_id = resolutions.id AND vote = 'against'
    ),
    votes_abstain = (
        SELECT COUNT(*) 
        FROM public.resolution_votes 
        WHERE resolution_id = resolutions.id AND vote = 'abstain'
    ),
    updated_at = NOW()
WHERE status IN ('voting', 'approved', 'rejected');

-- Step 2: Verify the fix worked
SELECT 
    r.title,
    r.resolution_number,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as total_votes
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;
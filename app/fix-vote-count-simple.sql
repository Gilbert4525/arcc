-- Simple Vote Count Fix
-- This script fixes the vote counting issue with basic SQL commands

-- 1. Check current state
SELECT 
    'BEFORE FIX' as status,
    r.id,
    r.title,
    r.resolution_number,
    r.votes_for as stored_for,
    r.votes_against as stored_against,
    r.votes_abstain as stored_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as stored_total
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 2. Show actual votes in database
SELECT 
    rv.resolution_id,
    r.title,
    COUNT(*) as actual_total,
    COUNT(CASE WHEN rv.vote = 'for' THEN 1 END) as actual_for,
    COUNT(CASE WHEN rv.vote = 'against' THEN 1 END) as actual_against,
    COUNT(CASE WHEN rv.vote = 'abstain' THEN 1 END) as actual_abstain
FROM public.resolution_votes rv
JOIN public.resolutions r ON rv.resolution_id = r.id
WHERE r.status IN ('voting', 'approved', 'rejected')
GROUP BY rv.resolution_id, r.title
ORDER BY r.created_at DESC;

-- 3. Remove duplicate votes (keep the latest one)
DELETE FROM public.resolution_votes 
WHERE id NOT IN (
    SELECT DISTINCT ON (resolution_id, voter_id) id
    FROM public.resolution_votes
    ORDER BY resolution_id, voter_id, voted_at DESC, created_at DESC
);

-- 4. Recalculate ALL vote counts
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

-- 5. Verify the fix
SELECT 
    'AFTER FIX' as status,
    r.id,
    r.title,
    r.resolution_number,
    r.votes_for as stored_for,
    r.votes_against as stored_against,
    r.votes_abstain as stored_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as stored_total,
    COALESCE(vote_counts.actual_total, 0) as actual_total,
    CASE 
        WHEN (r.votes_for + r.votes_against + r.votes_abstain) = COALESCE(vote_counts.actual_total, 0)
        THEN '✅ FIXED'
        ELSE '❌ STILL BROKEN'
    END as fix_status
FROM public.resolutions r
LEFT JOIN (
    SELECT 
        resolution_id,
        COUNT(*) as actual_total
    FROM public.resolution_votes
    GROUP BY resolution_id
) vote_counts ON r.id = vote_counts.resolution_id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 6. Show individual votes for verification
SELECT 
    rv.resolution_id,
    r.title,
    r.resolution_number,
    p.full_name as voter_name,
    rv.vote,
    rv.voted_at
FROM public.resolution_votes rv
JOIN public.resolutions r ON rv.resolution_id = r.id
LEFT JOIN public.profiles p ON rv.voter_id = p.id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC, rv.voted_at DESC;
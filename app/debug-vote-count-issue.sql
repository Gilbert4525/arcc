-- Debug Vote Count Issue
-- This script will help diagnose why vote counts are showing incorrectly

-- 1. Check current resolutions and their vote counts
SELECT 
    r.id,
    r.title,
    r.resolution_number,
    r.status,
    r.votes_for as stored_votes_for,
    r.votes_against as stored_votes_against,
    r.votes_abstain as stored_votes_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as stored_total,
    r.created_at,
    r.updated_at
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 2. Check actual votes in the resolution_votes table
SELECT 
    rv.resolution_id,
    r.title,
    r.resolution_number,
    COUNT(*) as total_actual_votes,
    COUNT(CASE WHEN rv.vote = 'for' THEN 1 END) as actual_votes_for,
    COUNT(CASE WHEN rv.vote = 'against' THEN 1 END) as actual_votes_against,
    COUNT(CASE WHEN rv.vote = 'abstain' THEN 1 END) as actual_votes_abstain
FROM public.resolution_votes rv
JOIN public.resolutions r ON rv.resolution_id = r.id
WHERE r.status IN ('voting', 'approved', 'rejected')
GROUP BY rv.resolution_id, r.title, r.resolution_number
ORDER BY r.created_at DESC;

-- 3. Compare stored vs actual vote counts
SELECT 
    r.id,
    r.title,
    r.resolution_number,
    r.status,
    r.votes_for as stored_for,
    COALESCE(actual_counts.votes_for, 0) as actual_for,
    r.votes_against as stored_against,
    COALESCE(actual_counts.votes_against, 0) as actual_against,
    r.votes_abstain as stored_abstain,
    COALESCE(actual_counts.votes_abstain, 0) as actual_abstain,
    (r.votes_for + r.votes_against + r.votes_abstain) as stored_total,
    COALESCE(actual_counts.total_votes, 0) as actual_total,
    CASE 
        WHEN r.votes_for != COALESCE(actual_counts.votes_for, 0) OR
             r.votes_against != COALESCE(actual_counts.votes_against, 0) OR
             r.votes_abstain != COALESCE(actual_counts.votes_abstain, 0)
        THEN 'MISMATCH'
        ELSE 'OK'
    END as status_check
FROM public.resolutions r
LEFT JOIN (
    SELECT 
        resolution_id,
        COUNT(*) as total_votes,
        COUNT(CASE WHEN vote = 'for' THEN 1 END) as votes_for,
        COUNT(CASE WHEN vote = 'against' THEN 1 END) as votes_against,
        COUNT(CASE WHEN vote = 'abstain' THEN 1 END) as votes_abstain
    FROM public.resolution_votes
    GROUP BY resolution_id
) actual_counts ON r.id = actual_counts.resolution_id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 4. Show individual votes for debugging
SELECT 
    rv.id as vote_id,
    rv.resolution_id,
    r.title,
    r.resolution_number,
    rv.voter_id,
    p.full_name as voter_name,
    p.email as voter_email,
    rv.vote,
    rv.vote_reason,
    rv.voted_at,
    rv.created_at,
    rv.updated_at
FROM public.resolution_votes rv
JOIN public.resolutions r ON rv.resolution_id = r.id
LEFT JOIN public.profiles p ON rv.voter_id = p.id
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC, rv.voted_at DESC;

-- 5. Check for duplicate votes (should be none due to unique constraint)
SELECT 
    resolution_id,
    voter_id,
    COUNT(*) as vote_count,
    STRING_AGG(vote, ', ') as votes,
    STRING_AGG(voted_at::text, ', ') as vote_times
FROM public.resolution_votes 
GROUP BY resolution_id, voter_id 
HAVING COUNT(*) > 1;

-- 6. Check if triggers exist and are working
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'resolution_votes'
ORDER BY trigger_name;

-- 7. Check the trigger function
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_resolution_vote_counts';

-- 8. Show recent activity (last 24 hours)
SELECT 
    'resolution_votes' as table_name,
    rv.id,
    rv.resolution_id,
    r.title,
    rv.vote,
    rv.voted_at,
    rv.created_at,
    rv.updated_at
FROM public.resolution_votes rv
JOIN public.resolutions r ON rv.resolution_id = r.id
WHERE rv.created_at > NOW() - INTERVAL '24 hours'
   OR rv.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY GREATEST(rv.created_at, rv.updated_at) DESC;
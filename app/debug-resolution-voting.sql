-- Debug Resolution Voting Issues
-- This script helps identify why vote counts aren't showing

-- 1. Check current resolutions and their vote counts
SELECT 
    r.id,
    r.title,
    r.resolution_number,
    r.status,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    r.total_eligible_voters,
    r.created_at,
    r.updated_at
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 2. Check actual votes in the resolution_votes table
SELECT 
    rv.id,
    rv.resolution_id,
    rv.voter_id,
    rv.vote,
    rv.vote_reason,
    rv.voted_at,
    r.title as resolution_title,
    p.full_name as voter_name
FROM public.resolution_votes rv
JOIN public.resolutions r ON r.id = rv.resolution_id
LEFT JOIN public.profiles p ON p.id = rv.voter_id
ORDER BY rv.voted_at DESC;

-- 3. Compare stored counts vs actual counts
SELECT 
    r.id,
    r.title,
    r.status,
    r.votes_for as stored_for,
    r.votes_against as stored_against,
    r.votes_abstain as stored_abstain,
    (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id AND rv.vote = 'for') as actual_for,
    (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id AND rv.vote = 'against') as actual_against,
    (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id AND rv.vote = 'abstain') as actual_abstain,
    CASE 
        WHEN r.votes_for != (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id AND rv.vote = 'for') THEN 'MISMATCH'
        WHEN r.votes_against != (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id AND rv.vote = 'against') THEN 'MISMATCH'
        WHEN r.votes_abstain != (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id AND rv.vote = 'abstain') THEN 'MISMATCH'
        ELSE 'OK'
    END as status_check
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
ORDER BY r.created_at DESC;

-- 4. Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'resolution_votes'
ORDER BY trigger_name;

-- 5. Check if the trigger function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_resolution_vote_counts';

-- 6. Test the trigger function manually (if it exists)
-- This will show if the function works when called directly
DO $$
DECLARE
    test_resolution_id UUID;
BEGIN
    -- Get a resolution that has votes
    SELECT r.id INTO test_resolution_id
    FROM public.resolutions r
    WHERE EXISTS (SELECT 1 FROM public.resolution_votes rv WHERE rv.resolution_id = r.id)
    LIMIT 1;
    
    IF test_resolution_id IS NOT NULL THEN
        RAISE NOTICE 'Testing trigger function for resolution: %', test_resolution_id;
        
        -- Manually update vote counts for this resolution
        UPDATE public.resolutions 
        SET 
            votes_for = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = test_resolution_id AND vote = 'for'),
            votes_against = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = test_resolution_id AND vote = 'against'),
            votes_abstain = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = test_resolution_id AND vote = 'abstain'),
            updated_at = NOW()
        WHERE id = test_resolution_id;
        
        RAISE NOTICE 'Manual update completed for resolution: %', test_resolution_id;
    ELSE
        RAISE NOTICE 'No resolutions with votes found for testing';
    END IF;
END $$;

-- 7. Show final state after manual update
SELECT 
    r.id,
    r.title,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    (SELECT COUNT(*) FROM public.resolution_votes rv WHERE rv.resolution_id = r.id) as total_votes
FROM public.resolutions r
WHERE r.status IN ('voting', 'approved', 'rejected')
AND EXISTS (SELECT 1 FROM public.resolution_votes rv WHERE rv.resolution_id = r.id)
ORDER BY r.updated_at DESC;
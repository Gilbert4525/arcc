-- COMPREHENSIVE VOTING EMAIL DEBUG ANALYSIS
-- This script will show us exactly what's happening with voting completion detection

-- 1. Check current resolutions and their voting status
SELECT 
    r.id,
    r.title,
    r.status,
    r.voting_deadline,
    r.created_at,
    -- Count total votes
    (SELECT COUNT(*) FROM resolution_votes rv WHERE rv.resolution_id = r.id) as total_votes,
    -- Count eligible voters (board members)
    (SELECT COUNT(*) FROM profiles p WHERE p.role = 'board_member') as eligible_voters,
    -- Check if voting is complete
    CASE 
        WHEN (SELECT COUNT(*) FROM resolution_votes rv WHERE rv.resolution_id = r.id) >= 
             (SELECT COUNT(*) FROM profiles p WHERE p.role = 'board_member')
        THEN 'COMPLETE - All voted'
        WHEN r.voting_deadline IS NOT NULL AND r.voting_deadline < NOW()
        THEN 'COMPLETE - Deadline passed'
        ELSE 'IN PROGRESS'
    END as voting_status
FROM resolutions r
WHERE r.status = 'published'
ORDER BY r.created_at DESC;

-- 2. Check if we have any database triggers currently active
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('resolution_votes', 'resolutions')
ORDER BY event_object_table, trigger_name;

-- 3. Check recent voting activity
SELECT 
    rv.resolution_id,
    r.title,
    rv.voter_id,
    p.full_name,
    rv.vote,
    rv.created_at,
    rv.updated_at
FROM resolution_votes rv
JOIN resolutions r ON r.id = rv.resolution_id
JOIN profiles p ON p.id = rv.voter_id
ORDER BY rv.updated_at DESC
LIMIT 10;

-- 4. Check if voting summary emails table exists and has data
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'voting_summary_emails'
ORDER BY ordinal_position;

-- 5. If voting_summary_emails exists, check recent entries
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voting_summary_emails') THEN
        RAISE NOTICE 'Voting summary emails table exists - checking recent entries:';
        PERFORM * FROM voting_summary_emails ORDER BY created_at DESC LIMIT 5;
    ELSE
        RAISE NOTICE 'Voting summary emails table does NOT exist!';
    END IF;
END $$;

-- 6. Check profiles and their roles
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM profiles
ORDER BY role, full_name;

-- 7. Test the completion detection logic for a specific resolution
-- Replace 'RESOLUTION_ID_HERE' with actual resolution ID
DO $$
DECLARE
    test_resolution_id UUID;
    total_votes INTEGER;
    eligible_voters INTEGER;
    is_complete BOOLEAN;
BEGIN
    -- Get the most recent published resolution
    SELECT id INTO test_resolution_id 
    FROM resolutions 
    WHERE status = 'published' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_resolution_id IS NOT NULL THEN
        -- Count votes for this resolution
        SELECT COUNT(*) INTO total_votes
        FROM resolution_votes 
        WHERE resolution_id = test_resolution_id;
        
        -- Count eligible voters
        SELECT COUNT(*) INTO eligible_voters
        FROM profiles 
        WHERE role = 'board_member';
        
        -- Check if complete
        is_complete := (total_votes >= eligible_voters);
        
        RAISE NOTICE 'RESOLUTION TEST: ID=%, Votes=%, Eligible=%, Complete=%', 
            test_resolution_id, total_votes, eligible_voters, is_complete;
    ELSE
        RAISE NOTICE 'No published resolutions found for testing';
    END IF;
END $$;
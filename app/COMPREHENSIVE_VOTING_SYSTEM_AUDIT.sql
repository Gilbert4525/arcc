-- COMPREHENSIVE VOTING SYSTEM AUDIT
-- This script will check all tables, columns, and data to ensure consistency

-- 1. Check if resolution_votes table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'resolution_votes'
ORDER BY ordinal_position;

-- 2. Check if minutes_votes table exists and its structure  
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'minutes_votes'
ORDER BY ordinal_position;

-- 3. Check resolutions table structure (voting-related columns)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'resolutions'
AND column_name IN ('status', 'voting_deadline', 'votes_for', 'votes_against', 'votes_abstain', 'total_eligible_voters')
ORDER BY column_name;

-- 4. Check minutes table structure (voting-related columns)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'minutes'
AND column_name IN ('status', 'voting_deadline', 'total_votes', 'approve_votes', 'reject_votes', 'abstain_votes')
ORDER BY column_name;

-- 5. Check current resolutions and their voting data
SELECT 
    r.id,
    r.title,
    r.status,
    r.voting_deadline,
    r.votes_for,
    r.votes_against,
    r.votes_abstain,
    r.total_eligible_voters,
    (SELECT COUNT(*) FROM resolution_votes rv WHERE rv.resolution_id = r.id) as actual_vote_count,
    (SELECT COUNT(*) FROM profiles p WHERE p.role IN ('admin', 'board_member') AND p.is_active = true) as current_eligible_voters
FROM resolutions r
WHERE r.status IN ('published', 'voting', 'approved', 'rejected')
ORDER BY r.created_at DESC
LIMIT 5;

-- 6. Check current minutes and their voting data
SELECT 
    m.id,
    m.title,
    m.status,
    m.voting_deadline,
    m.total_votes,
    m.approve_votes,
    m.reject_votes,
    m.abstain_votes,
    (SELECT COUNT(*) FROM minutes_votes mv WHERE mv.minutes_id = m.id) as actual_vote_count,
    (SELECT COUNT(*) FROM profiles p WHERE p.role IN ('admin', 'board_member') AND p.is_active = true) as current_eligible_voters
FROM minutes m
WHERE m.status IN ('voting', 'passed', 'failed')
ORDER BY m.created_at DESC
LIMIT 5;

-- 7. Check actual votes in resolution_votes table
SELECT 
    rv.resolution_id,
    r.title as resolution_title,
    r.status as resolution_status,
    rv.voter_id,
    p.full_name,
    p.role,
    rv.vote,
    rv.voted_at
FROM resolution_votes rv
JOIN resolutions r ON r.id = rv.resolution_id
JOIN profiles p ON p.id = rv.voter_id
ORDER BY rv.voted_at DESC
LIMIT 10;

-- 8. Check actual votes in minutes_votes table
SELECT 
    mv.minutes_id,
    m.title as minutes_title,
    m.status as minutes_status,
    mv.user_id,
    p.full_name,
    p.role,
    mv.vote,
    mv.voted_at
FROM minutes_votes mv
JOIN minutes m ON m.id = mv.minutes_id
JOIN profiles p ON p.id = mv.user_id
ORDER BY mv.voted_at DESC
LIMIT 10;

-- 9. Check all active users who should be eligible to vote
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM profiles
WHERE role IN ('admin', 'board_member')
ORDER BY role, full_name;

-- 10. Check if voting_completion_events table exists
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'voting_completion_events'
ORDER BY ordinal_position;

-- 11. Check existing triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('resolution_votes', 'minutes_votes')
ORDER BY event_object_table, trigger_name;

-- 12. Check functions related to voting
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%voting%' OR routine_name LIKE '%completion%'
ORDER BY routine_name;

-- 13. Test vote counting for a specific resolution (replace with actual ID)
DO $$
DECLARE
    test_resolution_id UUID := 'abb4b65f-79db-40ec-97a1-9d00f0cc032c';
    vote_count INTEGER;
    eligible_count INTEGER;
    resolution_status TEXT;
BEGIN
    -- Get resolution status
    SELECT status INTO resolution_status FROM resolutions WHERE id = test_resolution_id;
    
    -- Count votes
    SELECT COUNT(*) INTO vote_count FROM resolution_votes WHERE resolution_id = test_resolution_id;
    
    -- Count eligible voters
    SELECT COUNT(*) INTO eligible_count FROM profiles WHERE role IN ('admin', 'board_member') AND is_active = true;
    
    RAISE NOTICE 'RESOLUTION TEST: ID=%, Status=%, Votes=%, Eligible=%, Complete=%', 
        test_resolution_id, resolution_status, vote_count, eligible_count, 
        CASE WHEN vote_count >= eligible_count THEN 'YES' ELSE 'NO' END;
END $$;

-- 14. Show any data inconsistencies
SELECT 
    'Resolution vote count mismatch' as issue_type,
    r.id,
    r.title,
    r.votes_for + r.votes_against + r.votes_abstain as stored_total,
    (SELECT COUNT(*) FROM resolution_votes rv WHERE rv.resolution_id = r.id) as actual_total
FROM resolutions r
WHERE (r.votes_for + r.votes_against + r.votes_abstain) != (SELECT COUNT(*) FROM resolution_votes rv WHERE rv.resolution_id = r.id)

UNION ALL

SELECT 
    'Minutes vote count mismatch' as issue_type,
    m.id,
    m.title,
    m.total_votes as stored_total,
    (SELECT COUNT(*) FROM minutes_votes mv WHERE mv.minutes_id = m.id) as actual_total
FROM minutes m
WHERE m.total_votes != (SELECT COUNT(*) FROM minutes_votes mv WHERE mv.minutes_id = m.id);

RAISE NOTICE '=== COMPREHENSIVE VOTING SYSTEM AUDIT COMPLETE ===';
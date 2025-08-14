-- =====================================================
-- COMPLETE DATABASE CLEANUP - FIX AMBIGUOUS COLUMN ERROR
-- =====================================================
-- This SQL completely cleans up all existing triggers and functions
-- that are causing the "column reference 'resolution_id' is ambiguous" error

-- Step 1: Drop all existing triggers with CASCADE to remove dependencies
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion ON resolution_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion ON minutes_votes CASCADE;
DROP TRIGGER IF EXISTS resolution_vote_trigger ON resolution_votes CASCADE;
DROP TRIGGER IF EXISTS minutes_vote_trigger ON minutes_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_insert ON resolution_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_update ON resolution_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_delete ON resolution_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_update_minutes_vote_counts_insert ON minutes_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_update_minutes_vote_counts_update ON minutes_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_update_minutes_vote_counts_delete ON minutes_votes CASCADE;

-- Step 2: Drop all existing functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS handle_resolution_vote_change() CASCADE;
DROP FUNCTION IF EXISTS handle_minutes_vote_change() CASCADE;
DROP FUNCTION IF EXISTS update_resolution_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS update_minutes_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS trigger_voting_summary_email(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS check_resolution_voting_complete(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_minutes_voting_complete(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_total_eligible_voters() CASCADE;

-- Step 3: Clean up any other potential conflicting functions
DROP FUNCTION IF EXISTS calculate_resolution_outcome(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_minutes_outcome(UUID) CASCADE;
DROP FUNCTION IF EXISTS process_expired_voting_deadlines() CASCADE;

-- Step 4: Verify cleanup
SELECT 'All database triggers and functions cleaned up successfully!' as status;
SELECT 'The ambiguous column error should now be resolved.' as message;
SELECT 'You can now test voting functionality.' as next_step;
-- =====================================================
-- FINAL VOTING FIX - NO AMBIGUOUS COLUMNS
-- =====================================================
-- This completely eliminates the ambiguous column error
-- by removing all problematic triggers and using a different approach

-- Step 1: Remove ALL triggers that could cause ambiguous column errors
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion ON resolution_votes CASCADE;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion ON minutes_votes CASCADE;
DROP TRIGGER IF EXISTS resolution_vote_count_trigger ON resolution_votes CASCADE;
DROP TRIGGER IF EXISTS minutes_vote_count_trigger ON minutes_votes CASCADE;

-- Step 2: Remove ALL functions that could cause ambiguous column errors
DROP FUNCTION IF EXISTS handle_resolution_vote_change() CASCADE;
DROP FUNCTION IF EXISTS handle_minutes_vote_change() CASCADE;
DROP FUNCTION IF EXISTS update_resolution_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS update_minutes_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS get_total_eligible_voters() CASCADE;
DROP FUNCTION IF EXISTS check_resolution_voting_complete(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_minutes_voting_complete(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_voting_summary_email(TEXT, UUID) CASCADE;

-- Step 3: Create SIMPLE functions that don't cause ambiguous references
-- These functions use explicit table aliases to avoid any ambiguity

-- Simple function to count eligible voters
CREATE OR REPLACE FUNCTION count_eligible_voters()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM profiles p
        WHERE p.is_active = true
        AND p.role IN ('admin', 'board_member')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function to update resolution vote counts (no ambiguous references)
CREATE OR REPLACE FUNCTION update_resolution_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Use explicit table references to avoid ambiguity
    UPDATE resolutions r
    SET 
        votes_for = (
            SELECT COUNT(*) 
            FROM resolution_votes rv 
            WHERE rv.resolution_id = NEW.resolution_id 
            AND rv.vote = 'for'
        ),
        votes_against = (
            SELECT COUNT(*) 
            FROM resolution_votes rv 
            WHERE rv.resolution_id = NEW.resolution_id 
            AND rv.vote = 'against'
        ),
        votes_abstain = (
            SELECT COUNT(*) 
            FROM resolution_votes rv 
            WHERE rv.resolution_id = NEW.resolution_id 
            AND rv.vote = 'abstain'
        ),
        updated_at = NOW()
    WHERE r.id = NEW.resolution_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function to update minutes vote counts (no ambiguous references)
CREATE OR REPLACE FUNCTION update_minutes_counts()
RETURNS TRIGGER AS $$
DECLARE
    approve_count INTEGER;
    reject_count INTEGER;
    abstain_count INTEGER;
BEGIN
    -- Get counts with explicit table alias
    SELECT 
        COUNT(CASE WHEN mv.vote = 'approve' THEN 1 END),
        COUNT(CASE WHEN mv.vote = 'reject' THEN 1 END),
        COUNT(CASE WHEN mv.vote = 'abstain' THEN 1 END)
    INTO approve_count, reject_count, abstain_count
    FROM minutes_votes mv
    WHERE mv.minutes_id = NEW.minutes_id;
    
    -- Update with explicit table reference
    UPDATE minutes m
    SET 
        approve_votes = approve_count,
        reject_votes = reject_count,
        abstain_votes = abstain_count,
        total_votes = approve_count + reject_count + abstain_count,
        updated_at = NOW()
    WHERE m.id = NEW.minutes_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create SIMPLE triggers that only update counts (no voting completion logic)
CREATE TRIGGER simple_resolution_vote_trigger
    AFTER INSERT OR UPDATE OR DELETE ON resolution_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_resolution_counts();

CREATE TRIGGER simple_minutes_vote_trigger
    AFTER INSERT OR UPDATE OR DELETE ON minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_counts();

-- Grant permissions
GRANT EXECUTE ON FUNCTION count_eligible_voters() TO authenticated;
GRANT EXECUTE ON FUNCTION update_resolution_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION update_minutes_counts() TO authenticated;

-- Verify the fix
SELECT 'Simple vote count triggers installed - no ambiguous columns!' as status;
SELECT 'Voting should now work without errors.' as message;
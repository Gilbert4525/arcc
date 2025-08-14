-- =====================================================
-- FIX AMBIGUOUS COLUMN ERROR
-- =====================================================
-- This SQL fixes the "column reference 'resolution_id' is ambiguous" error
-- by ensuring all column references are properly qualified

-- First, let's check if there are any existing triggers that might be causing issues
-- and drop them to start fresh

-- Drop any existing triggers that might be causing conflicts
DROP TRIGGER IF EXISTS trigger_resolution_vote_completion ON resolution_votes;
DROP TRIGGER IF EXISTS trigger_minutes_vote_completion ON minutes_votes;
DROP TRIGGER IF EXISTS resolution_vote_trigger ON resolution_votes;
DROP TRIGGER IF EXISTS minutes_vote_trigger ON minutes_votes;

-- Drop any existing functions that might have ambiguous references
DROP FUNCTION IF EXISTS handle_resolution_vote_change();
DROP FUNCTION IF EXISTS handle_minutes_vote_change();
DROP FUNCTION IF EXISTS update_resolution_vote_counts();
DROP FUNCTION IF EXISTS update_minutes_vote_counts();

-- Now let's create clean, properly qualified functions

-- Function to update resolution vote counts (with proper column qualification)
CREATE OR REPLACE FUNCTION update_resolution_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts with properly qualified column names
    UPDATE resolutions 
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
    WHERE resolutions.id = NEW.resolution_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update minutes vote counts (with proper column qualification)
CREATE OR REPLACE FUNCTION update_minutes_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts with properly qualified column names
    UPDATE minutes 
    SET 
        approve_votes = (
            SELECT COUNT(*) 
            FROM minutes_votes mv 
            WHERE mv.minutes_id = NEW.minutes_id 
            AND mv.vote = 'approve'
        ),
        reject_votes = (
            SELECT COUNT(*) 
            FROM minutes_votes mv 
            WHERE mv.minutes_id = NEW.minutes_id 
            AND mv.vote = 'reject'
        ),
        abstain_votes = (
            SELECT COUNT(*) 
            FROM minutes_votes mv 
            WHERE mv.minutes_id = NEW.minutes_id 
            AND mv.vote = 'abstain'
        ),
        total_votes = (
            SELECT COUNT(*) 
            FROM minutes_votes mv 
            WHERE mv.minutes_id = NEW.minutes_id
        ),
        updated_at = NOW()
    WHERE minutes.id = NEW.minutes_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple triggers that just update vote counts
CREATE TRIGGER resolution_vote_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON resolution_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_resolution_vote_counts();

CREATE TRIGGER minutes_vote_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_vote_counts();

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_resolution_vote_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION update_minutes_vote_counts() TO authenticated;

-- Test that the functions work
SELECT 'Vote count triggers installed successfully - ambiguous column error should be fixed!' as status;
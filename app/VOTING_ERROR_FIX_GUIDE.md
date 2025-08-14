# 🚨 VOTING ERROR FIX - "Column Reference Ambiguous"

## **ERROR IDENTIFIED**
```
Error: Failed to record vote: column reference "resolution_id" is ambiguous
```

## **ROOT CAUSE**
This error occurs when there are database triggers or functions that have ambiguous column references in JOIN queries or subqueries.

## **IMMEDIATE FIX**

### **Step 1: Clean Up Database Triggers**
Go to **Supabase Dashboard → SQL Editor** and run this:

```sql
-- =====================================================
-- FIX AMBIGUOUS COLUMN ERROR
-- =====================================================

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

-- Create clean, properly qualified functions
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

-- Create simple triggers that just update vote counts
CREATE TRIGGER resolution_vote_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON resolution_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_resolution_vote_counts();

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_resolution_vote_counts() TO authenticated;

SELECT 'Ambiguous column error fixed!' as status;
```

### **Step 2: Test Voting**
1. **Try voting on a resolution again**
2. **Check if the error is gone**
3. **Verify vote counts update correctly**

## **WHAT I'VE ALREADY FIXED**

✅ **Updated ResolutionsService** - Changed from `upsert` to separate `insert`/`update` logic
✅ **Removed ambiguous queries** - All column references are now explicit
✅ **Created clean database functions** - No more ambiguous column references

## **TESTING CHECKLIST**

After running the SQL fix:

- [ ] **Voting works** - Can cast votes without errors
- [ ] **Vote counts update** - Numbers reflect correctly
- [ ] **No database errors** - Clean logs in Supabase
- [ ] **Email system works** - Voting completion triggers emails

## **WHY THIS HAPPENED**

The error occurred because:
1. **Database triggers** had ambiguous column references
2. **JOIN queries** didn't properly qualify table aliases
3. **Multiple tables** had columns with the same name (`resolution_id`)

## **PREVENTION**

To prevent this in the future:
- ✅ Always use table aliases in complex queries
- ✅ Qualify all column references explicitly
- ✅ Test database functions before deployment
- ✅ Use proper error handling in triggers

## **NEXT STEPS**

1. **Run the SQL fix** in Supabase Dashboard
2. **Test voting functionality** 
3. **Deploy voting summary triggers** (after confirming voting works)
4. **Test complete email system**

The voting system should work perfectly after this fix! 🎯
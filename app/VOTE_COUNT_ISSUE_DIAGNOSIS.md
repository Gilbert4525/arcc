# Vote Count Issue Diagnosis and Fix

## Problem
3 members have voted on resolutions but the system is only showing 1 vote in the voting progress display.

## Root Cause Analysis
Based on the code review, the issue is likely in the database layer:

1. **Frontend Display**: The frontend correctly displays `resolution.votes_for`, `resolution.votes_against`, and `resolution.votes_abstain` from the database
2. **Database Triggers**: There are database triggers that should automatically update vote counts when votes are inserted/updated/deleted
3. **Possible Issues**:
   - Database triggers may not be working properly
   - Vote counts may not have been updated after votes were cast
   - There might be a race condition in the voting process

## Immediate Fix Steps

### Step 1: Run Database Diagnostic
Execute the diagnostic script to see the current state:
```sql
-- Run: app/debug-vote-count-issue.sql
```

### Step 2: Apply Database Fix
Execute the fix script to recalculate vote counts:
```sql
-- Run: app/fix-vote-count-display-issue.sql
```

### Step 3: Verify Frontend Refresh
The frontend should automatically refresh after voting, but we can also add manual refresh capability.

## Technical Details

### Database Schema
- `resolutions` table has columns: `votes_for`, `votes_against`, `votes_abstain`
- `resolution_votes` table stores individual votes
- Triggers automatically update the resolution vote counts when votes change

### Frontend Logic
- Fetches resolutions with vote counts from `/api/resolutions`
- Displays vote counts in the "Voting Progress" section
- Uses real-time subscriptions to refresh when votes change

### API Endpoints
- `POST /api/resolutions/[id]/vote` - Cast a vote
- `GET /api/resolutions` - Get resolutions with vote counts
- Vote counts are calculated in the database service

## Prevention
1. Ensure database triggers are working properly
2. Add better error handling in the voting process
3. Add vote count validation in the API responses
4. Consider adding a manual "Refresh" button for users

## Testing
After applying the fix:
1. Check that vote counts display correctly
2. Cast a new vote and verify counts update immediately
3. Refresh the page and verify counts persist
4. Check that real-time updates work for other users
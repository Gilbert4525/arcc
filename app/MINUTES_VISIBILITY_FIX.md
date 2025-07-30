# Minutes Visibility Fix

## Problem
After a board member votes on minutes, the minutes would disappear from the voting section immediately. This was confusing because:
- Board members couldn't see that their vote was recorded
- They couldn't view the updated voting progress
- Minutes would vanish even if voting was still active

## Root Cause
The filtering logic only showed minutes with `status === 'voting'` in the voting section. When the trigger function automatically changed the status to `'passed'` or `'failed'` after reaching thresholds, the minutes would immediately move to the completed section.

## Solution
Updated the filtering logic in `MinutesVoting.tsx` to:

### 1. Enhanced Voting Section Filter
Minutes now stay in the "Active & Recent Voting" section if:
- Status is `'voting'` (actively open for voting)
- OR status is `'passed'`/`'failed'` but voting deadline hasn't passed yet
- OR recently completed (within 24 hours) to show immediate results

### 2. Updated Completed Section Filter
Minutes only move to "Completed" section when:
- Status is `'passed'` or `'failed'` 
- AND voting deadline has passed by more than 24 hours
- OR no voting deadline was set

### 3. Added Completion Notice
When minutes are completed but still shown in voting section:
- Shows clear "Voting Complete" notice
- Indicates whether minutes were approved or rejected
- Explains the final result is based on thresholds

### 4. Updated Section Titles
- Changed "Minutes Requiring Your Vote" to "Active & Recent Voting"
- Updated empty state messages to be more accurate

## Benefits
✅ **Board members can see their votes were recorded**
✅ **Minutes stay visible during active voting period**
✅ **Clear indication when voting is complete**
✅ **Smooth transition between voting and completed states**
✅ **Better user experience and transparency**

## User Experience Flow
1. **Before voting**: Minutes show with voting buttons
2. **After voting**: Minutes show with user's vote recorded + voting buttons for others
3. **When completed**: Minutes show completion notice but remain visible
4. **After deadline + 24h**: Minutes move to completed section

This ensures board members always have visibility into the voting process and can see the results of their participation.
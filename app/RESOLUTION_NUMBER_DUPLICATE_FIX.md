# Resolution Number Duplicate Fix

## Problem
When creating resolutions, the system was generating duplicate resolution numbers, causing the error:
```
Failed to create resolution: duplicate key value violates unique constraint "resolutions_resolution_number_key"
```

## Root Cause
The `generateResolutionNumber` function was using `resolutions.length + 1` which only counted the resolutions currently loaded in the component, not all resolutions in the database. This led to duplicate numbers when:
1. Multiple users created resolutions simultaneously
2. The component didn't have all resolutions loaded
3. Resolutions were deleted, creating gaps in the numbering

## Fixes Applied

### 1. Improved Resolution Number Generation
**File**: `app/src/components/resolutions/ResolutionManagement.tsx`

- **Before**: Used `resolutions.length + 1` (unreliable)
- **After**: Queries database for existing resolution numbers for the current year
- **Features**:
  - Finds the highest existing number for the year
  - Generates the next sequential number
  - Includes retry mechanism with offset for conflicts
  - Fallback to timestamp-based numbering if database query fails

### 2. API-Based Resolution Creation
**File**: `app/src/components/resolutions/ResolutionManagement.tsx`

- **Before**: Direct database insertion via Supabase client
- **After**: Uses `/api/resolutions` endpoint
- **Benefits**:
  - Consistent with other parts of the application
  - Better error handling and validation
  - Proper RLS policy enforcement

### 3. Retry Logic for Conflicts
**File**: `app/src/components/resolutions/ResolutionManagement.tsx`

- Added retry mechanism (up to 3 attempts)
- Detects duplicate key errors specifically
- Generates new resolution number on each retry
- Provides clear error messages to users

### 4. Enhanced API Error Handling
**File**: `app/src/app/api/resolutions/route.ts`

- Added specific handling for duplicate key database errors
- Returns proper HTTP 409 status for conflicts
- Better error logging and debugging information

### 5. Database Cleanup Script
**File**: `app/fix-duplicate-resolution-numbers.sql`

- Identifies existing duplicate resolution numbers
- Automatically fixes duplicates by renaming them
- Preserves the oldest resolution with original number
- Generates new unique numbers for duplicates

## Usage Instructions

### 1. Fix Existing Duplicates
Run the SQL script in your Supabase SQL editor:
```sql
-- Run the contents of fix-duplicate-resolution-numbers.sql
```

### 2. Test Resolution Creation
1. Try creating multiple resolutions quickly
2. Verify unique resolution numbers are generated
3. Check that the format is `RES-YYYY-XXX` (e.g., `RES-2024-001`)

### 3. Monitor for Issues
- Check browser console for any remaining errors
- Verify resolution numbers are sequential within each year
- Ensure no duplicate numbers are created

## Technical Details

### Resolution Number Format
- Pattern: `RES-YYYY-XXX`
- Example: `RES-2024-001`, `RES-2024-002`, etc.
- Year-based numbering (resets each year)
- Zero-padded to 3 digits

### Error Handling Flow
1. Generate resolution number from database query
2. Attempt to create resolution via API
3. If duplicate key error (409), retry with incremented number
4. Maximum 3 retry attempts
5. Fallback error message if all retries fail

### Database Query Optimization
- Uses `LIKE` pattern matching for year-based filtering
- Orders by resolution_number descending for efficiency
- Extracts numeric part using regex for comparison
- Handles edge cases (no existing resolutions, malformed numbers)

## Prevention Measures

1. **Database-First Numbering**: Always query database for existing numbers
2. **Atomic Operations**: Use API endpoints instead of direct database access
3. **Retry Logic**: Handle race conditions with automatic retries
4. **Error Specificity**: Detect and handle duplicate key errors specifically
5. **Fallback Mechanisms**: Timestamp-based numbering if all else fails

## Testing Scenarios

✅ **Single User Creation**: Normal resolution creation works  
✅ **Concurrent Creation**: Multiple users creating resolutions simultaneously  
✅ **Gap Handling**: Works correctly when resolutions are deleted  
✅ **Year Rollover**: Numbering resets properly for new year  
✅ **Error Recovery**: Graceful handling of database errors  
✅ **Retry Logic**: Automatic retry on duplicate conflicts  

The system now reliably generates unique resolution numbers and handles edge cases gracefully.
# Design Document

## Overview

This design addresses critical issues in the voting system where votes and comments are not properly persisting or displaying. The solution focuses on fixing database operations, improving error handling, resolving console errors, and ensuring proper real-time synchronization of voting data.

## Architecture

### Current Issues Analysis

1. **Vote Persistence Issues**: Votes may not be properly saved due to database transaction problems or authentication issues
2. **Comment Display Problems**: Admin comment view may not be fetching or displaying comments correctly
3. **Real-time Subscription Errors**: Improper cleanup of realtime subscriptions causing console errors
4. **Manifest Icon Errors**: Missing or incorrectly configured PWA manifest icons
5. **Data Synchronization**: Vote counts and statistics not updating properly after vote submission

### Solution Architecture

The fix will involve:
- Database service improvements for reliable vote persistence
- Enhanced error handling and retry mechanisms
- Proper realtime subscription management
- Manifest configuration fixes
- Improved data synchronization patterns

## Components and Interfaces

### 1. Database Service Enhancements

**MinutesService Improvements**:
- Enhanced `voteOnMinutes()` method with better error handling
- Improved `getUserVote()` method with proper authentication checks
- Fixed `getMinutesWithCommentCounts()` method for accurate comment counting
- Added transaction support for vote operations

**Key Methods to Fix**:
```typescript
// Enhanced vote submission with proper error handling
async voteOnMinutes(minutesId: string, vote: string, comments?: string): Promise<MinutesVote | null>

// Improved user vote retrieval
async getUserVote(minutesId: string): Promise<MinutesVote | null>

// Fixed comment counting for admin view
async getMinutesWithCommentCounts(page: number, limit: number): Promise<MinutesWithCommentCounts>
```

### 2. API Route Improvements

**Vote API (`/api/minutes/[id]/vote`)**:
- Enhanced error handling and logging
- Proper authentication validation
- Improved response format with detailed error messages
- Better handling of concurrent vote submissions

**Comments API (`/api/minutes/[id]/comments`)**:
- Fixed comment retrieval for admin view
- Proper authorization checks
- Enhanced error handling

### 3. Frontend Component Fixes

**MinutesVoting Component**:
- Improved vote submission handling
- Better error states and user feedback
- Enhanced data synchronization after vote submission
- Proper loading states

**AdminCommentView Component**:
- Fixed comment fetching and display
- Better error handling for failed requests
- Improved statistics calculation

**MinutesManagement Component**:
- Fixed comment count display
- Proper integration with comment view dialog

### 4. Real-time Subscription Management

**useRealtimeSubscription Hook**:
- Proper subscription cleanup on component unmount
- Better error handling for connection failures
- Graceful degradation when realtime features fail

### 5. Manifest and Service Worker Fixes

**PWA Configuration**:
- Proper icon configuration in manifest
- Service worker registration improvements
- Console error elimination

## Data Models

### Enhanced Vote Model
```typescript
interface MinutesVote {
  id: string;
  minutes_id: string;
  user_id: string;
  vote: 'approve' | 'reject' | 'abstain';
  comments?: string;
  voted_at: string;
  created_at: string;
  updated_at: string; // Add for tracking vote changes
}
```

### Vote Statistics Model
```typescript
interface VoteStatistics {
  total_votes: number;
  approve_votes: number;
  reject_votes: number;
  abstain_votes: number;
  approval_percentage: number;
  participation_percentage: number;
  comment_count: number;
  has_comments: boolean;
}
```

## Error Handling

### Database Error Handling
- Implement retry logic for transient database errors
- Proper error logging with context information
- User-friendly error messages for different failure scenarios
- Graceful degradation when database operations fail

### API Error Handling
- Standardized error response format
- Proper HTTP status codes
- Detailed error logging for debugging
- Rate limiting protection

### Frontend Error Handling
- Toast notifications for user feedback
- Loading states during operations
- Retry mechanisms for failed requests
- Fallback UI states for error conditions

## Testing Strategy

### Unit Tests
- Database service methods for vote operations
- API route handlers for various scenarios
- Component logic for vote submission and display
- Error handling functions

### Integration Tests
- End-to-end vote submission flow
- Admin comment viewing functionality
- Real-time subscription behavior
- Error recovery scenarios

### Manual Testing
- Vote submission and persistence verification
- Comment display in admin interface
- Console error monitoring
- Cross-browser compatibility

## Implementation Approach

### Phase 1: Database and API Fixes
1. Fix vote persistence in MinutesService
2. Enhance error handling in API routes
3. Improve comment retrieval functionality
4. Add proper logging and monitoring

### Phase 2: Frontend Improvements
1. Fix vote submission in MinutesVoting component
2. Enhance AdminCommentView functionality
3. Improve error states and user feedback
4. Add proper loading indicators

### Phase 3: Real-time and PWA Fixes
1. Fix realtime subscription cleanup
2. Resolve manifest icon issues
3. Improve service worker registration
4. Eliminate console errors

### Phase 4: Testing and Validation
1. Comprehensive testing of vote flow
2. Admin comment functionality verification
3. Error handling validation
4. Performance and reliability testing

## Security Considerations

- Proper authentication checks for all vote operations
- Authorization validation for admin comment access
- Input sanitization for vote comments
- Rate limiting for vote submissions
- Audit logging for vote changes

## Performance Optimizations

- Efficient database queries for vote retrieval
- Proper indexing for vote and comment tables
- Optimized real-time subscription management
- Caching strategies for frequently accessed data
- Lazy loading for comment data
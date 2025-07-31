# Design Document

## Overview

This design enhances the resolution system to provide comprehensive voting and commenting functionality that mirrors the successful patterns established in the minutes system. The implementation will add voting capabilities, comment management, and administrative oversight to resolutions, creating a consistent user experience across both minutes and resolutions.

## Architecture

The enhancement follows the existing system architecture patterns:

- **Database Layer**: New `resolution_votes` table and enhanced resolution fields
- **Service Layer**: Extended `ResolutionsService` with voting and comment methods
- **API Layer**: New endpoints for voting, comments, and statistics
- **Component Layer**: New React components mirroring the minutes voting UI
- **Integration Layer**: Notification system integration for voting activities

## Components and Interfaces

### Database Schema Changes

#### New Table: resolution_votes
```sql
CREATE TABLE public.resolution_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resolution_id UUID REFERENCES public.resolutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
    comments TEXT, -- Optional comments with the vote
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resolution_id, user_id) -- One vote per user per resolution
);
```

#### Enhanced Resolutions Table
```sql
-- Add voting result columns to existing resolutions table
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS total_eligible_voters INTEGER DEFAULT 0;
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS requires_majority BOOLEAN DEFAULT true;
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS minimum_quorum INTEGER DEFAULT 50;
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS approval_threshold INTEGER DEFAULT 75;

-- Voting results (computed from votes)
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0;
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS votes_for INTEGER DEFAULT 0;
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS votes_against INTEGER DEFAULT 0;
ALTER TABLE public.resolutions ADD COLUMN IF NOT EXISTS votes_abstain INTEGER DEFAULT 0;
```

### Service Layer Enhancements

#### ResolutionsService Extensions
```typescript
class ResolutionsService {
  // Existing methods...

  // Voting methods
  async voteOnResolution(resolutionId: string, vote: 'approve' | 'reject' | 'abstain', comment?: string): Promise<ResolutionVote>
  async getUserVote(resolutionId: string, userId?: string): Promise<ResolutionVote | null>
  async getResolutionVotes(resolutionId: string): Promise<ResolutionVote[]>
  
  // Comment and statistics methods
  async getResolutionComments(resolutionId: string, withComments?: boolean): Promise<{
    votes: VoteWithProfile[];
    statistics: CommentStatistics;
  }>
  
  // Voting management
  async updateVoteCounts(resolutionId: string): Promise<void>
  async checkVotingStatus(resolutionId: string): Promise<void>
}
```

### API Endpoints

#### New Resolution Voting Endpoints
- `POST /api/resolutions/[id]/vote` - Cast vote on resolution
- `GET /api/resolutions/[id]/vote` - Get user's vote on resolution
- `GET /api/resolutions/[id]/comments` - Get all votes and comments (admin only)

#### Enhanced Resolution Endpoints
- `GET /api/resolutions` - Enhanced with voting statistics
- `PUT /api/resolutions/[id]` - Enhanced to handle voting status changes

### Component Architecture

#### New Components

**ResolutionVoting Component**
- Mirrors `MinutesVoting` functionality
- Displays resolutions open for voting
- Provides voting interface with comment support
- Shows voting progress and statistics
- Handles voting deadline management

**ResolutionDetailView Component**
- Detailed view of resolution content
- Voting interface integration
- Comment display for user's own vote
- Voting statistics display

**AdminResolutionCommentView Component**
- Mirrors `AdminCommentView` for minutes
- Displays all votes and comments for admins
- Filtering and search capabilities
- Voting statistics and analytics
- Concern flagging for rejection votes

**ResolutionManagement Enhancements**
- Integration of voting functionality
- Admin controls for opening/closing voting
- Voting statistics display
- Comment management interface

#### Component Integration Points

**Dashboard Integration**
- Resolution voting cards on board member dashboard
- Admin voting oversight on admin dashboard
- Notification integration for voting activities

**Navigation Integration**
- Resolution voting section in sidebar
- Voting status indicators
- Quick access to pending votes

## Data Models

### Core Types

```typescript
interface ResolutionVote {
  id: string;
  resolution_id: string;
  user_id: string;
  vote: 'approve' | 'reject' | 'abstain';
  comments?: string;
  voted_at: string;
  created_at: string;
}

interface VoteWithProfile extends ResolutionVote {
  voter: {
    id: string;
    full_name: string;
    email: string;
    position?: string;
  };
}

interface CommentStatistics {
  total_votes: number;
  total_comments: number;
  comments_by_vote: {
    approve: number;
    reject: number;
    abstain: number;
  };
  avg_comment_length: number;
  has_concerns: boolean;
}

interface EnhancedResolution extends Resolution {
  total_eligible_voters: number;
  requires_majority: boolean;
  minimum_quorum: number;
  approval_threshold: number;
  total_votes: number;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
}
```

### Database Functions

#### Voting Result Updates
```sql
CREATE OR REPLACE FUNCTION update_resolution_voting_results()
RETURNS TRIGGER AS $
BEGIN
    -- Update resolution with current vote counts
    UPDATE public.resolutions 
    SET 
        total_votes = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id)),
        votes_for = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'approve'),
        votes_against = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'reject'),
        votes_abstain = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'abstain'),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.resolution_id, OLD.resolution_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;
```

## Error Handling

### Voting Error Scenarios
- **Resolution not found**: Return 404 with clear error message
- **Voting not open**: Return 400 with current status information
- **Deadline passed**: Return 400 with deadline information
- **Already voted**: Return 400 with existing vote information
- **Invalid vote value**: Return 400 with allowed values
- **Comment too long**: Return 400 with length limits

### Comment System Error Handling
- **Unauthorized access**: Return 403 for non-admin comment viewing
- **Database errors**: Graceful degradation with retry logic
- **Sanitization failures**: Clear error messages for invalid content

### Rate Limiting
- Implement rate limiting similar to minutes voting
- 5 votes per minute per user per resolution
- Clear error messages with retry timing

## Testing Strategy

### Unit Tests
- ResolutionsService voting methods
- Vote validation and sanitization
- Comment statistics calculation
- Database trigger functions

### Integration Tests
- API endpoint functionality
- Authentication and authorization
- Database transaction integrity
- Notification system integration

### Component Tests
- ResolutionVoting component interactions
- AdminResolutionCommentView functionality
- Voting form validation
- Error state handling

### End-to-End Tests
- Complete voting workflow
- Admin comment viewing workflow
- Notification delivery
- Voting deadline handling

## Security Considerations

### Authentication & Authorization
- Board members can vote on resolutions in "voting" status
- Admins can view all votes and comments
- Users can only see their own votes and comments
- Rate limiting to prevent vote spam

### Data Validation
- Vote values strictly validated
- Comment sanitization using existing middleware
- SQL injection prevention through parameterized queries
- XSS prevention in comment display

### Row Level Security
```sql
-- Resolution votes policies
CREATE POLICY "Resolution votes are viewable by authenticated users" ON public.resolution_votes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Board members can insert their own votes" ON public.resolution_votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'board_member'))
    );

CREATE POLICY "Users can update their own votes" ON public.resolution_votes
    FOR UPDATE USING (auth.uid() = user_id);
```

## Performance Considerations

### Database Optimization
- Indexes on resolution_votes table for common queries
- Efficient vote counting using database functions
- Pagination for large comment lists

### Caching Strategy
- Cache voting statistics for frequently accessed resolutions
- Real-time updates for vote counts
- Optimistic UI updates with fallback

### Query Optimization
- Batch vote statistics updates
- Efficient comment filtering and search
- Minimal database round trips

## Notification Integration

### Voting Notifications
- Resolution opened for voting → All eligible voters
- Vote cast → Admins (configurable)
- Voting deadline approaching → Non-voters
- Voting completed → All participants

### Comment Notifications
- Concerning comments (rejections) → Admins with priority
- High engagement resolutions → Admin summaries
- Voting completion with comment summary → Stakeholders

## Migration Strategy

### Database Migration
1. Create `resolution_votes` table
2. Add voting columns to `resolutions` table
3. Create database functions and triggers
4. Set up RLS policies
5. Create necessary indexes

### Code Deployment
1. Deploy service layer enhancements
2. Deploy API endpoints
3. Deploy UI components
4. Enable notification integration
5. Update documentation

### Data Migration
- No existing data migration needed
- Set default voting parameters for existing resolutions
- Initialize vote counts to zero for all resolutions
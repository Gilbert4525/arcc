# Notification System Fixes - Design Document

## Overview

This design document outlines the implementation of a comprehensive notification system that automatically creates notifications when documents, meetings, and resolutions are added or updated. The system will support both in-app notifications and web push notifications.

## Architecture

### Notification Flow Architecture

```
API Endpoint → Create/Update Entity → Create Notifications → Send Web Push (if enabled)
     ↓                ↓                      ↓                        ↓
Database Update → Notification Service → Real-time Updates → Browser Notifications
```

### Service Integration Pattern

Each API endpoint will integrate with the notification system using a consistent pattern:

1. **Entity Operation**: Create/update the main entity (document, meeting, resolution)
2. **Notification Creation**: Create appropriate notifications for relevant users
3. **Error Handling**: Ensure notification failures don't break the main operation
4. **Web Push**: Send web push notifications if enabled

## Components and Interfaces

### 1. Enhanced Notification Service

The existing `NotificationsService` will be enhanced with helper methods for common notification scenarios:

```typescript
export class NotificationsService {
  // Existing methods...

  // Document notifications
  async notifyDocumentCreated(document: Document, createdBy: string): Promise<void>
  async notifyDocumentPublished(document: Document, publishedBy: string): Promise<void>
  async notifyDocumentUpdated(document: Document, updatedBy: string): Promise<void>

  // Meeting notifications
  async notifyMeetingCreated(meeting: Meeting, createdBy: string): Promise<void>
  async notifyMeetingUpdated(meeting: Meeting, updatedBy: string): Promise<void>
  async notifyMeetingCancelled(meeting: Meeting, cancelledBy: string): Promise<void>

  // Resolution notifications
  async notifyResolutionCreated(resolution: Resolution, createdBy: string): Promise<void>
  async notifyResolutionPublished(resolution: Resolution, publishedBy: string): Promise<void>
  async notifyVotingDeadlineApproaching(resolution: Resolution): Promise<void>

  // Helper methods
  private async getBoardMembers(): Promise<string[]>
  private async getMeetingParticipants(meetingId: string): Promise<string[]>
  private async getEligibleVoters(resolutionId: string): Promise<string[]>
}
```

### 2. API Route Integration

Each API route will be updated to include notification creation:

```typescript
// Example: Document creation
export async function POST(request: NextRequest) {
  try {
    // ... existing code ...
    
    const document = await documentsService.createDocument(documentData);
    
    // Create notifications (don't let this fail the main operation)
    try {
      const { notifications } = getDatabaseServices(supabase);
      await notifications.notifyDocumentCreated(document, user.id);
    } catch (notificationError) {
      console.error('Failed to create document notification:', notificationError);
      // Continue - don't fail the main operation
    }
    
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    // ... error handling ...
  }
}
```

### 3. Web Push Integration

The web push service will be integrated with the notification creation process:

```typescript
export class NotificationsService {
  private webPushService: WebPushServerService;

  async createNotification(data: CreateNotificationData): Promise<Notification | null> {
    // Create in-app notification
    const notification = await this.createInAppNotification(data);
    
    // Send web push notification (don't let this fail the main operation)
    try {
      await this.sendWebPushNotification(notification);
    } catch (webPushError) {
      console.error('Failed to send web push notification:', webPushError);
      // Continue - in-app notification was created successfully
    }
    
    return notification;
  }
}
```

### 4. Notification Templates

Standardized notification templates for different event types:

```typescript
interface NotificationTemplate {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  action_url?: string;
  action_text?: string;
}

const NOTIFICATION_TEMPLATES = {
  DOCUMENT_CREATED: (document: Document) => ({
    title: 'New Document Available',
    message: `A new document "${document.title}" has been uploaded`,
    type: 'document' as const,
    priority: 'normal' as const,
    action_url: `/dashboard/documents/${document.id}`,
    action_text: 'View Document',
  }),
  
  MEETING_SCHEDULED: (meeting: Meeting) => ({
    title: 'Meeting Scheduled',
    message: `You have been invited to "${meeting.title}" on ${formatDate(meeting.meeting_date)}`,
    type: 'meeting' as const,
    priority: 'high' as const,
    action_url: `/dashboard/meetings/${meeting.id}`,
    action_text: 'View Meeting',
  }),
  
  RESOLUTION_PUBLISHED: (resolution: Resolution) => ({
    title: 'New Resolution for Voting',
    message: `Resolution "${resolution.title}" is now open for voting`,
    type: 'resolution' as const,
    priority: 'high' as const,
    action_url: `/dashboard/resolutions/${resolution.id}`,
    action_text: 'Vote Now',
  }),
};
```

## Data Models

### Enhanced Notification Types

```typescript
interface NotificationMetadata {
  entity_type: 'document' | 'meeting' | 'resolution';
  entity_id: string;
  action_type: 'created' | 'updated' | 'published' | 'cancelled' | 'reminder';
  created_by?: string;
  additional_data?: Record<string, any>;
}

interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'meeting' | 'resolution' | 'document' | 'system' | 'reminder';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  action_text?: string;
  metadata?: NotificationMetadata;
  expires_at?: string;
}
```

## Error Handling

### Notification Error Strategy

1. **Non-blocking**: Notification failures should never prevent the main operation from completing
2. **Logging**: All notification errors should be logged with sufficient detail for debugging
3. **Graceful Degradation**: If web push fails, in-app notifications should still work
4. **Retry Logic**: Implement retry logic for transient failures

```typescript
async function safeCreateNotification(
  notificationService: NotificationsService,
  data: CreateNotificationData
): Promise<void> {
  try {
    await notificationService.createNotification(data);
  } catch (error) {
    console.error('Notification creation failed:', {
      error: error.message,
      data,
      timestamp: new Date().toISOString(),
    });
    // Don't throw - this is a non-critical operation
  }
}
```

## Implementation Plan

### Phase 1: Core Notification Integration
1. Update DocumentsService API routes to create notifications
2. Update MeetingsService API routes to create notifications  
3. Update ResolutionsService API routes to create notifications
4. Add notification helper methods to NotificationsService

### Phase 2: Web Push Enhancement
1. Integrate web push with notification creation
2. Add proper error handling for web push failures
3. Test web push notifications across different browsers
4. Add fallback mechanisms for unsupported browsers

### Phase 3: Advanced Features
1. Add notification templates for consistent messaging
2. Implement notification preferences filtering
3. Add bulk notification optimization
4. Create notification analytics and monitoring

## Security Considerations

### Access Control
- Only send notifications to users who have permission to see the entity
- Validate user permissions before creating notifications
- Ensure notification content doesn't leak sensitive information

### Privacy
- Respect user notification preferences
- Allow users to opt out of specific notification types
- Ensure web push subscriptions are properly managed

## Performance Optimization

### Bulk Operations
- Use bulk insert for multiple notifications
- Implement background job processing for large notification batches
- Cache user lists to avoid repeated database queries

### Database Optimization
- Add proper indexes for notification queries
- Implement notification cleanup for old/expired notifications
- Use database triggers for real-time updates

## Testing Strategy

### Unit Tests
- Test notification creation for each entity type
- Test error handling and fallback mechanisms
- Test notification template generation

### Integration Tests
- Test end-to-end notification flow from API to user
- Test web push notification delivery
- Test real-time notification updates

### Manual Testing
- Test notifications across different browsers
- Test notification preferences and filtering
- Test notification performance under load
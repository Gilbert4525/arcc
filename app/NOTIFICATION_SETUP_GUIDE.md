# Notification System Setup Guide

## Overview

The Arc Board Management System includes a comprehensive notification system with:
- In-app notifications with real-time updates
- Email notifications
- Web push notifications
- Notification preferences management

## Database Setup

### 1. Apply Notification Schema

Run the following SQL files in your Supabase SQL Editor in this order:

1. **Main notification schema** (`notifications-schema.sql`):
   ```sql
   -- Copy and paste the entire content of notifications-schema.sql
   ```

2. **Add push subscription column** (`add-push-subscription-column.sql`):
   ```sql
   ALTER TABLE public.profiles 
   ADD COLUMN push_subscription JSONB;
   ```

### 2. Verify Database Tables

After running the SQL, you should have these new tables:
- `notifications` - Stores all notifications
- `notification_preferences` - User notification preferences
- `profiles` table should have a new `push_subscription` column

## Environment Variables

Add these to your `.env.local` file:

```env
# Optional: VAPID keys for web push notifications (generate these for production)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### Generating VAPID Keys (Optional for Production)

For production web push notifications, generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

## Features

### 1. In-App Notifications

- ✅ Real-time notification bell in dashboard header
- ✅ Dropdown with notification list
- ✅ Mark as read/unread functionality
- ✅ Delete notifications
- ✅ Real-time updates via Supabase subscriptions

### 2. Email Notifications

- ✅ Automatic email sending based on user preferences
- ✅ Configurable frequency (immediate, daily, weekly, never)
- ✅ Email templates for different notification types

### 3. Web Push Notifications

- ✅ Browser push notifications
- ✅ Service worker for offline support
- ✅ Permission management
- ✅ Subscription management

### 4. Notification Preferences

- ✅ User settings page with notification controls
- ✅ Toggle different notification types
- ✅ Email frequency settings
- ✅ Web push enable/disable

## Testing the System

### 1. Test In-App Notifications

As an admin user, you can create test notifications:

```javascript
// In browser console or via API
fetch('/api/admin/test-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_user_id: 'optional-user-id' })
});
```

### 2. Test Web Push Notifications

```javascript
// In browser console
import { testWebPushNotification } from '@/lib/notifications/testNotifications';
testWebPushNotification();
```

### 3. Test Real-time Updates

1. Open two browser windows/tabs with the same user
2. Create a notification in one tab
3. Watch it appear in real-time in the other tab

## Usage Examples

### Creating Notifications Programmatically

```typescript
import { getDatabaseServices } from '@/lib/database';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { notifications } = getDatabaseServices(supabase);

// Create a notification
await notifications.createNotification({
  user_id: 'user-uuid',
  title: 'Meeting Reminder',
  message: 'Board meeting starts in 30 minutes',
  type: 'meeting',
  priority: 'high',
  action_url: '/dashboard/meetings',
  action_text: 'Join Meeting'
});
```

### Bulk Notifications

```typescript
// Send to all users
const userIds = ['user1-id', 'user2-id', 'user3-id'];
await notifications.createBulkNotifications(userIds, {
  title: 'System Maintenance',
  message: 'Scheduled maintenance tonight',
  type: 'system',
  priority: 'normal'
});
```

## Troubleshooting

### Common Issues

1. **Notifications not appearing**: 
   - Check if database schema is applied
   - Verify user has notification preferences created
   - Check browser console for errors

2. **Web push not working**:
   - Ensure HTTPS (required for web push)
   - Check notification permissions in browser
   - Verify service worker is registered

3. **Real-time updates not working**:
   - Check Supabase real-time is enabled
   - Verify RLS policies allow subscriptions
   - Check network connectivity

### Debug Commands

```javascript
// Check notification service status
import { webPushService } from '@/lib/notifications/webPush';
console.log('Supported:', webPushService.isSupported());
console.log('Permission:', webPushService.getPermissionStatus());
console.log('Subscribed:', webPushService.isSubscribed());

// Check service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

## File Structure

```
app/src/
├── lib/notifications/
│   ├── webPush.ts              # Web push service
│   └── testNotifications.ts    # Test utilities
├── components/notifications/
│   └── NotificationBell.tsx    # Main notification component
├── components/settings/
│   └── NotificationSettings.tsx # Settings UI
├── app/api/notifications/
│   ├── route.ts               # CRUD operations
│   ├── [id]/route.ts          # Individual notification ops
│   ├── mark-all-read/route.ts # Bulk operations
│   ├── preferences/route.ts   # User preferences
│   ├── subscribe/route.ts     # Web push subscription
│   └── unsubscribe/route.ts   # Web push unsubscription
└── hooks/
    └── useRealtimeSubscription.ts # Real-time updates
```

## Next Steps

1. **Apply database schema** - Run the SQL files in Supabase
2. **Test basic functionality** - Create test notifications
3. **Configure email settings** - Set up email service if needed
4. **Generate VAPID keys** - For production web push
5. **Add notification triggers** - Integrate with your business logic

The notification system is now ready to use! Users will see the notification bell in the dashboard header and can manage their preferences in the settings page.
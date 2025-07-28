# Notification System Testing Guide

## Overview

This guide helps you test the complete notification system including in-app notifications and web push notifications.

## Prerequisites

1. **VAPID Keys Configured**: Ensure VAPID keys are set in `.env.local`
2. **Database Setup**: Ensure `push_subscription` column exists in profiles table
3. **Service Worker**: Ensure `/public/sw.js` is accessible
4. **HTTPS**: Web push notifications require HTTPS (works on localhost for development)

## Testing Steps

### 1. Test In-App Notifications

#### Using Test Notification Button
1. Login as an admin user
2. Go to admin dashboard
3. Click "Test Notification" button
4. Check notification bell icon for new notification
5. Click notification bell to view notification
6. Verify notification appears with correct content

#### Using API Directly
```bash
# Create a test notification
curl -X POST http://localhost:3000/api/admin/test-notification \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Test Web Push Notifications

#### Enable Web Push
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Check Service Workers section
4. Verify service worker is registered
5. Allow notifications when prompted
6. Check that push subscription is stored in database

#### Test Web Push Flow
1. Create a test notification using the button or API
2. Verify you receive both:
   - In-app notification (notification bell)
   - Browser push notification (system notification)
3. Click on browser notification to verify it opens the correct page

### 3. Test Real-World Scenarios

#### Document Notifications
1. Upload a new document as admin
2. Verify board members receive notifications
3. Publish a document
4. Verify board members receive publish notification

#### Meeting Notifications
1. Create a new meeting as admin
2. Verify participants receive notifications
3. Update meeting details
4. Verify participants receive update notification

#### Resolution Notifications
1. Create a new resolution as admin
2. Verify board members receive notifications
3. Publish resolution for voting
4. Verify eligible voters receive voting notification

### 4. Test Notification Preferences

#### Email Notifications
1. Go to Settings > Notifications
2. Toggle email notifications on/off
3. Create test notification
4. Verify email is sent/not sent based on preference

#### Web Push Preferences
1. Disable browser notifications
2. Create test notification
3. Verify only in-app notification is received
4. Re-enable browser notifications
5. Verify both notifications are received

### 5. Test Real-time Updates

#### Multiple Browser Windows
1. Open application in two browser windows
2. Login as different users in each window
3. Create notification from one window
4. Verify real-time notification appears in other window

#### Notification Bell Updates
1. Create multiple notifications
2. Verify notification count updates in real-time
3. Mark notifications as read
4. Verify count decreases in real-time

## Troubleshooting

### Web Push Not Working

1. **Check VAPID Keys**
   ```bash
   # Verify keys are set
   echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
   echo $VAPID_PRIVATE_KEY
   ```

2. **Check Service Worker**
   - Open DevTools > Application > Service Workers
   - Verify service worker is active
   - Check for any errors in console

3. **Check Permissions**
   - Verify notification permission is granted
   - Check browser notification settings

4. **Check Database**
   ```sql
   -- Verify push subscription is stored
   SELECT id, email, push_subscription FROM profiles WHERE push_subscription IS NOT NULL;
   ```

### In-App Notifications Not Working

1. **Check Database Connection**
   - Verify Supabase connection is working
   - Check RLS policies for notifications table

2. **Check Real-time Subscription**
   - Verify Supabase real-time is enabled
   - Check browser console for subscription errors

3. **Check API Endpoints**
   - Test notification creation API directly
   - Verify notification service is working

### Common Issues

1. **CORS Issues**: Ensure service worker is served from same origin
2. **HTTPS Required**: Web push requires HTTPS (localhost works for dev)
3. **Browser Support**: Some browsers don't support web push
4. **Permission Denied**: User must grant notification permission

## Testing Checklist

- [ ] In-app notifications appear in notification bell
- [ ] Notification count updates correctly
- [ ] Web push notifications appear in browser
- [ ] Clicking web push opens correct page
- [ ] Real-time updates work across browser windows
- [ ] Document creation triggers notifications
- [ ] Meeting creation triggers notifications
- [ ] Resolution creation triggers notifications
- [ ] Email notifications work (if enabled)
- [ ] Notification preferences are respected
- [ ] Service worker is registered and active
- [ ] Push subscription is stored in database
- [ ] Bulk notifications work for multiple users
- [ ] Notification templates render correctly
- [ ] Error handling works (graceful degradation)

## Performance Testing

### Load Testing
1. Create 100+ notifications rapidly
2. Verify system remains responsive
3. Check database performance
4. Monitor memory usage

### Bulk Notification Testing
1. Create notification for all board members
2. Verify all users receive notifications
3. Check web push delivery success rate
4. Monitor server performance

## Security Testing

1. **Authorization**: Verify only authorized users can create notifications
2. **Data Validation**: Test with malformed notification data
3. **XSS Prevention**: Test notification content for XSS vulnerabilities
4. **Rate Limiting**: Test rapid notification creation

## Monitoring

### Logs to Monitor
- Notification creation success/failure
- Web push delivery success/failure
- Service worker registration
- Real-time subscription status

### Metrics to Track
- Notification delivery rate
- Web push success rate
- User engagement with notifications
- System performance impact

## Next Steps

After testing, consider:
1. Setting up monitoring and alerting
2. Implementing notification analytics
3. Adding more notification types
4. Optimizing performance for large user bases
5. Adding notification scheduling
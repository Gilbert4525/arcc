-- Quick Notification System Check
-- Run this first to identify the main issues

-- 1. Check if notification_preferences table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') 
        THEN '✅ notification_preferences table EXISTS' 
        ELSE '❌ notification_preferences table MISSING - This is likely the main issue!' 
    END as table_check;

-- 2. Check if email preference columns exist in profiles table
SELECT 
    '� EMEAIL PREFERENCE COLUMNS CHECK:' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'email_notifications_enabled'
        ) 
        THEN '✅ email_notifications_enabled column EXISTS' 
        ELSE '❌ email_notifications_enabled column MISSING - This is the problem!' 
    END as email_column_check;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'voting_email_notifications'
        ) 
        THEN '✅ voting_email_notifications column EXISTS' 
        ELSE '❌ voting_email_notifications column MISSING - This is the problem!' 
    END as voting_column_check;

-- 3. Show current profiles table structure
SELECT 
    '👥 CURRENT USER DATA:' as section,
    email,
    full_name,
    role,
    is_active,
    CASE 
        WHEN notification_preferences IS NOT NULL 
        THEN '✅ Has JSON preferences' 
        ELSE '❌ No JSON preferences' 
    END as has_json_preferences
FROM profiles 
WHERE role IN ('admin', 'board_member')
ORDER BY role, email;

-- 3. Check recent notifications (should show if notifications are being created)
SELECT 
    '📧 RECENT NOTIFICATIONS (last 24 hours):' as section,
    COUNT(*) as notification_count,
    CASE 
        WHEN COUNT(*) > 0 
        THEN '✅ Notifications are being created' 
        ELSE '❌ No notifications created - this indicates the problem' 
    END as status
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 4. Check recent resolutions/minutes that should have triggered notifications
SELECT 
    '📋 RECENT RESOLUTIONS (last 24 hours):' as section,
    COUNT(*) as resolution_count
FROM resolutions 
WHERE created_at >= NOW() - INTERVAL '24 hours';

SELECT 
    '📝 RECENT MINUTES (last 24 hours):' as section,
    COUNT(*) as minutes_count
FROM minutes 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 5. Show the exact issue
SELECT 
    '🔍 DIAGNOSIS:' as section,
    'If notification_preferences table is missing, the NotificationsService.sendBulkEmailNotificationsIfEnabled() method will fail' as issue,
    'The method tries to join with notification_preferences table that does not exist' as cause,
    'Run the full debug script to see the complete analysis' as next_step;
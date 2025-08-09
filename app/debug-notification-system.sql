-- Comprehensive Notification System Diagnostic Script
-- Run this in your Supabase SQL Editor to identify all issues

-- =============================================================================
-- 1. CHECK TABLE EXISTENCE AND STRUCTURE
-- =============================================================================

-- Check if notification_preferences table exists
SELECT 
    'notification_preferences table exists' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') 
        THEN 'YES' 
        ELSE 'NO - THIS IS A PROBLEM!' 
    END as result;

-- Check if notifications table exists
SELECT 
    'notifications table exists' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
        THEN 'YES' 
        ELSE 'NO - THIS IS A PROBLEM!' 
    END as result;

-- Check profiles table email notification columns
SELECT 
    'profiles email columns exist' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name IN ('email_notifications_enabled', 'voting_email_notifications')
        ) 
        THEN 'YES' 
        ELSE 'NO - USING OLD SYSTEM' 
    END as result;

-- =============================================================================
-- 2. CHECK USER DATA AND EMAIL PREFERENCES
-- =============================================================================

-- Check all users and their email preferences (profiles table approach)
SELECT 
    'USER EMAIL PREFERENCES (profiles table)' as section,
    id,
    email,
    full_name,
    role,
    is_active,
    COALESCE(email_notifications_enabled, true) as email_notifications_enabled,
    COALESCE(voting_email_notifications, true) as voting_email_notifications,
    notification_preferences
FROM profiles 
WHERE role IN ('admin', 'board_member')
ORDER BY role, full_name;

-- Check notification_preferences table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        RAISE NOTICE 'NOTIFICATION_PREFERENCES TABLE DATA:';
        -- This will show the data if table exists
    ELSE
        RAISE NOTICE 'notification_preferences table does not exist - using profiles table approach';
    END IF;
END $$;

-- If notification_preferences table exists, show its data
SELECT 
    'NOTIFICATION PREFERENCES TABLE DATA' as section,
    np.user_id,
    p.email,
    p.full_name,
    p.role,
    np.email_notifications,
    np.meeting_reminders,
    np.resolution_alerts,
    np.document_updates,
    np.system_alerts,
    np.email_frequency
FROM notification_preferences np
JOIN profiles p ON np.user_id = p.id
WHERE p.role IN ('admin', 'board_member')
ORDER BY p.role, p.full_name;

-- =============================================================================
-- 3. CHECK RECENT NOTIFICATIONS
-- =============================================================================

-- Check recent notifications created
SELECT 
    'RECENT NOTIFICATIONS (last 7 days)' as section,
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    p.email,
    p.full_name,
    p.role,
    n.created_at
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC
LIMIT 20;

-- =============================================================================
-- 4. CHECK RECENT RESOLUTIONS AND MINUTES
-- =============================================================================

-- Check recent resolutions
SELECT 
    'RECENT RESOLUTIONS (last 7 days)' as section,
    r.id,
    r.title,
    r.status,
    r.created_at,
    p.email as created_by_email,
    p.full_name as created_by_name
FROM resolutions r
JOIN profiles p ON r.created_by = p.id
WHERE r.created_at >= NOW() - INTERVAL '7 days'
ORDER BY r.created_at DESC
LIMIT 10;

-- Check recent minutes
SELECT 
    'RECENT MINUTES (last 7 days)' as section,
    m.id,
    m.title,
    m.status,
    m.created_at,
    p.email as created_by_email,
    p.full_name as created_by_name
FROM minutes m
JOIN profiles p ON m.created_by = p.id
WHERE m.created_at >= NOW() - INTERVAL '7 days'
ORDER BY m.created_at DESC
LIMIT 10;

-- =============================================================================
-- 5. CHECK EMAIL CONFIGURATION ENVIRONMENT
-- =============================================================================

-- Check if we can identify email configuration issues
SELECT 
    'EMAIL SYSTEM CHECKS' as section,
    'Check server logs for EMAIL_API_KEY and FROM_EMAIL environment variables' as note;

-- =============================================================================
-- 6. SUMMARY AND RECOMMENDATIONS
-- =============================================================================

SELECT 
    'DIAGNOSTIC SUMMARY' as section,
    'Check the results above for:' as instructions,
    '1. notification_preferences table existence' as check1,
    '2. User email preferences settings' as check2,
    '3. Recent notifications created' as check3,
    '4. Recent resolutions/minutes that should have triggered emails' as check4;

-- =============================================================================
-- 7. POTENTIAL FIXES
-- =============================================================================

-- Show potential fix queries (commented out - uncomment to run)

-- If notification_preferences table doesn't exist, create it:
/*
-- Uncomment and run this if notification_preferences table doesn't exist:

CREATE TABLE public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    meeting_reminders BOOLEAN DEFAULT true,
    resolution_alerts BOOLEAN DEFAULT true,
    document_updates BOOLEAN DEFAULT true,
    system_alerts BOOLEAN DEFAULT true,
    email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create default preferences for existing users
INSERT INTO public.notification_preferences (user_id, email_notifications, resolution_alerts, document_updates)
SELECT id, true, true, true
FROM profiles 
WHERE role IN ('admin', 'board_member')
ON CONFLICT (user_id) DO NOTHING;
*/

-- If users don't have email preferences in profiles table:
/*
-- Uncomment and run this if email preference columns are missing in profiles:

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voting_email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "voting_summaries": true,
  "voting_reminders": true,
  "system_notifications": true,
  "digest_frequency": "immediate",
  "preferred_format": "html"
}'::jsonb;

-- Update existing users
UPDATE public.profiles 
SET 
  email_notifications_enabled = true,
  voting_email_notifications = true,
  notification_preferences = '{
    "voting_summaries": true,
    "voting_reminders": true,
    "system_notifications": true,
    "digest_frequency": "immediate",
    "preferred_format": "html"
  }'::jsonb
WHERE email_notifications_enabled IS NULL 
   OR voting_email_notifications IS NULL 
   OR notification_preferences IS NULL;
*/

SELECT 'DIAGNOSTIC COMPLETE - Review results above' as final_message;
-- COMPLETE NOTIFICATION SYSTEM FIX
-- This script fixes ALL the missing components for email notifications
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- STEP 1: ADD MISSING EMAIL PREFERENCE COLUMNS TO PROFILES TABLE
-- =============================================================================

-- Add email preference columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voting_email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_email_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "voting_summaries": true,
  "voting_reminders": true,
  "system_notifications": true,
  "digest_frequency": "immediate",
  "preferred_format": "html"
}'::jsonb;

-- Update existing users to have email notifications enabled by default
UPDATE public.profiles 
SET 
  email_notifications_enabled = COALESCE(email_notifications_enabled, true),
  voting_email_notifications = COALESCE(voting_email_notifications, true),
  notification_preferences = COALESCE(notification_preferences, '{
    "voting_summaries": true,
    "voting_reminders": true,
    "system_notifications": true,
    "digest_frequency": "immediate",
    "preferred_format": "html"
  }'::jsonb)
WHERE role IN ('admin', 'board_member');

-- =============================================================================
-- STEP 2: CREATE NOTIFICATIONS TABLE IF IT DOESN'T EXIST
-- =============================================================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('meeting', 'resolution', 'document', 'system', 'reminder')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- Optional URL for action button
    action_text TEXT, -- Optional text for action button
    metadata JSONB, -- Additional data (meeting_id, document_id, etc.)
    expires_at TIMESTAMPTZ, -- Optional expiration date
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- STEP 3: CREATE NOTIFICATION_PREFERENCES TABLE
-- =============================================================================

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_preferences (
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

-- =============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_email_notifications 
ON public.profiles(email_notifications_enabled) 
WHERE email_notifications_enabled = true;

CREATE INDEX IF NOT EXISTS idx_profiles_voting_notifications 
ON public.profiles(voting_email_notifications) 
WHERE voting_email_notifications = true;

-- =============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 6: CREATE RLS POLICIES
-- =============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- RLS Policies for notification preferences
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- STEP 7: CREATE DEFAULT NOTIFICATION PREFERENCES FOR EXISTING USERS
-- =============================================================================

-- Create default notification preferences for all existing users
INSERT INTO public.notification_preferences (
    user_id, 
    email_notifications, 
    meeting_reminders, 
    resolution_alerts, 
    document_updates, 
    system_alerts,
    email_frequency
)
SELECT 
    id,
    COALESCE(email_notifications_enabled, true) as email_notifications,
    true as meeting_reminders,
    true as resolution_alerts,
    true as document_updates,
    true as system_alerts,
    'immediate' as email_frequency
FROM profiles 
WHERE role IN ('admin', 'board_member')
ON CONFLICT (user_id) DO UPDATE SET
    email_notifications = EXCLUDED.email_notifications,
    resolution_alerts = EXCLUDED.resolution_alerts,
    document_updates = EXCLUDED.document_updates,
    updated_at = NOW();

-- =============================================================================
-- STEP 8: CREATE TRIGGER FOR NEW USERS
-- =============================================================================

-- Function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_preferences()
RETURNS TRIGGER AS $func$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification preferences when a new profile is created
DROP TRIGGER IF EXISTS on_profile_created_notification_preferences ON public.profiles;
CREATE TRIGGER on_profile_created_notification_preferences
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_preferences();

-- =============================================================================
-- STEP 9: VERIFICATION
-- =============================================================================

-- Verify the setup
SELECT 
    '✅ SETUP VERIFICATION' as status,
    'Profiles with email preferences: ' || COUNT(*) as profiles_count
FROM profiles 
WHERE role IN ('admin', 'board_member') 
AND email_notifications_enabled = true;

SELECT 
    '✅ NOTIFICATION PREFERENCES VERIFICATION' as status,
    'Users with notification preferences: ' || COUNT(*) as preferences_count
FROM notification_preferences np
JOIN profiles p ON np.user_id = p.id
WHERE p.role IN ('admin', 'board_member');

-- Show all users and their notification settings
SELECT 
    '👥 FINAL USER NOTIFICATION SETTINGS' as section,
    p.email,
    p.full_name,
    p.role,
    p.email_notifications_enabled,
    p.voting_email_notifications,
    np.email_notifications as pref_email_notifications,
    np.resolution_alerts,
    np.email_frequency,
    CASE 
        WHEN p.email_notifications_enabled = true AND np.email_notifications = true 
        THEN '✅ WILL RECEIVE EMAILS' 
        ELSE '❌ Will NOT receive emails' 
    END as email_status
FROM profiles p
LEFT JOIN notification_preferences np ON p.id = np.user_id
WHERE p.role IN ('admin', 'board_member')
ORDER BY p.role, p.email;

-- =============================================================================
-- FINAL MESSAGE
-- =============================================================================

SELECT 
    '🎉 NOTIFICATION SYSTEM SETUP COMPLETE!' as final_message,
    'All users should now receive email notifications when resolutions and minutes are created.' as result,
    'Test by creating a new resolution or minutes item.' as next_step;
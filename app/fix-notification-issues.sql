-- Fix Notification System Issues
-- Run this to fix the RLS policy and other database issues

-- =============================================================================
-- FIX 1: RLS POLICY ISSUE FOR NOTIFICATION_PREFERENCES
-- =============================================================================

-- Drop the restrictive RLS policy that's preventing system inserts
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;

-- Create a more permissive policy that allows system operations
CREATE POLICY "Allow notification preferences management" ON public.notification_preferences
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role' OR
        auth.uid() IS NULL  -- Allow system operations
    );

-- Also allow system to insert notification preferences
DROP POLICY IF EXISTS "System can insert notification preferences" ON public.notification_preferences;
CREATE POLICY "System can insert notification preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- FIX 2: ENSURE ALL USERS HAVE NOTIFICATION PREFERENCES
-- =============================================================================

-- Insert missing notification preferences for users who don't have them
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
    p.id,
    COALESCE(p.email_notifications_enabled, true) as email_notifications,
    true as meeting_reminders,
    true as resolution_alerts,
    true as document_updates,
    true as system_alerts,
    'immediate' as email_frequency
FROM profiles p
LEFT JOIN notification_preferences np ON p.id = np.user_id
WHERE p.role IN ('admin', 'board_member') 
AND np.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify all users have notification preferences
SELECT 
    '✅ NOTIFICATION PREFERENCES CHECK' as status,
    COUNT(p.id) as total_users,
    COUNT(np.user_id) as users_with_preferences,
    CASE 
        WHEN COUNT(p.id) = COUNT(np.user_id) 
        THEN '✅ All users have preferences' 
        ELSE '❌ Some users missing preferences' 
    END as result
FROM profiles p
LEFT JOIN notification_preferences np ON p.id = np.user_id
WHERE p.role IN ('admin', 'board_member');

-- Show users and their notification status
SELECT 
    '👥 USER NOTIFICATION STATUS' as section,
    p.email,
    p.full_name,
    p.role,
    CASE WHEN np.user_id IS NOT NULL THEN '✅ Has preferences' ELSE '❌ Missing preferences' END as pref_status,
    COALESCE(np.email_notifications, false) as email_enabled,
    COALESCE(np.resolution_alerts, false) as resolution_alerts
FROM profiles p
LEFT JOIN notification_preferences np ON p.id = np.user_id
WHERE p.role IN ('admin', 'board_member')
ORDER BY p.role, p.email;
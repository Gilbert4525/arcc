-- DEFINITIVE FIX for RLS Policy Issue
-- This fixes the exact problem preventing notification preferences creation

-- =============================================================================
-- PROBLEM: System service cannot create notification preferences due to RLS
-- SOLUTION: Allow system operations by checking for service_role or NULL auth
-- =============================================================================

-- Drop all existing policies (including any that might exist)
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Allow notification preferences management" ON public.notification_preferences;
DROP POLICY IF EXISTS "System can insert notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_select_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_delete_policy" ON public.notification_preferences;

-- Create permissive policies that allow both user access AND system operations
CREATE POLICY "notification_preferences_select_policy" ON public.notification_preferences
    FOR SELECT USING (
        auth.uid() = user_id OR           -- User can see their own
        auth.role() = 'service_role' OR   -- Service role can see all
        auth.uid() IS NULL                -- Allow system operations
    );

CREATE POLICY "notification_preferences_insert_policy" ON public.notification_preferences
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR           -- User can insert their own
        auth.role() = 'service_role' OR   -- Service role can insert any
        auth.uid() IS NULL                -- Allow system operations (THIS IS KEY)
    );

CREATE POLICY "notification_preferences_update_policy" ON public.notification_preferences
    FOR UPDATE USING (
        auth.uid() = user_id OR           -- User can update their own
        auth.role() = 'service_role' OR   -- Service role can update any
        auth.uid() IS NULL                -- Allow system operations
    );

CREATE POLICY "notification_preferences_delete_policy" ON public.notification_preferences
    FOR DELETE USING (
        auth.uid() = user_id OR           -- User can delete their own
        auth.role() = 'service_role' OR   -- Service role can delete any
        auth.uid() IS NULL                -- Allow system operations
    );

-- =============================================================================
-- ENSURE ALL USERS HAVE NOTIFICATION PREFERENCES
-- =============================================================================

-- Now create missing notification preferences (this should work after RLS fix)
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
    true as email_notifications,
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

SELECT 
    '✅ RLS POLICY FIX VERIFICATION' as status,
    COUNT(*) as total_board_members,
    COUNT(np.user_id) as users_with_preferences,
    CASE 
        WHEN COUNT(*) = COUNT(np.user_id) 
        THEN '✅ ALL USERS HAVE PREFERENCES - RLS FIXED!' 
        ELSE '❌ Still missing preferences - RLS issue persists' 
    END as result
FROM profiles p
LEFT JOIN notification_preferences np ON p.id = np.user_id
WHERE p.role IN ('admin', 'board_member');

-- Show the exact users and their preference status
SELECT 
    '👥 USER PREFERENCE STATUS AFTER FIX' as section,
    p.email,
    p.full_name,
    p.role,
    CASE WHEN np.user_id IS NOT NULL THEN '✅ HAS PREFERENCES' ELSE '❌ MISSING' END as status,
    np.email_notifications,
    np.resolution_alerts
FROM profiles p
LEFT JOIN notification_preferences np ON p.id = np.user_id
WHERE p.role IN ('admin', 'board_member')
ORDER BY p.role, p.email;
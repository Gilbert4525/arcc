-- Fix Notification System - Create missing notification_preferences table
-- Run this in your Supabase SQL Editor

-- First, check if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        -- Create notification_preferences table
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

        -- Enable RLS (Row Level Security)
        ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

        -- RLS Policies for notification preferences
        CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
            FOR INSERT WITH CHECK (auth.uid() = user_id);

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
        ON CONFLICT (user_id) DO NOTHING;

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

        RAISE NOTICE 'notification_preferences table created successfully with default preferences for existing users';
    ELSE
        RAISE NOTICE 'notification_preferences table already exists';
    END IF;
END $$;

-- Verify the setup
SELECT 
    'VERIFICATION: notification_preferences table setup' as status,
    COUNT(*) as user_count,
    COUNT(CASE WHEN email_notifications = true THEN 1 END) as email_enabled_count
FROM notification_preferences np
JOIN profiles p ON np.user_id = p.id
WHERE p.role IN ('admin', 'board_member');

-- Show all users and their notification preferences
SELECT 
    'USER NOTIFICATION PREFERENCES' as section,
    p.email,
    p.full_name,
    p.role,
    np.email_notifications,
    np.resolution_alerts,
    np.document_updates,
    np.email_frequency
FROM profiles p
LEFT JOIN notification_preferences np ON p.id = np.user_id
WHERE p.role IN ('admin', 'board_member')
ORDER BY p.role, p.email;
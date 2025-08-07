-- Add email preference columns to profiles table
-- Run this in your Supabase SQL Editor

-- Add email notification preference columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voting_email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_email_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "voting_summaries": true,
  "voting_reminders": true,
  "system_notifications": true,
  "digest_frequency": "immediate",
  "preferred_format": "html"
}'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_notifications 
ON public.profiles(email_notifications_enabled) 
WHERE email_notifications_enabled = true;

CREATE INDEX IF NOT EXISTS idx_profiles_voting_notifications 
ON public.profiles(voting_email_notifications) 
WHERE voting_email_notifications = true;

-- Update existing users to have email notifications enabled by default
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
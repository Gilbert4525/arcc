-- Add push_subscription column to profiles table for web push notifications
-- Run this in your Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN push_subscription JSONB;
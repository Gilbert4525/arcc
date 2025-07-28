-- Fix categories table to allow 'minutes' type
-- Run this in your Supabase SQL Editor

-- Drop the existing check constraint
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;

-- Add the new check constraint that includes 'minutes'
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check 
CHECK (type IN ('document', 'meeting', 'resolution', 'minutes'));

-- Now you can insert the minutes category
INSERT INTO public.categories (name, description, type, color, is_active) 
VALUES (
    'Meeting Minutes',
    'Meeting minutes and voting',
    'minutes',
    '#8B5CF6',
    true
) ON CONFLICT DO NOTHING;
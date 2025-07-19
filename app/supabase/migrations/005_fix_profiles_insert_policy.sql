-- Fix profiles table RLS policy to allow users to create their own profile
-- This migration adds the missing INSERT policy for profiles

-- Add INSERT policy for users to create their own profile
CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Optional: Also add a more permissive policy that allows any authenticated user to create a profile
-- Uncomment the following if you want to allow any authenticated user to create any profile
-- CREATE POLICY "Authenticated users can create profiles" 
-- ON public.profiles FOR INSERT 
-- TO authenticated WITH CHECK (true);

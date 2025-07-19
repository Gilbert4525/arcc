-- Comprehensive fix for profiles RLS policies
-- This addresses the 403 Forbidden error when creating profiles

-- First, drop the existing policies to avoid conflicts
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Recreate all policies with clearer logic

-- 1. SELECT: Any authenticated user can view profiles
CREATE POLICY "authenticated_users_can_view_profiles" 
ON public.profiles FOR SELECT 
TO authenticated USING (true);

-- 2. INSERT: Users can create their own profile (most important for fixing the 403 error)
CREATE POLICY "users_can_create_own_profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 3. UPDATE: Users can update their own profile
CREATE POLICY "users_can_update_own_profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 4. DELETE: Only admins can delete profiles
CREATE POLICY "admins_can_delete_profiles" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. Additional admin override: Admins can do everything
CREATE POLICY "admins_full_access_profiles" 
ON public.profiles FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

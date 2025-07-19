-- Fix missing RLS policies for resolutions and resolution_votes tables
-- This fixes the issue where regular users cannot see resolutions created by admins

-- ===================================================================
-- Table: resolutions
-- ===================================================================

CREATE POLICY "Authenticated users can view all resolutions" 
ON public.resolutions FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create resolutions" 
ON public.resolutions FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own resolutions" 
ON public.resolutions FOR UPDATE 
USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all resolutions" 
ON public.resolutions FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Table: resolution_votes
-- ===================================================================

CREATE POLICY "Users can view all resolution votes" 
ON public.resolution_votes FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Users can vote on resolutions" 
ON public.resolution_votes FOR INSERT 
WITH CHECK (voter_id = auth.uid());

CREATE POLICY "Users can update their own votes" 
ON public.resolution_votes FOR UPDATE 
USING (voter_id = auth.uid()) WITH CHECK (voter_id = auth.uid());

CREATE POLICY "Users can delete their own votes" 
ON public.resolution_votes FOR DELETE 
USING (voter_id = auth.uid());

CREATE POLICY "Admins can manage all resolution votes" 
ON public.resolution_votes FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

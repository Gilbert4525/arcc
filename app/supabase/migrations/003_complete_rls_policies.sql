-- Add the missing meeting_participants table
CREATE TABLE public.meeting_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'attendee' CHECK (role IN ('organizer', 'attendee', 'optional')),
    attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'accepted', 'declined', 'attended', 'absent')),
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meeting_participants_meeting_user ON public.meeting_participants(meeting_id, user_id);

-- Comprehensive RLS Policies for Arc Board Management
-- This script drops old policies and creates a complete, secure set.

-- Drop existing, incomplete policies to avoid conflicts.
-- Note: This will fail if the policy does not exist, which is safe.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON public.meetings;
DROP POLICY IF EXISTS "Authenticated users can view resolutions" ON public.resolutions;
DROP POLICY IF EXISTS "Authenticated users can view resolution votes" ON public.resolution_votes;
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own documents" ON storage.objects;

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- Table: profiles
-- ===================================================================

CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Table: categories
-- ===================================================================

CREATE POLICY "Categories are viewable by authenticated users" 
ON public.categories FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Table: documents
-- ===================================================================

CREATE POLICY "Authenticated users can view all documents" 
ON public.documents FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create documents" 
ON public.documents FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own documents" 
ON public.documents FOR UPDATE 
USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all documents" 
ON public.documents FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Table: meetings
-- ===================================================================

CREATE POLICY "Authenticated users can view all meetings" 
ON public.meetings FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Admins can manage meetings" 
ON public.meetings FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Table: meeting_participants
-- ===================================================================

CREATE POLICY "Users can view their own meeting participation" 
ON public.meeting_participants FOR SELECT 
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update their own attendance status" 
ON public.meeting_participants FOR UPDATE 
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage meeting participants" 
ON public.meeting_participants FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Table: resolutions
-- ===================================================================

CREATE POLICY "Authenticated users can view all resolutions" 
ON public.resolutions FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Board members can create resolutions" 
ON public.resolutions FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can update their own draft resolutions" 
ON public.resolutions FOR UPDATE 
USING (created_by = auth.uid() AND status = 'draft') WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all resolutions" 
ON public.resolutions FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Table: resolution_votes
-- ===================================================================

CREATE POLICY "Users can view votes on accessible resolutions" 
ON public.resolution_votes FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.resolutions
  WHERE id = resolution_id
));

CREATE POLICY "Users can cast votes on resolutions" 
ON public.resolution_votes FOR INSERT 
WITH CHECK (voter_id = auth.uid());

CREATE POLICY "Admins can manage votes" 
ON public.resolution_votes FOR ALL 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===================================================================
-- Storage: documents bucket
-- ===================================================================

-- Create the storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'documents', 'documents', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
);

CREATE POLICY "Authenticated users can view files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

CREATE POLICY "File owners or admins can update files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND (owner = auth.uid() OR public.is_admin())
  );

CREATE POLICY "File owners or admins can delete files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND (owner = auth.uid() OR public.is_admin())
  );

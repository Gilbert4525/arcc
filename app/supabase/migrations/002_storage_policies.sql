-- Storage Policies for Documents Bucket
-- This sets up Row Level Security for file uploads and downloads

-- Allow authenticated users to view documents
CREATE POLICY "Allow authenticated users to view documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

-- Allow authenticated users to upload documents
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

-- Allow users to update their own documents or admins to update any
CREATE POLICY "Allow users to update own documents" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'documents' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

-- Allow users to delete their own documents or admins to delete any
CREATE POLICY "Allow users to delete own documents" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'documents' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

-- Additional helper functions for document management

-- Function to increment view count (referenced in documents service)
CREATE OR REPLACE FUNCTION increment_view_count(document_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.documents 
  SET view_count = view_count + 1 
  WHERE id = document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment download count (referenced in documents service)
CREATE OR REPLACE FUNCTION increment_download_count(document_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.documents 
  SET download_count = download_count + 1 
  WHERE id = document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

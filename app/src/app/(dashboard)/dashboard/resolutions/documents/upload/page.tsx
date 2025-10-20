import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PassedResolutionDocumentUpload } from '@/components/resolutions/PassedResolutionDocumentUpload';

export default async function PassedResolutionDocumentUploadPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile and check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard/resolutions/documents');
  }

  // Fetch categories for resolution documents
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('type', ['resolution', 'document'])
    .eq('is_active', true)
    .order('name');

  return (
    <PassedResolutionDocumentUpload
      categories={categories || []}
    />
  );
}
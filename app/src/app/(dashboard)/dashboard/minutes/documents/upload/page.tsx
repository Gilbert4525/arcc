import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MinutesDocumentUpload } from '@/components/minutes/MinutesDocumentUpload';

export default async function MinutesDocumentUploadPage() {
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
    redirect('/dashboard/minutes/documents');
  }

  // Fetch categories for minutes documents
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('type', ['meeting', 'document'])
    .eq('is_active', true)
    .order('name');

  return (
    <MinutesDocumentUpload
      categories={categories || []}
    />
  );
}
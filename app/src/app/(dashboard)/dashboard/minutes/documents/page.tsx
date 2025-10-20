import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MinutesDocuments } from '@/components/minutes/MinutesDocuments';

export default async function MinutesDocumentsPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  // Fetch minutes documents
  let documentsQuery = supabase
    .from('documents')
    .select(`
      *,
      profiles!documents_created_by_fkey(full_name, email),
      categories(name, color)
    `)
    .or('tags.cs.{"minutes"},tags.cs.{"meeting_minutes"}') // Filter for minutes documents
    .order('created_at', { ascending: false });

  // Apply role-based filtering
  if (profile.role !== 'admin') {
    documentsQuery = documentsQuery.eq('is_published', true);
  }

  const { data: documents, error: documentsError } = await documentsQuery;

  if (documentsError) {
    console.error('Error fetching minutes documents:', documentsError);
  }

  // Fetch categories for filtering
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('type', ['meeting', 'document'])
    .eq('is_active', true)
    .order('name');

  return (
    <MinutesDocuments
      initialDocuments={documents || []}
      categories={categories || []}
      userId={user.id}
      userRole={profile.role || 'board_member'}
    />
  );
}
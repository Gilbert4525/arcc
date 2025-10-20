import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PassedResolutionDocuments } from '@/components/resolutions/PassedResolutionDocuments';

export default async function PassedResolutionDocumentsPage() {
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

  // Fetch resolution documents
  let documentsQuery = supabase
    .from('documents')
    .select(`
      *,
      profiles:created_by(full_name, email),
      categories(name, color)
    `)
    .or('tags.cs.{"passed_resolution"},tags.cs.{"resolution"}') // Filter for resolution documents
    .order('created_at', { ascending: false });

  // Apply role-based filtering
  if (profile.role !== 'admin') {
    documentsQuery = documentsQuery.eq('is_published', true);
  }

  const { data: documents, error: documentsError } = await documentsQuery;

  if (documentsError) {
    console.error('Error fetching resolution documents:', documentsError);
  }

  // Fetch categories for filtering
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('type', ['resolution', 'document'])
    .eq('is_active', true)
    .order('name');

  return (
    <PassedResolutionDocuments
      initialDocuments={documents || []}
      categories={categories || []}
      userId={user.id}
      userRole={profile.role}
    />
  );
}
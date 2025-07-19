import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DocumentManagement } from '@/components/documents/DocumentManagement';
import { getDatabaseServices } from '@/lib/database';

export default async function DocumentsPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Initialize services
  const { documents, categories: categoriesService } = getDatabaseServices(supabase);
  
  // Fetch data using instance-based services
  const documentsResult = await documents.getDocuments(1, 50);
  const categories = await categoriesService.getCategoriesByType('document');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Browse, search, and manage all board documents and materials
        </p>
      </div>
      
      <DocumentManagement 
        initialDocuments={documentsResult.documents || []} 
        categories={categories || []}
        userId={user.id}
        userRole={profile?.role || 'board_member'}
      />
    </div>
  );
}

export const metadata = {
  title: 'Documents - Arc Board Management',
  description: 'Browse and manage board documents',
};

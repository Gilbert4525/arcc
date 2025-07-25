import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { getDatabaseServices } from '@/lib/database';

export default async function DocumentUploadPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // User is authenticated, proceed with page

  // Get categories for document categorization using our service
    const { categories: categoriesService } = getDatabaseServices(supabase);
  const categories = await categoriesService.getCategoriesByType('document');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
        <p className="text-muted-foreground">
          Upload and manage board documents, reports, and meeting materials
        </p>
      </div>
      
      <DocumentUpload 
        categories={categories || []} 
      />
    </div>
  );
}

export const metadata = {
  title: 'Upload Documents - BoardMix',
  description: 'Upload board documents and materials',
};

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CategoryManagement } from '@/components/admin/CategoryManagement';

export default async function CategoriesPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Get all categories
  const { data: categories } = await supabase
    .from('categories')
    .select(`
      *,
      profiles:created_by(full_name, email)
    `)
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Category Management</h1>
        <p className="text-muted-foreground">
          Manage categories for documents, meetings, and resolutions
        </p>
      </div>
      
      <CategoryManagement 
        initialCategories={categories || []} 
        userId={user.id}
      />
    </div>
  );
}

export const metadata = {
  title: 'Category Management - BoardMix',
  description: 'Manage system categories',
};

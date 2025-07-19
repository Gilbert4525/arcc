import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ResolutionManagement } from '@/components/resolutions/ResolutionManagement';
import { getDatabaseServices } from '@/lib/database';

export default async function ResolutionsPage() {
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

  const { resolutions: resolutionsService, categories: categoriesService } = getDatabaseServices(supabase);

  // Get resolutions based on user role
  const resolutions = profile?.role === 'admin' 
    ? await resolutionsService.getAllResolutionsWithDetails() // Admin sees all resolutions
    : await resolutionsService.getResolutionsForBoardMembers(); // Board members see only published/voting

  // Get categories for resolution categorization
  const categories = await categoriesService.getCategoriesByType('resolution');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resolutions</h1>
        <p className="text-muted-foreground">
          Manage board resolutions, voting, and decision tracking
        </p>
      </div>
      
      <ResolutionManagement 
        initialResolutions={resolutions || []} 
        categories={categories || []}
        userId={user.id}
        userRole={profile?.role || 'board_member'}
      />
    </div>
  );
}

export const metadata = {
  title: 'Resolutions - Arc Board Management',
  description: 'Manage board resolutions and voting',
};

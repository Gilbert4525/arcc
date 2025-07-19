import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MeetingManagement from '@/components/meetings/MeetingManagement';
import { getDatabaseServices } from '@/lib/database';

export default async function MeetingsPage() {
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

  const { meetings: meetingsService, categories: categoriesService } = getDatabaseServices(supabase);

  // Get meetings with related data
  const meetings = await meetingsService.getAllMeetingsWithDetails();

  // Get categories for meeting categorization
  const categories = await categoriesService.getCategoriesByType('meeting');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
        <p className="text-muted-foreground">
          Schedule and manage board meetings, committee meetings, and special sessions
        </p>
      </div>
      
      <MeetingManagement />
    </div>
  );
}

export const metadata = {
  title: 'Meetings - Arc Board Management',
  description: 'Manage board meetings and schedules',
};

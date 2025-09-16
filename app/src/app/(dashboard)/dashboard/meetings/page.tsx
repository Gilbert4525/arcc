import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MeetingManagement from '@/components/meetings/MeetingManagement';

export default async function MeetingsPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Check user role on server side
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'board_member';

  // User is authenticated, proceed with page

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
        <p className="text-muted-foreground">
          Schedule and manage board meetings, committee meetings, and special sessions
        </p>
      </div>
      
      <MeetingManagement initialUserRole={userRole} />
    </div>
  );
}

export const metadata = {
  title: 'Meetings - BoardMix',
  description: 'Manage board meetings and schedules',
};

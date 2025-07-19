import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserManagement } from '@/components/admin/UserManagement';
import { getDatabaseServices } from '@/lib/database';

export default async function UsersPage() {
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

  // Fetch all users for admin using our backend service
      const { profiles } = getDatabaseServices(supabase);
  const users = await profiles.getAllProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage board members and administrators
        </p>
      </div>
      
      <UserManagement initialUsers={users || []} />
    </div>
  );
}

export const metadata = {
  title: 'User Management - Arc Board Management',
  description: 'Manage board members and administrators',
};

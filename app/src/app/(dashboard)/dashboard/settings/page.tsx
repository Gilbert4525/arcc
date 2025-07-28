import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Database } from 'lucide-react';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        <SettingsForm profile={profile!} />

        {/* Notification Settings */}
        <NotificationSettings />

        {/* Admin Only Settings */}
        {profile?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Administrative settings for the board management system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-backup">Automatic Backups</Label>
                  <p className="text-sm text-gray-500">
                    Automatically backup system data daily
                  </p>
                </div>
                <Switch id="auto-backup" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="audit-logging">Audit Logging</Label>
                  <p className="text-sm text-gray-500">
                    Log all user actions for compliance
                  </p>
                </div>
                <Switch id="audit-logging" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <p className="text-sm text-gray-500">
                    Put the system in maintenance mode
                  </p>
                </div>
                <Switch id="maintenance-mode" />
              </div>
              <Button>Save System Settings</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Settings - BoardMix',
  description: 'Manage your account settings and preferences',
};
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpsert = Database['public']['Tables']['profiles']['Insert'];

export class ProfilesService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Get user profile by ID
   */
  async getProfile(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all user profiles
   */
  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error fetching all profiles:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Upsert user profile
   */
  async upsertProfile(profile: ProfileUpsert): Promise<Profile | null> {
    if (!profile.id) {
      console.error('Upsert requires a profile ID');
      return null;
    }
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) {
      console.error('Error updating avatar:', error);
      return false;
    }

    return true;
  }

  /**
   * Search profiles by name or email
   */
  async searchProfiles(query: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching profiles:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get all admin users
   */
  async getAdmins(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin');

    if (error) {
      console.error('Error fetching admins:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user profile with stats
   */
  async getProfileWithStats(userId: string): Promise<Profile | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile with stats:', error);
      return null;
    }

    if (!profile) {
      return null;
    }

    // Determine admin status from the profile role
    const isAdmin = profile.role === 'admin';
    const data = { ...profile, is_admin: isAdmin };

    return data;
  }
}

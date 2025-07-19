import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/profiles - Get all profiles (admin only)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profiles: profilesService } = getDatabaseServices(supabase);

    // Get user profile to check role
    const profile = await profilesService.getProfile(user.id);
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profiles = await profilesService.getAllProfiles();
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Error in GET /api/profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/profiles - Create or update profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, email, full_name, avatar_url, role, position, phone, bio } = body;

    const { profiles: profilesService } = getDatabaseServices(supabase);

    // Users can only update their own profile, admins can update any profile
    const currentProfile = await profilesService.getProfile(user.id);
    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (id !== user.id && currentProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profileData = {
      id: id || user.id,
      email: email || user.email!,
      full_name,
      avatar_url,
      role: currentProfile.role === 'admin' ? role : currentProfile.role, // Only admins can change roles
      position,
      phone,
      bio,
    };

    const profile = await profilesService.upsertProfile(profileData);
    if (!profile) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in POST /api/profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

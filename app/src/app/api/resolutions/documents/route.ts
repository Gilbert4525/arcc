import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        *,
        profiles!documents_created_by_fkey(full_name, email),
        categories(name, color)
      `)
      .or('tags.cs.{"passed_resolution"},tags.cs.{"resolution"}') // Filter for resolution documents
      .order('created_at', { ascending: false });

    // Apply filters based on user role
    if (profile.role !== 'admin') {
      // Board members can only see published documents
      query = query.eq('is_published', true);
    }

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,filename.ilike.%${search}%`);
    }

    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }

    // Apply status filter
    if (status && status !== 'all') {
      if (status === 'published') {
        query = query.eq('is_published', true);
      } else if (status === 'unpublished') {
        query = query.eq('is_published', false);
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error fetching resolution documents:', error);
      return NextResponse.json({ error: 'Failed to fetch resolution documents' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .or('tags.cs.{"passed_resolution"},tags.cs.{"resolution"}');

    if (profile.role !== 'admin') {
      countQuery = countQuery.eq('is_published', true);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      data: documents || [],
      total: totalCount || 0,
      page,
      limit,
      hasMore: (totalCount || 0) > page * limit
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { CategoriesService } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/categories - Get categories with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      const categoriesWithStats = await CategoriesService.getCategoryUsageStats();
      return NextResponse.json({ categories: categoriesWithStats });
    }

    let categories;

    if (type) {
      categories = await CategoriesService.getCategoriesByType(type);
    } else {
      categories = await CategoriesService.getCategories();
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, type, color = '#3B82F6' } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['document', 'meeting', 'resolution'].includes(type)) {
      return NextResponse.json({ error: 'Invalid category type' }, { status: 400 });
    }

    const categoryData = {
      name,
      description,
      type,
      color,
      created_by: user.id,
    };

    const category = await CategoriesService.createCategory(categoryData);
    if (!category) {
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

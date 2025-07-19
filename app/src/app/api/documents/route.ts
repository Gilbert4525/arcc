import { NextRequest, NextResponse } from 'next/server';
import { DocumentsService } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/documents - Get documents with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service instance
    const documentsService = new DocumentsService(supabase);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const published = searchParams.get('published');

    let result;

    if (search) {
      // Search documents
      const documents = await documentsService.searchDocuments(search);
      result = { documents, total: documents.length, hasMore: false };
    } else if (categoryId) {
      // Get documents by category
      const documents = await documentsService.getDocumentsByCategory(categoryId);
      result = { documents, total: documents.length, hasMore: false };
    } else if (published === 'true') {
      // Get published documents only
      const documents = await documentsService.getPublishedDocuments();
      result = { documents, total: documents.length, hasMore: false };
    } else {
      // Get all documents with pagination
      result = await documentsService.getDocuments(page, limit);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents - Create new document
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service instance
    const documentsService = new DocumentsService(supabase);

    const body = await request.json();
    const {
      title,
      description,
      filename,
      file_path,
      file_size,
      file_type,
      category_id,
      tags,
      is_published = false,
    } = body;

    if (!title || !filename || !file_path || !file_size || !file_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const documentData = {
      title,
      description,
      filename,
      file_path,
      file_size,
      file_type,
      category_id,
      tags,
      is_published,
      published_at: is_published ? new Date().toISOString() : null,
      created_by: user.id,
    };

    const document = await documentsService.createDocument(documentData);
    if (!document) {
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

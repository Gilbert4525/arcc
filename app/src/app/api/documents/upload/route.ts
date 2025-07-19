import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDatabaseServices } from '@/lib/database';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// POST /api/documents/upload - Upload document file
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category_id = formData.get('category_id') as string;
    const tags = formData.get('tags') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB' }, { status: 400 });
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Calculate file checksum
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Parse tags
    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : null;

    // Create document record using our service
    const documentData = {
      title,
      description: description || null,
      filename: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      category_id: category_id || null,
      tags: parsedTags,
      checksum,
      created_by: user.id,
      is_published: false,
      version: 1,
      view_count: 0,
      download_count: 0,
      upload_progress: 100,
    };

    const { documents: documentsService } = getDatabaseServices(supabase);
    const document = await documentsService.createDocument(documentData);

    if (!document) {
      // If database insert fails, delete the uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    return NextResponse.json({ 
      document,
      message: 'File uploaded successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/documents/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

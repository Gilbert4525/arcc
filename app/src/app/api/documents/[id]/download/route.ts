import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DocumentsService } from '@/lib/database';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Create service instance
    const documentsService = new DocumentsService(supabase);
    
    // Get document
    const document = await documentsService.getDocument(documentId);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permissions
    if (profile.role !== 'admin' && !document.is_published) {
      return NextResponse.json({ error: 'Document not accessible' }, { status: 403 });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // Update download count
    await documentsService.updateDocument(documentId, {
      download_count: (document.download_count || 0) + 1
    });

    // Return file with proper headers
    const headers = new Headers();
    headers.set('Content-Type', document.file_type);
    headers.set('Content-Disposition', `attachment; filename="${document.filename}"`);
    headers.set('Content-Length', document.file_size.toString());

    return new NextResponse(fileData, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error in document download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
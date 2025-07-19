import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type Document = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type DocumentUpdate = Database['public']['Tables']['documents']['Update'];


export class DocumentsService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Get all documents with pagination
   */
  async getDocuments(page = 1, limit = 20): Promise<{
    documents: Document[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await this.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    // Get documents with profiles and categories
    const { data, error } = await this.supabase
      .from('documents')
      .select(`
        *,
        profiles!created_by(full_name, email),
        categories(name, color)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching documents:', error);
      return { documents: [], total: 0, hasMore: false };
    }

    return {
      documents: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .select(`
        *,
        profiles!created_by(full_name, email),
        categories(name, color)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching document:', error);
      return null;
    }

    return data;
  }

  /**
   * Create new document
   */
  async createDocument(document: DocumentInsert): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .insert(document)
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return null;
    }

    return data;
  }

  /**
   * Update document
   */
  async updateDocument(id: string, updates: DocumentUpdate): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }

    return true;
  }



  /**
   * Search documents
   */
  async searchDocuments(query: string): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*, categories(name)')
      .textSearch('title', query, { type: 'websearch' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching documents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(categoryId: string): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*, categories(name)')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents by category:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(limit = 5): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent documents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get published documents only
   */
  async getPublishedDocuments(): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select(`
        *,
        profiles!created_by(full_name, email),
        categories(name, color)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching published documents:', error);
      return [];
    }

    return data || [];
  }
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export class CategoriesService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get categories by type
   */
  async getCategoriesByType(type: Category['type']): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching categories by type:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching category:', error);
      return null;
    }

    return data;
  }

  /**
   * Create new category
   */
  async createCategory(category: CategoryInsert): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return null;
    }

    return data;
  }

  /**
   * Update category
   */
  async updateCategory(id: string, updates: CategoryUpdate): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return false;
    }

    return true;
  }
}

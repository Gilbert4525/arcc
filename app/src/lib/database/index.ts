import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { ProfilesService } from './profiles';
import { DocumentsService } from './documents';
import { MeetingsService } from './meetings';
import { ResolutionsService } from './resolutions';
import { CategoriesService } from './categories';

export { ProfilesService, DocumentsService, MeetingsService, ResolutionsService, CategoriesService };

// Re-export database types for convenience
export type { Database } from '@/types/database';

/**
 * Factory function to get all database services
 * @param supabase - The Supabase client
 * @returns An object with all database services
 */
export function getDatabaseServices(supabase: SupabaseClient<Database>) {
  return {
    profiles: new ProfilesService(supabase),
    documents: new DocumentsService(supabase),
    meetings: new MeetingsService(supabase),
    resolutions: new ResolutionsService(supabase),
    categories: new CategoriesService(supabase),
  } as const;
}

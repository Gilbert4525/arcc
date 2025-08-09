// Client-safe database services (excludes server-only services like notifications)
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { ProfilesService } from './profiles';
import { DocumentsService } from './documents';
import { MeetingsService } from './meetings';
import { ResolutionsService } from './resolutions';
import { CategoriesService } from './categories';
import { MinutesService } from './minutes';

// Export client-safe services (excluding NotificationsService which uses server-only modules)
export { ProfilesService, DocumentsService, MeetingsService, ResolutionsService, CategoriesService, MinutesService };

// Re-export database types for convenience
export type { Database } from '@/types/database';

/**
 * Factory function to get client-safe database services
 * @param supabase - The Supabase client
 * @returns An object with client-safe database services
 */
export function getClientDatabaseServices(supabase: SupabaseClient<Database>) {
  return {
    profiles: new ProfilesService(supabase),
    documents: new DocumentsService(supabase),
    meetings: new MeetingsService(supabase),
    resolutions: new ResolutionsService(supabase),
    categories: new CategoriesService(supabase),
    minutes: new MinutesService(supabase),
  } as const;
}
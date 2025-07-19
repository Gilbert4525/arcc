'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthState, User } from '@/types/auth';

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          // Create profile if it doesn't exist (PGRST116 = not found)
          if (error.code === 'PGRST116') {
            // Double-check that we have a valid session before creating profile
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession?.user) {
              console.error('No valid session found, cannot create profile');
              setLoading(false);
              return;
            }
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: currentSession.user.id,
                email: currentSession.user.email || '',
                full_name: currentSession.user.user_metadata?.full_name || null,
                role: 'board_member' as const,
                is_active: true
              })
              .select()
              .single();
            
            if (createError) {
              console.error('Error creating profile:', createError);
              // If it's still an RLS error, log additional context
              if (createError.code === '42501') {
                console.error('RLS policy violation - user may not be properly authenticated');
              }
            } else if (newProfile) {
              setUser({
                id: newProfile.id,
                email: newProfile.email,
                full_name: newProfile.full_name || undefined,
                role: (newProfile.role as 'admin' | 'board_member') || 'board_member',
                avatar_url: newProfile.avatar_url || undefined,
                position: newProfile.position || undefined,
                phone: newProfile.phone || undefined,
                bio: newProfile.bio || undefined,
                is_active: newProfile.is_active || false,
                last_login: newProfile.last_login || undefined,
              });
            }
          }
        } else if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name || undefined,
            role: (profile.role as 'admin' | 'board_member') || 'board_member',
            avatar_url: profile.avatar_url || undefined,
            position: profile.position || undefined,
            phone: profile.phone || undefined,
            bio: profile.bio || undefined,
            is_active: profile.is_active || false,
            last_login: profile.last_login || undefined,
          });
        }
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user profile in auth change:', error);
            console.error('Auth change error details:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
            // Create profile if it doesn't exist (PGRST116 = not found)
            if (error.code === 'PGRST116' && session?.user) {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name: session.user.user_metadata?.full_name || null,
                  role: 'board_member' as const,
                  is_active: true
                })
                .select()
                .single();
              
              if (createError) {
                console.error('Error creating profile on auth change:', createError);
                // If it's still an RLS error, log additional context
                if (createError.code === '42501') {
                  console.error('RLS policy violation on auth change - user may not be properly authenticated');
                }
              } else if (newProfile) {
                setUser({
                  id: newProfile.id,
                  email: newProfile.email,
                  full_name: newProfile.full_name || undefined,
                  role: (newProfile.role as 'admin' | 'board_member') || 'board_member',
                  avatar_url: newProfile.avatar_url || undefined,
                  position: newProfile.position || undefined,
                  phone: newProfile.phone || undefined,
                  bio: newProfile.bio || undefined,
                  is_active: newProfile.is_active || false,
                  last_login: newProfile.last_login || undefined,
                });
              }
            }
          } else if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name || undefined,
              role: (profile.role as 'admin' | 'board_member') || 'board_member',
              avatar_url: profile.avatar_url || undefined,
              position: profile.position || undefined,
              phone: profile.phone || undefined,
              bio: profile.bio || undefined,
              is_active: profile.is_active || false,
              last_login: profile.last_login || undefined,
            });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

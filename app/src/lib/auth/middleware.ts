import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface AuthenticatedUser {
  user: any;
  profile: {
    id: string;
    role: 'admin' | 'board_member';
    full_name: string;
    email: string;
  };
}

export async function requireAuth(_request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
    }

    return { 
      user, 
      profile: {
        id: profile.id,
        role: profile.role as 'admin' | 'board_member',
        full_name: profile.full_name || '',
        email: profile.email || user.email || ''
      }
    };
  } catch (error) {
    console.error('Error in requireAuth:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  if (authResult.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  return authResult;
}

export async function requireBoardMember(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  if (!['admin', 'board_member'].includes(authResult.profile.role)) {
    return NextResponse.json({ error: 'Forbidden - Board member access required' }, { status: 403 });
  }

  return authResult;
}

// Rate limiting utility (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

// Input sanitization utility
export function sanitizeComment(input: string | null | undefined): string | null {
  if (!input) return null;

  // Convert to string and trim
  let sanitized = input.toString().trim();

  if (!sanitized) return null;

  // Length validation
  if (sanitized.length > 1000) {
    throw new Error('Comment too long. Maximum 1000 characters allowed.');
  }

  // Basic HTML/script tag removal for security
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized || null;
}
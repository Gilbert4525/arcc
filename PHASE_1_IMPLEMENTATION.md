# Phase 1: Foundation & Setup - Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing Phase 1 of the Arc Board Management System.

## Prerequisites
- Node.js 18+ installed
- Git installed
- Supabase account
- Code editor (VS Code recommended)

## Step 1: Project Initialization

### 1.1 Create Next.js Project
```bash
npx create-next-app@latest arc-board-management --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd arc-board-management
```

### 1.2 Install Additional Dependencies
```bash
# UI Components
npm install @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-button @radix-ui/react-card @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-form @radix-ui/react-icons @radix-ui/react-input @radix-ui/react-label @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-sheet @radix-ui/react-switch @radix-ui/react-table @radix-ui/react-tabs @radix-ui/react-textarea @radix-ui/react-toast

# Shadcn/ui
npx shadcn-ui@latest init

# Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react @supabase/auth-ui-react @supabase/auth-ui-shared

# Form handling and validation
npm install react-hook-form @hookform/resolvers zod

# Date handling
npm install date-fns

# Utilities
npm install clsx class-variance-authority lucide-react

# Development dependencies
npm install -D @types/node husky lint-staged prettier
```

### 1.3 Configure Shadcn/ui Components
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add navigation-menu
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
```

### 1.4 Set up Code Quality Tools

Create `.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "prefer-const": "error",
    "no-var": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false
}
```

Create `.husky/pre-commit`:
```bash
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Create `lint-staged.config.js`:
```javascript
module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
```

## Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down the project URL and anon key

### 2.2 Environment Configuration

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.3 Database Schema Implementation

In Supabase SQL Editor, run the database schema from `DATABASE_SCHEMA.md`:

1. Execute the table creation scripts
2. Set up RLS policies
3. Create indexes
4. Add triggers and functions
5. Insert seed data

### 2.4 Supabase Client Configuration

Create `src/lib/supabase/client.ts`:
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export const createClient = () => createClientComponentClient<Database>();
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export const createServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
};
```

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Database } from '@/types/database';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

## Step 3: Project Structure

### 3.1 Create Directory Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   └── admin/
│   ├── api/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/         # Shadcn components
│   ├── auth/
│   ├── layout/
│   └── common/
├── lib/
│   ├── supabase/
│   ├── utils.ts
│   └── validations/
├── hooks/
├── types/
└── constants/
```

### 3.2 Type Definitions

Create `src/types/database.ts`:
```typescript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'board_member';
          position: string | null;
          phone: string | null;
          bio: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'board_member';
          position?: string | null;
          phone?: string | null;
          bio?: string | null;
          is_active?: boolean;
          last_login?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'board_member';
          position?: string | null;
          phone?: string | null;
          bio?: string | null;
          is_active?: boolean;
          last_login?: string | null;
        };
      };
      // Add other table types...
    };
  };
};
```

Create `src/types/auth.ts`:
```typescript
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'board_member';
  avatar_url?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}
```

## Step 4: Authentication Implementation

### 4.1 Auth Context

Create `src/contexts/AuthContext.tsx`:
```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@/lib/supabase/client';
import { AuthState } from '@/types/auth';

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name || undefined,
            role: profile.role,
            avatar_url: profile.avatar_url || undefined,
          });
        }
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name || undefined,
              role: profile.role,
              avatar_url: profile.avatar_url || undefined,
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
```

### 4.2 Auth Components

Create `src/components/auth/LoginForm.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login to Arc Board Management</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 4.3 Layout Components

Create `src/components/layout/Header.tsx`:
```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user } = useAuth();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">Arc Board Management</h1>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.full_name || user.email}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} alt={user.full_name || ''} />
                      <AvatarFallback>
                        {user.full_name?.charAt(0) || user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem onClick={handleLogout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

### 4.4 Pages

Create `src/app/(auth)/login/page.tsx`:
```typescript
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm />
    </div>
  );
}
```

Create `src/app/(dashboard)/dashboard/page.tsx`:
```typescript
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Board Member Dashboard</h1>
      <p>Welcome to the Arc Board Management System!</p>
    </div>
  );
}
```

Create `src/app/(dashboard)/admin/page.tsx`:
```typescript
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <p>Welcome to the admin panel!</p>
    </div>
  );
}
```

### 4.5 Root Layout Update

Update `src/app/layout.tsx`:
```typescript
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Arc Board Management',
  description: 'Board management system for Arc Company',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Step 5: Testing and Validation

### 5.1 Test Authentication Flow
1. Start development server: `npm run dev`
2. Navigate to login page
3. Test login with created user
4. Verify redirection based on role
5. Test logout functionality

### 5.2 Validation Checklist
- [ ] Project builds without errors
- [ ] Database schema is properly implemented
- [ ] Authentication flow works correctly
- [ ] Role-based redirection functions
- [ ] UI components render properly
- [ ] TypeScript types are properly defined
- [ ] Environment variables are configured

## Next Steps
Once Phase 1 is complete, proceed to Phase 2: User Management & Authorization.

## Troubleshooting

### Common Issues
1. **Supabase connection errors**: Check environment variables
2. **Type errors**: Ensure database types are properly generated
3. **Auth redirect loops**: Verify middleware configuration
4. **Build errors**: Check all imports and dependencies

### Useful Commands
```bash
# Generate Supabase types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# Lint and format code
npm run lint
npm run lint:fix
npx prettier --write .

# Build for production
npm run build
```

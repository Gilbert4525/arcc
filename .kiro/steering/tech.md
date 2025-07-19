# Technology Stack & Development Guidelines

## Core Technologies

**Frontend Framework**
- Next.js 15.3.4 with App Router
- React 19 with TypeScript
- Tailwind CSS 4 for styling
- Shadcn/ui component library

**Backend & Database**
- Supabase (PostgreSQL + Auth + Storage + Real-time)
- Row Level Security (RLS) for data protection
- Server-side rendering with Next.js API routes

**Authentication & Authorization**
- Supabase Auth with email/password
- Role-based access control (admin/board_member)
- Middleware-based route protection

**Development Tools**
- TypeScript for type safety
- ESLint + Prettier for code quality
- Husky + lint-staged for pre-commit hooks
- Turbopack for fast development builds

## Build System & Commands

**Development**
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

**Code Quality**
- ESLint configuration with Next.js rules
- Prettier with 2-space indentation, single quotes
- Pre-commit hooks automatically format and lint code
- TypeScript strict mode enabled

## Architecture Patterns

**File Structure**
- App Router with route groups: `(auth)`, `(dashboard)`
- API routes in `src/app/api/`
- Reusable components in `src/components/`
- Database services in `src/lib/database/`
- Type definitions in `src/types/`

**Data Access Layer**
- Service classes for database operations (ProfilesService, DocumentsService, etc.)
- Consistent error handling and response formats
- Pagination support with `{ data, total, hasMore }` pattern

**Component Architecture**
- Shadcn/ui for base components
- Feature-specific components organized by domain
- Context providers for global state (AuthContext)
- Custom hooks for reusable logic

**Security Patterns**
- Server-side authentication checks
- RLS policies at database level
- Input validation with Zod schemas
- Audit logging for sensitive operations

## Environment Configuration

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Conventions

**Table Naming**
- Plural table names (profiles, documents, meetings)
- UUID primary keys with `gen_random_uuid()`
- Consistent timestamp fields (created_at, updated_at)

**API Response Format**
```typescript
// Success responses
{ data: T } | { items: T[], total: number, hasMore: boolean }

// Error responses  
{ error: string, status: number }
```

## Code Style Guidelines

- Use TypeScript interfaces for type definitions
- Prefer const assertions and strict typing
- Use async/await over Promise chains
- Implement proper error boundaries
- Follow Next.js 15 App Router patterns
- Use server components by default, client components when needed
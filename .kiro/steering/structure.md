# Project Structure & Organization

## Root Directory Structure

```
arc-board-management/
├── app/                    # Next.js application
├── supabase/              # Supabase configuration
├── .kiro/                 # Kiro IDE configuration
├── DATABASE_SCHEMA.md     # Database documentation
├── PHASE_1_IMPLEMENTATION.md
└── PROJECT_PLAN.md        # Overall project roadmap
```

## Application Structure (`app/`)

```
app/src/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Authentication route group
│   │   └── login/        # Login page
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── admin/        # Admin-only pages
│   │   └── dashboard/    # Board member pages
│   ├── api/              # API route handlers
│   │   ├── admin/        # Admin-specific endpoints
│   │   ├── categories/   # Category management
│   │   ├── documents/    # Document operations
│   │   ├── meetings/     # Meeting management
│   │   ├── profiles/     # User profile operations
│   │   └── resolutions/  # Resolution management
│   ├── auth/             # Auth-related pages
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # Reusable React components
│   ├── admin/           # Admin-specific components
│   ├── auth/            # Authentication components
│   ├── documents/       # Document management UI
│   ├── layout/          # Layout components
│   ├── meetings/        # Meeting management UI
│   ├── resolutions/     # Resolution management UI
│   └── ui/              # Shadcn/ui base components
├── contexts/            # React context providers
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
│   ├── database/        # Database service classes
│   ├── supabase/        # Supabase client configuration
│   ├── validations/     # Zod validation schemas
│   └── utils.ts         # Utility functions
└── types/               # TypeScript type definitions
```

## Key Architectural Decisions

**Route Organization**
- Route groups `(auth)` and `(dashboard)` for logical separation
- Middleware protection for authenticated routes
- Role-based redirects (admin → `/admin`, board_member → `/dashboard`)

**Component Organization**
- Domain-driven component structure (documents/, meetings/, etc.)
- Shared UI components in `components/ui/` (Shadcn/ui)
- Layout components separate from feature components

**Data Layer Architecture**
- Service classes in `lib/database/` for each domain
- Consistent API patterns across all endpoints
- Type-safe database operations with generated types

**State Management**
- React Context for global auth state
- Server state managed through API calls
- Local component state for UI interactions

## File Naming Conventions

**Components**
- PascalCase for component files: `UserManagement.tsx`
- Descriptive names indicating purpose: `DocumentUpload.tsx`

**API Routes**
- Lowercase with hyphens: `api/meeting-participants/`
- RESTful naming: GET/POST/PUT/DELETE operations

**Database Services**
- Singular domain names: `profiles.ts`, `documents.ts`
- Exported service classes: `ProfilesService`, `DocumentsService`

**Types**
- Descriptive interface names: `User`, `Document`, `Meeting`
- Database types in `types/database.ts`
- Feature-specific types co-located with components

## Configuration Files

**Development Setup**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS setup

**Code Quality**
- `eslint.config.mjs` - ESLint rules
- `.prettierrc` - Code formatting
- `lint-staged.config.js` - Pre-commit hooks

**Database**
- `database-setup.sql` - Complete schema setup
- `BACKEND_GUIDE.md` - API documentation

## Development Workflow

**Adding New Features**
1. Create database service in `lib/database/`
2. Add API routes in `app/api/`
3. Create UI components in appropriate domain folder
4. Add pages in `app/` directory
5. Update types in `types/` if needed

**Component Development**
- Start with Shadcn/ui base components
- Create feature-specific components
- Use TypeScript interfaces for props
- Implement proper error handling

**Database Changes**
- Update schema in Supabase dashboard
- Regenerate types: `supabase gen types typescript`
- Update service classes and API routes
- Test with proper RLS policies
# Deployment Guide

## Pre-Deployment Checklist ✅

### 1. Database Setup
- [ ] Run `fix-trigger-function.sql` in Supabase SQL Editor to fix voting system
- [ ] Ensure all database tables are created (minutes, minutes_votes, notifications, etc.)
- [ ] Verify RLS policies are active

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Build and Deploy

#### For Vercel:
```bash
npm run build
vercel --prod
```

#### For Other Platforms:
```bash
npm run build
npm start
```

## Important SQL Scripts to Run

### 1. Fix Voting System (CRITICAL)
Run `fix-trigger-function.sql` in Supabase SQL Editor to fix vote counting issues.

### 2. Fix Status Values
Run `fix-minutes-status-values.sql` to ensure consistent status values.

## Features Ready for Production

✅ **Working Features:**
- User authentication and authorization
- Document management
- Meeting management  
- Minutes creation and voting (after SQL fix)
- Admin comment viewing (after SQL fix)
- Notification system
- Real-time updates
- Responsive design

⚠️ **Known Issues (Non-blocking):**
- Some TypeScript warnings in development (don't affect production)
- Windows build permission issues (platform-specific)

## Post-Deployment Verification

1. **Test user login/registration**
2. **Create and publish minutes for voting**
3. **Test voting functionality**
4. **Verify admin can see comments**
5. **Test document upload/download**
6. **Check notification system**

## Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Verify environment variables are set correctly
3. Ensure SQL scripts have been run
4. Check browser console for client-side errors
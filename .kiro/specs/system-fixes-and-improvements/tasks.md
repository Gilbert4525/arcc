# Implementation Plan - Critical Fixes Only

## Phase 1: Fix Broken API Routes (CRITICAL - Must Fix First)

- [x] 1. Fix Static Method Calls in API Routes



  - Fix DocumentsService static method calls in `/api/documents/route.ts`
  - Fix MeetingsService static method calls in `/api/meetings/route.ts` 
  - Fix ResolutionsService static method calls in `/api/resolutions/route.ts`
  - Fix CategoriesService static method calls in `/api/categories/route.ts`
  - Fix ProfilesService static method calls in `/api/profiles/route.ts`
  - _Requirements: 1.1, 1.4_

- [x] 1.1 Fix Documents API Route


  - Replace `DocumentsService.searchDocuments()` with service instance call
  - Replace `DocumentsService.getDocumentsByCategory()` with service instance call
  - Replace `DocumentsService.getPublishedDocuments()` with service instance call
  - Replace `DocumentsService.getDocuments()` with service instance call
  - Replace `DocumentsService.createDocument()` with service instance call
  - _Requirements: 1.1, 3.3_



- [ ] 1.2 Fix Meetings API Route


  - Replace `MeetingsService.getTodaysMeetings()` with service instance call
  - Replace `MeetingsService.getUpcomingMeetings()` with service instance call
  - Replace `MeetingsService.getMeetingsByStatus()` with service instance call
  - Replace `MeetingsService.getMeetingsByType()` with service instance call
  - Replace `MeetingsService.createMeeting()` with service instance call


  - _Requirements: 1.1, 5.1_

- [ ] 1.3 Fix Resolutions API Route
  - Replace `ResolutionsService.getResolutionStats()` with service instance call
  - Replace `ResolutionsService.getActiveVotingResolutions()` with service instance call
  - Replace `ResolutionsService.getResolutionsByStatus()` with service instance call
  - Replace `ResolutionsService.createResolution()` with service instance call
  - _Requirements: 1.1, 7.1_

## Phase 2: Add Missing Service Methods

- [ ] 2. Add Missing Methods to DocumentsService
  - Add `getPublishedDocuments()` method to DocumentsService
  - Add `publishDocument(id)` method to DocumentsService
  - Add `incrementViewCount(id)` method to DocumentsService
  - Add `incrementDownloadCount(id)` method to DocumentsService
  - _Requirements: 3.3, 4.2, 4.5_

- [ ] 2.1 Add Missing Methods to MeetingsService
  - Add `getTodaysMeetings()` method to MeetingsService
  - Add `getMeetingsByStatus(status)` method to MeetingsService
  - Add `getMeetingsByType(type)` method to MeetingsService
  - _Requirements: 5.1, 6.1_

## Phase 3: Fix Broken Navigation Links

- [ ] 3. Create Missing Pages for Broken Links
  - Create `/dashboard/documents/page.tsx` (already exists, verify it works)
  - Create `/dashboard/documents/upload/page.tsx` (already exists, verify it works)
  - Create `/dashboard/meetings/page.tsx` (already exists, verify it works)
  - Create `/dashboard/categories/page.tsx` (already exists, verify it works)
  - Create `/dashboard/resolutions/page.tsx` (already exists, verify it works)
  - Create `/admin/users/page.tsx` (already exists, verify it works)
  - _Requirements: 10.1_

- [ ] 3.1 Fix Admin Dashboard Navigation Links
  - Update admin dashboard links to point to correct existing pages
  - Ensure all navigation buttons work properly
  - Test all admin dashboard quick action buttons
  - _Requirements: 10.1_

## Phase 4: Complete Missing UI Components

- [ ] 4. Complete DocumentUpload Component
  - Implement actual file upload functionality in DocumentUpload component
  - Add drag-and-drop file upload interface
  - Add file validation and progress tracking
  - Connect to Supabase Storage for file uploads
  - _Requirements: 3.1, 3.6, 3.7_



- [x] 4.1 Complete DocumentManagement Component



  - Implement document list with real data from API
  - Add document search and filtering functionality
  - Add document publish/unpublish actions
  - Add document delete functionality
  - _Requirements: 3.3, 3.5, 4.1_

- [ ] 4.2 Complete MeetingManagement Component
  - Implement meeting creation form
  - Add meeting list with real data from API
  - Add meeting editing and deletion
  - Add participant management interface
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4.3 Complete ResolutionManagement Component
  - Implement resolution creation form
  - Add resolution list with real data from API
  - Add voting interface for board members
  - Add resolution status management
  - _Requirements: 7.1, 7.2, 8.1_

- [ ] 4.4 Complete UserManagement Component
  - Implement user list with real data from API
  - Add user role management interface
  - Add user activation/deactivation
  - Add user invitation functionality
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 4.5 Complete CategoryManagement Component
  - Implement category list with real data from API
  - Add category creation and editing forms
  - Add category deletion functionality
  - Add category usage statistics
  - _Requirements: Category management requirements_

## Phase 5: Fix Dashboard Data Issues

- [ ] 5. Fix Dashboard Static Data
  - Replace hardcoded statistics in admin dashboard with real API data
  - Replace hardcoded statistics in board member dashboard with real API data
  - Fix "Recent Activity" section to show real activity data
  - Connect dashboard cards to actual database queries
  - _Requirements: 12.1, 12.2_

- [ ] 5.1 Fix Admin Dashboard Statistics
  - Connect user count to real ProfilesService data
  - Connect document count to real DocumentsService data
  - Connect meeting count to real MeetingsService data
  - Connect resolution count to real ResolutionsService data
  - _Requirements: 12.1_

- [ ] 5.2 Fix Board Member Dashboard Statistics
  - Connect recent documents to real DocumentsService data
  - Connect upcoming meetings to real MeetingsService data
  - Connect pending votes to real ResolutionsService data
  - Connect notifications to real notification data
  - _Requirements: 12.1_

## Phase 6: Add Essential Missing Features

- [ ] 6. Implement File Upload System
  - Create FileUploadService for handling file uploads to Supabase Storage
  - Add secure file download URLs with time limits
  - Implement file type validation and size restrictions
  - Add upload progress tracking
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 6.1 Create File Upload API Route
  - Create `/api/documents/upload` endpoint for file uploads
  - Add file validation and security checks
  - Connect to Supabase Storage buckets
  - Return secure file URLs and metadata
  - _Requirements: 3.1, 3.7_

- [ ] 7. Add Basic Voting System
  - Create voting interface in ResolutionManagement component
  - Add vote submission API endpoint
  - Implement vote counting and quorum tracking
  - Add voting results display
  - _Requirements: 7.3, 8.2, 8.3, 8.4_

- [ ] 7.1 Create Voting API Routes
  - Create `/api/resolutions/[id]/vote` endpoint (already exists, verify it works)
  - Add vote validation and security checks
  - Implement one-vote-per-user restriction
  - Add voting deadline enforcement
  - _Requirements: 7.3, 8.2_

## Phase 7: Essential Error Handling & UX

- [x] 8. Add Basic Error Handling



  - Add error boundaries to main dashboard components
  - Implement loading states for all async operations
  - Add toast notifications for user actions
  - Create user-friendly error messages
  - _Requirements: 10.3, 13.1, 13.3_

- [ ] 8.1 Create Loading Components
  - Create LoadingSpinner component for async operations
  - Add loading states to all data-fetching components
  - Implement skeleton loading for lists and cards
  - _Requirements: 10.3_

- [ ] 8.2 Add Toast Notifications
  - Implement toast notifications for successful actions
  - Add error toast notifications for failed operations
  - Create confirmation dialogs for destructive actions
  - _Requirements: 13.3, 13.4_
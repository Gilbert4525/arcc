# 🏗️ Arc Board Management - Backend Guide

This guide explains your complete backend setup in simple terms.

## 📋 What You Have Now

### 🗃️ **1. Database (Supabase)**
Your application uses **Supabase** as the backend database. Think of it as a powerful cloud database that handles:
- ✅ User authentication
- ✅ Data storage 
- ✅ File storage
- ✅ Real-time features
- ✅ Security (Row Level Security)

**Tables Created:**
- `profiles` - User information and roles
- `categories` - Organization categories for documents/meetings/resolutions
- `documents` - File management and metadata
- `meetings` - Meeting scheduling and management
- `resolutions` - Board resolutions and voting
- `resolution_votes` - Individual votes on resolutions

### 🔧 **2. Data Access Layer (`src/lib/database/`)**
These are TypeScript classes that provide safe, organized ways to interact with your database:

#### **ProfilesService** (`profiles.ts`)
- `getProfile(id)` - Get user profile
- `getAllProfiles()` - Get all users (admin only)
- `updateProfile(id, data)` - Update user profile
- `getProfilesByRole(role)` - Get users by role (admin/board_member)

#### **DocumentsService** (`documents.ts`)
- `getDocuments(page, limit)` - Get documents with pagination
- `createDocument(data)` - Upload new document
- `searchDocuments(query)` - Search documents
- `publishDocument(id)` - Make document public
- `incrementViewCount(id)` - Track document views

#### **MeetingsService** (`meetings.ts`)
- `getMeetings(page, limit)` - Get meetings with pagination
- `createMeeting(data)` - Schedule new meeting
- `getUpcomingMeetings()` - Get future meetings
- `getTodaysMeetings()` - Get today's meetings
- `updateMeetingStatus(id, status)` - Change meeting status

#### **ResolutionsService** (`resolutions.ts`)
- `getResolutions(page, limit)` - Get resolutions with pagination
- `createResolution(data)` - Create new resolution
- `castVote(voteData)` - Vote on resolution
- `getActiveVotingResolutions()` - Get resolutions open for voting
- `checkResolutionQuorum(id)` - Check if enough votes

#### **CategoriesService** (`categories.ts`)
- `getCategories()` - Get all categories
- `getCategoriesByType(type)` - Get categories by type
- `createCategory(data)` - Create new category

### 🌐 **3. API Routes (`src/app/api/`)**
These are HTTP endpoints that your frontend can call:

#### **`/api/profiles`**
- `GET` - Get all profiles (admin only)
- `POST` - Create/update profile

#### **`/api/documents`**
- `GET` - Get documents (with filtering)
  - `?page=1&limit=20` - Pagination
  - `?search=query` - Search documents
  - `?categoryId=id` - Filter by category
  - `?published=true` - Only published documents
- `POST` - Create new document

#### **`/api/meetings`**
- `GET` - Get meetings (with filtering)
  - `?page=1&limit=20` - Pagination
  - `?status=scheduled` - Filter by status
  - `?upcoming=true` - Only upcoming meetings
  - `?today=true` - Only today's meetings
- `POST` - Create new meeting

#### **`/api/resolutions`**
- `GET` - Get resolutions (with filtering)
  - `?page=1&limit=20` - Pagination
  - `?status=voting` - Filter by status
  - `?voting=true` - Only active voting
  - `?stats=true` - Get statistics
- `POST` - Create new resolution

#### **`/api/resolutions/[id]/vote`**
- `POST` - Cast vote on resolution
- `GET` - Get user's vote on resolution

#### **`/api/categories`**
- `GET` - Get categories
  - `?type=document` - Filter by type
  - `?stats=true` - Get usage statistics
- `POST` - Create new category

## 🔐 **Security Features**

### **Authentication**
Every API call checks if the user is logged in using Supabase auth.

### **Authorization**
- Regular users can only access their own data
- Admins can access all data
- Voting is restricted to active board members

### **Row Level Security (RLS)**
Database-level security that automatically filters data based on user permissions.

## 📡 **How to Use Your API**

### **Example: Get Documents**
```javascript
// Frontend code
const response = await fetch('/api/documents?page=1&limit=10');
const { documents, total, hasMore } = await response.json();
```

### **Example: Create Meeting**
```javascript
// Frontend code
const meetingData = {
  title: 'Board Meeting',
  description: 'Monthly board meeting',
  meeting_date: '2024-01-15T10:00:00Z',
  location: 'Conference Room A'
};

const response = await fetch('/api/meetings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(meetingData)
});

const { meeting } = await response.json();
```

### **Example: Vote on Resolution**
```javascript
// Frontend code
const voteData = {
  vote: 'for', // 'for', 'against', or 'abstain'
  vote_reason: 'I support this proposal'
};

const response = await fetch(`/api/resolutions/${resolutionId}/vote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(voteData)
});

const { vote, quorum } = await response.json();
```

## 🔄 **Data Flow**

1. **Frontend** makes HTTP request to API route
2. **API Route** authenticates user
3. **API Route** calls **Database Service**
4. **Database Service** interacts with **Supabase**
5. **Supabase** returns data
6. **API Route** sends response to **Frontend**

## 🧪 **Testing Your Backend**

Run the test script to verify everything works:
```bash
node scripts/test-backend.js
```

## 🚀 **Next Steps**

Your backend is now complete! You can:

1. **Connect your frontend** - Use the API routes in your React components
2. **Add file upload** - Implement document upload functionality
3. **Add real-time features** - Use Supabase subscriptions for live updates
4. **Add email notifications** - Notify users about meetings and votes
5. **Add mobile app** - Use the same API for mobile applications

## 🆘 **Common Patterns**

### **Error Handling**
All API routes return consistent error responses:
```javascript
{ error: 'Error message', status: 400 }
```

### **Pagination**
Lists return pagination information:
```javascript
{
  documents: [...],
  total: 50,
  hasMore: true
}
```

### **Success Responses**
Successful operations return the created/updated data:
```javascript
{ document: { id: '...', title: '...', ... } }
```

---

**Congratulations! You now have a complete, production-ready backend! 🎉**

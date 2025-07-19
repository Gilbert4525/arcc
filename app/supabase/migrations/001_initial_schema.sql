-- Initial Database Schema for Arc Board Management System
-- This creates all the tables needed for your application

-- Enable Row Level Security (RLS) for all tables
-- This ensures users can only access data they're authorized to see

-- 1. PROFILES TABLE
-- Stores user information and roles
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('admin', 'board_member')) DEFAULT 'board_member',
    position TEXT,
    phone TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
-- Stores categories for documents, meetings, and resolutions
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('document', 'meeting', 'resolution')) NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCUMENTS TABLE
-- Stores document metadata and file information
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES public.documents(id),
    tags TEXT[],
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    upload_progress INTEGER DEFAULT 100,
    checksum TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEETINGS TABLE
-- Stores meeting information and scheduling
CREATE TABLE public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    meeting_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    meeting_type TEXT CHECK (meeting_type IN ('board_meeting', 'committee_meeting', 'special_meeting')) DEFAULT 'board_meeting',
    category_id UUID REFERENCES public.categories(id),
    status TEXT CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
    agenda JSONB,
    meeting_link TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    notification_sent BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RESOLUTIONS TABLE
-- Stores board resolutions and voting information
CREATE TABLE public.resolutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    resolution_number TEXT UNIQUE NOT NULL,
    resolution_type TEXT CHECK (resolution_type IN ('board_resolution', 'committee_resolution', 'special_resolution')) DEFAULT 'board_resolution',
    category_id UUID REFERENCES public.categories(id),
    status TEXT CHECK (status IN ('draft', 'under_review', 'voting', 'approved', 'rejected', 'withdrawn')) DEFAULT 'draft',
    content TEXT NOT NULL,
    voting_deadline TIMESTAMPTZ,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    total_eligible_voters INTEGER DEFAULT 0,
    is_unanimous BOOLEAN DEFAULT false,
    requires_majority BOOLEAN DEFAULT true,
    minimum_quorum INTEGER DEFAULT 50,
    attachments JSONB,
    tags TEXT[],
    meeting_id UUID REFERENCES public.meetings(id),
    passed_at TIMESTAMPTZ,
    effective_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RESOLUTION VOTES TABLE
-- Stores individual votes on resolutions
CREATE TABLE public.resolution_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resolution_id UUID REFERENCES public.resolutions(id) ON DELETE CASCADE NOT NULL,
    voter_id UUID REFERENCES public.profiles(id) NOT NULL,
    vote TEXT CHECK (vote IN ('for', 'against', 'abstain')) NOT NULL,
    vote_reason TEXT,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resolution_id, voter_id) -- Prevent duplicate votes
);

-- CREATE INDEXES for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_categories_type ON public.categories(type);
CREATE INDEX idx_documents_category ON public.documents(category_id);
CREATE INDEX idx_documents_created_by ON public.documents(created_by);
CREATE INDEX idx_meetings_date ON public.meetings(meeting_date);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_resolutions_status ON public.resolutions(status);
CREATE INDEX idx_resolutions_meeting ON public.resolutions(meeting_id);
CREATE INDEX idx_resolution_votes_resolution ON public.resolution_votes(resolution_id);

-- CREATE FUNCTIONS for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGERS for updated_at timestamps
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_resolutions_updated_at
    BEFORE UPDATE ON public.resolutions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_resolution_votes_updated_at
    BEFORE UPDATE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_votes ENABLE ROW LEVEL SECURITY;

-- BASIC RLS POLICIES (you can customize these later)
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow all authenticated users to read categories
CREATE POLICY "Authenticated users can view categories" ON public.categories
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to read documents
CREATE POLICY "Authenticated users can view documents" ON public.documents
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to read meetings
CREATE POLICY "Authenticated users can view meetings" ON public.meetings
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to read resolutions
CREATE POLICY "Authenticated users can view resolutions" ON public.resolutions
    FOR SELECT TO authenticated USING (true);

-- Allow users to view resolution votes
CREATE POLICY "Authenticated users can view resolution votes" ON public.resolution_votes
    FOR SELECT TO authenticated USING (true);

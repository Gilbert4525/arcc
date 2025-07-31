-- Arc Board Management System - Database Schema Setup
-- Run this in your Supabase SQL Editor

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'board_member' CHECK (role IN ('admin', 'board_member')),
    position TEXT, -- Board position/title
    phone TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('document', 'meeting', 'resolution', 'minutes')),
    color TEXT DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
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
    parent_document_id UUID REFERENCES public.documents(id), -- For versioning
    tags TEXT[], -- Array of tags
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    upload_progress INTEGER DEFAULT 100,
    checksum TEXT, -- For file integrity
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    meeting_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    meeting_type TEXT DEFAULT 'board_meeting' CHECK (meeting_type IN ('board_meeting', 'committee_meeting', 'special_meeting')),
    category_id UUID REFERENCES public.categories(id),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    agenda JSONB, -- Structured agenda data
    meeting_link TEXT, -- Virtual meeting link
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- Recurrence settings
    notification_sent BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meeting participants table
CREATE TABLE public.meeting_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'attendee' CHECK (role IN ('organizer', 'attendee', 'optional')),
    attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'accepted', 'declined', 'attended', 'absent')),
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

-- Create resolutions table
CREATE TABLE public.resolutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    resolution_number TEXT UNIQUE,
    category_id UUID REFERENCES public.categories(id),
    meeting_id UUID REFERENCES public.meetings(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'published', 'voting', 'archived')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    effective_date DATE,
    expiry_date DATE,
    voting_enabled BOOLEAN DEFAULT false,
    voting_deadline TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    parent_resolution_id UUID REFERENCES public.resolutions(id),
    tags TEXT[],
    metadata JSONB, -- Additional structured data
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    reviewed_by UUID REFERENCES public.profiles(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create minutes table
CREATE TABLE public.minutes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_id UUID REFERENCES public.meetings(id), -- Optional link to meeting
    content TEXT NOT NULL, -- Full meeting notes/content
    key_decisions JSONB, -- Array of key decisions made
    action_items JSONB, -- Array of action items
    category_id UUID REFERENCES public.categories(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'voting', 'passed', 'failed', 'cancelled')),
    voting_deadline TIMESTAMPTZ,
    total_eligible_voters INTEGER DEFAULT 0,
    requires_majority BOOLEAN DEFAULT true,
    minimum_quorum INTEGER DEFAULT 50, -- Percentage
    approval_threshold INTEGER DEFAULT 75, -- 75% as requested
    
    -- Voting results
    total_votes INTEGER DEFAULT 0,
    approve_votes INTEGER DEFAULT 0,
    reject_votes INTEGER DEFAULT 0,
    abstain_votes INTEGER DEFAULT 0,
    
    -- Metadata
    attachments JSONB, -- Array of attached documents
    tags TEXT[], -- Array of tags
    notes TEXT, -- Additional notes
    
    -- Audit fields
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create minutes_votes table for tracking individual votes
CREATE TABLE public.minutes_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    minutes_id UUID REFERENCES public.minutes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
    comments TEXT, -- Optional comments with the vote
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(minutes_id, user_id) -- One vote per user per minutes
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    type TEXT NOT NULL CHECK (type IN ('meeting_invite', 'document_upload', 'resolution_published', 'system_update', 'reminder')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    is_email_sent BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    metadata JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, VIEW, DOWNLOAD, etc.
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_documents_published ON documents(is_published, created_at DESC);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

CREATE INDEX idx_meetings_date ON meetings(meeting_date);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_created_by ON meetings(created_by);

CREATE INDEX idx_resolutions_status ON resolutions(status);
CREATE INDEX idx_resolutions_meeting ON resolutions(meeting_id);
CREATE INDEX idx_resolutions_tags ON resolutions USING GIN(tags);

CREATE INDEX idx_minutes_status ON minutes(status);
CREATE INDEX idx_minutes_meeting_date ON minutes(meeting_date);
CREATE INDEX idx_minutes_created_by ON minutes(created_by);
CREATE INDEX idx_minutes_voting_deadline ON minutes(voting_deadline);
CREATE INDEX idx_minutes_votes_minutes_id ON minutes_votes(minutes_id);
CREATE INDEX idx_minutes_votes_user_id ON minutes_votes(user_id);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;

CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- Functions
-- Update timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.resolutions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.minutes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes_votes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Documents policies
CREATE POLICY "Published documents viewable by board members" ON public.documents
    FOR SELECT USING (
        is_published = true OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage documents" ON public.documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Meetings policies
CREATE POLICY "Meeting access policy" ON public.meetings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        EXISTS (
            SELECT 1 FROM public.meeting_participants 
            WHERE meeting_id = meetings.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage meetings" ON public.meetings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Categories policies
CREATE POLICY "Categories viewable by authenticated users" ON public.categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "Admins can manage notifications" ON public.notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Resolutions policies
CREATE POLICY "Board members can view published and voting resolutions" ON public.resolutions
    FOR SELECT USING (
        status IN ('published', 'voting', 'under_review') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage resolutions" ON public.resolutions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Minutes policies
CREATE POLICY "Minutes are viewable by authenticated users" ON public.minutes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert minutes" ON public.minutes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update minutes" ON public.minutes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete minutes" ON public.minutes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Minutes votes policies
CREATE POLICY "Minutes votes are viewable by authenticated users" ON public.minutes_votes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Board members can insert their own votes" ON public.minutes_votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'board_member')
        )
    );

CREATE POLICY "Users can update their own votes" ON public.minutes_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.minutes_votes
    FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can view documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Admins can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert seed data
INSERT INTO public.categories (name, description, type, color) VALUES
('Financial Reports', 'Annual and quarterly financial reports', 'document', '#10B981'),
('Legal Documents', 'Contracts, agreements, and legal documents', 'document', '#3B82F6'),
('Board Minutes', 'Meeting minutes and recordings', 'document', '#8B5CF6'),
('Regular Board Meeting', 'Monthly board meetings', 'meeting', '#EF4444'),
('Committee Meeting', 'Various committee meetings', 'meeting', '#F59E0B'),
('Policy Resolutions', 'Company policy decisions', 'resolution', '#06B6D4'),
('Financial Resolutions', 'Budget and financial decisions', 'resolution', '#10B981'),
('Meeting Minutes', 'Meeting minutes and voting', 'minutes', '#8B5CF6');

-- Function to update minutes voting results
CREATE OR REPLACE FUNCTION update_minutes_voting_results()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the minutes table with current vote counts
    UPDATE public.minutes 
    SET 
        total_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id)
        ),
        approve_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id) 
            AND vote = 'approve'
        ),
        reject_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id) 
            AND vote = 'reject'
        ),
        abstain_votes = (
            SELECT COUNT(*) 
            FROM public.minutes_votes 
            WHERE minutes_id = COALESCE(NEW.minutes_id, OLD.minutes_id) 
            AND vote = 'abstain'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.minutes_id, OLD.minutes_id);
    
    -- Check if voting should be automatically closed and status updated
    UPDATE public.minutes 
    SET 
        status = CASE 
            WHEN (approve_votes::FLOAT / NULLIF(total_votes, 0) * 100) >= approval_threshold 
                 AND total_votes >= (total_eligible_voters * minimum_quorum / 100) 
            THEN 'passed'
            WHEN voting_deadline < NOW() 
            THEN CASE 
                WHEN (approve_votes::FLOAT / NULLIF(total_votes, 0) * 100) >= approval_threshold 
                     AND total_votes >= (total_eligible_voters * minimum_quorum / 100) 
                THEN 'passed'
                ELSE 'failed'
            END
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.minutes_id, OLD.minutes_id)
    AND status = 'voting';
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set total_eligible_voters when publishing
CREATE OR REPLACE FUNCTION set_minutes_eligible_voters()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'voting', set total_eligible_voters to current board member count
    IF NEW.status = 'voting' AND OLD.status != 'voting' THEN
        NEW.total_eligible_voters = (
            SELECT COUNT(*) 
            FROM public.profiles 
            WHERE role = 'board_member' AND is_active = true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update voting results
CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();

-- Create trigger for setting eligible voters
CREATE TRIGGER trigger_set_minutes_eligible_voters
    BEFORE UPDATE ON public.minutes
    FOR EACH ROW
    EXECUTE FUNCTION set_minutes_eligible_voters();

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

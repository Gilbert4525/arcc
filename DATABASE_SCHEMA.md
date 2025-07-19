# Arc Board Management System - Database Schema

## Overview
This document outlines the database schema for the Arc Board Management System using Supabase (PostgreSQL).

## Core Tables

### 1. Users (Supabase Auth + Custom Profile)
```sql
-- Extends Supabase auth.users
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
```

### 2. Categories
```sql
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('document', 'meeting', 'resolution')),
    color TEXT DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Documents
```sql
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
```

### 4. Meetings
```sql
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
```

### 5. Meeting Participants
```sql
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
```

### 6. Meeting Documents
```sql
CREATE TABLE public.meeting_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    document_type TEXT DEFAULT 'agenda' CHECK (document_type IN ('agenda', 'material', 'minutes', 'presentation')),
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, document_id)
);
```

### 7. Resolutions
```sql
CREATE TABLE public.resolutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    resolution_number TEXT UNIQUE,
    category_id UUID REFERENCES public.categories(id),
    meeting_id UUID REFERENCES public.meetings(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'published', 'archived')),
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
```

### 8. Resolution Votes
```sql
CREATE TABLE public.resolution_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resolution_id UUID REFERENCES public.resolutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
    comments TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resolution_id, user_id)
);
```

### 9. Notifications
```sql
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
```

### 10. Audit Logs
```sql
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
```

### 11. Settings
```sql
CREATE TABLE public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Whether setting is visible to non-admins
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12. Activity Logs
```sql
CREATE TABLE public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    entity_type TEXT, -- document, meeting, resolution, etc.
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Views

### 1. Document Analytics View
```sql
CREATE OR REPLACE VIEW public.document_analytics AS
SELECT 
    d.id,
    d.title,
    d.file_type,
    d.view_count,
    d.download_count,
    d.created_at,
    p.full_name as created_by_name,
    c.name as category_name
FROM documents d
LEFT JOIN profiles p ON d.created_by = p.id
LEFT JOIN categories c ON d.category_id = c.id
WHERE d.is_published = true;
```

### 2. Meeting Summary View
```sql
CREATE OR REPLACE VIEW public.meeting_summary AS
SELECT 
    m.id,
    m.title,
    m.meeting_date,
    m.status,
    m.created_by,
    p.full_name as organizer_name,
    COUNT(mp.user_id) as participant_count,
    COUNT(CASE WHEN mp.attendance_status = 'attended' THEN 1 END) as attended_count
FROM meetings m
LEFT JOIN profiles p ON m.created_by = p.id
LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
GROUP BY m.id, m.title, m.meeting_date, m.status, m.created_by, p.full_name;
```

## Indexes

```sql
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

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;

CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

CREATE INDEX idx_activity_logs_user_time ON activity_logs(user_id, created_at DESC);
```

## Row Level Security (RLS) Policies

### Profiles
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles but only update their own
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
```

### Documents
```sql
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Board members can only view published documents
CREATE POLICY "Published documents viewable by board members" ON public.documents
    FOR SELECT USING (
        is_published = true OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert/update/delete documents
CREATE POLICY "Admins can manage documents" ON public.documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

### Meetings
```sql
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Users can view meetings they're invited to or all if admin
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

-- Only admins can manage meetings
CREATE POLICY "Admins can manage meetings" ON public.meetings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

## Functions

### 1. Update Timestamp Function
```sql
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
```

### 2. Document View Counter
```sql
CREATE OR REPLACE FUNCTION public.increment_document_views(document_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.documents 
    SET view_count = view_count + 1 
    WHERE id = document_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Create Audit Log Function
```sql
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_meetings AFTER INSERT OR UPDATE OR DELETE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_resolutions AFTER INSERT OR UPDATE OR DELETE ON public.resolutions
    FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();
```

## Storage Buckets

### Document Storage
```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create policy for document access
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
```

## Seed Data

```sql
-- Insert default categories
INSERT INTO public.categories (name, description, type, color) VALUES
('Financial Reports', 'Annual and quarterly financial reports', 'document', '#10B981'),
('Legal Documents', 'Contracts, agreements, and legal documents', 'document', '#3B82F6'),
('Board Minutes', 'Meeting minutes and recordings', 'document', '#8B5CF6'),
('Regular Board Meeting', 'Monthly board meetings', 'meeting', '#EF4444'),
('Committee Meeting', 'Various committee meetings', 'meeting', '#F59E0B'),
('Policy Resolutions', 'Company policy decisions', 'resolution', '#06B6D4'),
('Financial Resolutions', 'Budget and financial decisions', 'resolution', '#10B981');

-- Insert default settings
INSERT INTO public.settings (key, value, description, is_public) VALUES
('app_name', '"Arc Board Management"', 'Application name', true),
('meeting_reminder_days', '3', 'Days before meeting to send reminders', false),
('max_file_size_mb', '100', 'Maximum file upload size in MB', false),
('allowed_file_types', '["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]', 'Allowed file types for upload', false);
```

This schema provides a robust foundation for the Arc Board Management System with proper security, audit trails, and performance optimizations.

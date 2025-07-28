-- Minutes Management System - Database Schema
-- Run this in your Supabase SQL Editor

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

-- Create indexes for better performance
CREATE INDEX idx_minutes_status ON public.minutes(status);
CREATE INDEX idx_minutes_meeting_date ON public.minutes(meeting_date);
CREATE INDEX idx_minutes_created_by ON public.minutes(created_by);
CREATE INDEX idx_minutes_voting_deadline ON public.minutes(voting_deadline);
CREATE INDEX idx_minutes_votes_minutes_id ON public.minutes_votes(minutes_id);
CREATE INDEX idx_minutes_votes_user_id ON public.minutes_votes(user_id);

-- Create function to update minutes voting results
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
            THEN 'approved'
            WHEN voting_deadline < NOW() 
            THEN CASE 
                WHEN (approve_votes::FLOAT / NULLIF(total_votes, 0) * 100) >= approval_threshold 
                     AND total_votes >= (total_eligible_voters * minimum_quorum / 100) 
                THEN 'approved'
                ELSE 'rejected'
            END
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.minutes_id, OLD.minutes_id)
    AND status = 'voting';
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update voting results
CREATE TRIGGER trigger_update_minutes_voting_results
    AFTER INSERT OR UPDATE OR DELETE ON public.minutes_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_minutes_voting_results();

-- Create function to automatically set total_eligible_voters when publishing
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

-- Create trigger for setting eligible voters
CREATE TRIGGER trigger_set_minutes_eligible_voters
    BEFORE UPDATE ON public.minutes
    FOR EACH ROW
    EXECUTE FUNCTION set_minutes_eligible_voters();

-- Enable Row Level Security (RLS)
ALTER TABLE public.minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for minutes table
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

-- RLS Policies for minutes_votes table
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

-- Add minutes category if it doesn't exist
INSERT INTO public.categories (name, description, type, color) 
VALUES ('Meeting Minutes', 'Meeting minutes and voting', 'minutes', '#8B5CF6')
ON CONFLICT DO NOTHING;
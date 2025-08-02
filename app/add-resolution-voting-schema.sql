-- Resolution Voting Schema Enhancement
-- This script adds voting functionality to the resolutions system

-- First, ensure the resolutions table has the necessary voting columns
-- (These should already exist from the initial migration, but adding them here for completeness)

-- Add voting-related columns to resolutions table if they don't exist
DO $$ 
BEGIN
    -- Add votes_for column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'votes_for') THEN
        ALTER TABLE public.resolutions ADD COLUMN votes_for INTEGER DEFAULT 0;
    END IF;
    
    -- Add votes_against column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'votes_against') THEN
        ALTER TABLE public.resolutions ADD COLUMN votes_against INTEGER DEFAULT 0;
    END IF;
    
    -- Add votes_abstain column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'votes_abstain') THEN
        ALTER TABLE public.resolutions ADD COLUMN votes_abstain INTEGER DEFAULT 0;
    END IF;
    
    -- Add total_eligible_voters column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'total_eligible_voters') THEN
        ALTER TABLE public.resolutions ADD COLUMN total_eligible_voters INTEGER DEFAULT 0;
    END IF;
    
    -- Add requires_majority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'requires_majority') THEN
        ALTER TABLE public.resolutions ADD COLUMN requires_majority BOOLEAN DEFAULT true;
    END IF;
    
    -- Add minimum_quorum column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'minimum_quorum') THEN
        ALTER TABLE public.resolutions ADD COLUMN minimum_quorum INTEGER DEFAULT 50;
    END IF;
    
    -- Add approval_threshold column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'approval_threshold') THEN
        ALTER TABLE public.resolutions ADD COLUMN approval_threshold INTEGER DEFAULT 75;
    END IF;
    
    -- Add is_unanimous column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'is_unanimous') THEN
        ALTER TABLE public.resolutions ADD COLUMN is_unanimous BOOLEAN DEFAULT false;
    END IF;
    
    -- Add passed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resolutions' AND column_name = 'passed_at') THEN
        ALTER TABLE public.resolutions ADD COLUMN passed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create resolution_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resolution_votes (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resolution_votes_resolution_id ON public.resolution_votes(resolution_id);
CREATE INDEX IF NOT EXISTS idx_resolution_votes_voter_id ON public.resolution_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_resolution_votes_vote ON public.resolution_votes(vote);
CREATE INDEX IF NOT EXISTS idx_resolutions_status ON public.resolutions(status);
CREATE INDEX IF NOT EXISTS idx_resolutions_voting_deadline ON public.resolutions(voting_deadline);

-- Enable Row Level Security
ALTER TABLE public.resolution_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resolution_votes
-- Users can view all votes (for transparency)
CREATE POLICY IF NOT EXISTS "Resolution votes are viewable by authenticated users" 
ON public.resolution_votes FOR SELECT 
USING (auth.role() = 'authenticated');

-- Users can insert their own votes
CREATE POLICY IF NOT EXISTS "Users can insert their own votes" 
ON public.resolution_votes FOR INSERT 
WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'board_member'))
);

-- Users can update their own votes (if needed)
CREATE POLICY IF NOT EXISTS "Users can update their own votes" 
ON public.resolution_votes FOR UPDATE 
USING (auth.uid() = voter_id) 
WITH CHECK (auth.uid() = voter_id);

-- Only admins can delete votes
CREATE POLICY IF NOT EXISTS "Admins can delete votes" 
ON public.resolution_votes FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Update the resolutions status check constraint to include 'voting'
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'resolutions' AND constraint_name = 'resolutions_status_check') THEN
        ALTER TABLE public.resolutions DROP CONSTRAINT resolutions_status_check;
    END IF;
    
    -- Add the updated constraint
    ALTER TABLE public.resolutions ADD CONSTRAINT resolutions_status_check 
    CHECK (status IN ('draft', 'under_review', 'published', 'voting', 'approved', 'rejected', 'archived'));
END $$;

-- Create a function to automatically update vote counts (optional, for data consistency)
CREATE OR REPLACE FUNCTION update_resolution_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts for the affected resolution
    UPDATE public.resolutions 
    SET 
        votes_for = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'for'),
        votes_against = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'against'),
        votes_abstain = (SELECT COUNT(*) FROM public.resolution_votes WHERE resolution_id = COALESCE(NEW.resolution_id, OLD.resolution_id) AND vote = 'abstain'),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.resolution_id, OLD.resolution_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update vote counts
DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_insert ON public.resolution_votes;
CREATE TRIGGER trigger_update_resolution_vote_counts_insert
    AFTER INSERT ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_update ON public.resolution_votes;
CREATE TRIGGER trigger_update_resolution_vote_counts_update
    AFTER UPDATE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

DROP TRIGGER IF EXISTS trigger_update_resolution_vote_counts_delete ON public.resolution_votes;
CREATE TRIGGER trigger_update_resolution_vote_counts_delete
    AFTER DELETE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION update_resolution_vote_counts();

-- Add updated_at trigger for resolution_votes
CREATE TRIGGER trigger_resolution_votes_updated_at
    BEFORE UPDATE ON public.resolution_votes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.resolution_votes IS 'Stores individual votes cast on resolutions by board members';
COMMENT ON COLUMN public.resolution_votes.vote IS 'Vote choice: for, against, or abstain';
COMMENT ON COLUMN public.resolution_votes.vote_reason IS 'Optional comment explaining the vote';
COMMENT ON COLUMN public.resolution_votes.voted_at IS 'Timestamp when the vote was cast';
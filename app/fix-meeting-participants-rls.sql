-- Fix missing RLS policies for meeting_participants table

-- Meeting participants policies
CREATE POLICY "Users can view meeting participants for meetings they can access" ON public.meeting_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meetings 
            WHERE id = meeting_participants.meeting_id AND (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                ) OR
                EXISTS (
                    SELECT 1 FROM public.meeting_participants mp2
                    WHERE mp2.meeting_id = meetings.id AND mp2.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Admins can manage meeting participants" ON public.meeting_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own participation status" ON public.meeting_participants
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
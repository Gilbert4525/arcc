import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type Meeting = Database['public']['Tables']['meetings']['Row'];
type MeetingInsert = Database['public']['Tables']['meetings']['Insert'];
type MeetingUpdate = Database['public']['Tables']['meetings']['Update'];
type MeetingParticipant = Database['public']['Tables']['meeting_participants']['Row'];
type MeetingParticipantInsert = Database['public']['Tables']['meeting_participants']['Insert'];

export class MeetingsService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Get all meetings with pagination
   */
  async getMeetings(page = 1, limit = 20): Promise<{
    meetings: Meeting[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await this.supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true });

    // Get meetings
    const { data, error } = await this.supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching meetings:', error);
      return { meetings: [], total: 0, hasMore: false };
    }

    return {
      meetings: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  }

  /**
   * Get meeting by ID
   */
  async getMeeting(id: string): Promise<Meeting | null> {
    const { data, error } = await this.supabase
      .from('meetings')
      .select('*, documents(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching meeting:', error);
      return null;
    }

    return data;
  }

  /**
   * Create new meeting
   */
  async createMeeting(meeting: MeetingInsert): Promise<Meeting | null> {
    const { data, error } = await this.supabase
      .from('meetings')
      .insert(meeting)
      .select()
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return null;
    }

    return data;
  }

  /**
   * Update meeting
   */
  async updateMeeting(id: string, updates: MeetingUpdate): Promise<Meeting | null> {
    const { data, error } = await this.supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating meeting:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete meeting
   */
  async deleteMeeting(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meeting:', error);
      return false;
    }

    return true;
  }

  /**
   * Get meeting attendees
   */
  async getMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    const { data, error } = await this.supabase
      .from('meeting_participants')
      .select('*, profiles(full_name, avatar_url)')
      .eq('meeting_id', meetingId);

    if (error) {
      console.error('Error fetching meeting participants:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Add attendee to meeting
   */
  async addMeetingParticipant(participant: MeetingParticipantInsert): Promise<MeetingParticipant | null> {
    const { data, error } = await this.supabase
      .from('meeting_participants')
      .insert(participant)
      .select()
      .single();

    if (error) {
      console.error('Error adding meeting participant:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all meetings with related details (creator, category)
   * This method handles both admin and board member access
   */
  async getAllMeetingsWithDetails(): Promise<Meeting[]> {
    try {
      // Use a simpler query that should work with RLS
      const { data, error } = await this.supabase
        .from('meetings')
        .select(`
          *,
          profiles:created_by(full_name, email, avatar_url),
          categories(name, color)
        `)
        .order('meeting_date', { ascending: false });

      if (error) {
        console.error('Error fetching meetings with details:', error);
        console.error('Error details:', error);
        
        // If the detailed query fails, try a simpler one
        const { data: simpleData, error: simpleError } = await this.supabase
          .from('meetings')
          .select('*')
          .order('meeting_date', { ascending: false });

        if (simpleError) {
          console.error('Simple query also failed:', simpleError);
          return [];
        }

        return simpleData || [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllMeetingsWithDetails:', error);
      return [];
    }
  }

  /**
   * Remove meeting participant
   */
  async removeMeetingParticipant(meetingId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('meeting_participants')
      .delete()
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing meeting participant:', error);
      return false;
    }

    return true;
  }

  /**
   * Get upcoming meetings
   */
  async getUpcomingMeetings(limit = 3): Promise<Meeting[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('meetings')
      .select('*')
      .gte('meeting_date', now)
      .order('meeting_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming meetings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get past meetings
   */
  async getPastMeetings(limit = 5): Promise<Meeting[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('meetings')
      .select('*')
      .lt('meeting_date', now)
      .order('meeting_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching past meetings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get today's meetings
   */
  async getTodaysMeetings(): Promise<Meeting[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data, error } = await this.supabase
      .from('meetings')
      .select('*')
      .gte('meeting_date', startOfDay)
      .lt('meeting_date', endOfDay)
      .order('meeting_date', { ascending: true });

    if (error) {
      console.error('Error fetching today\'s meetings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get meetings by status
   */
  async getMeetingsByStatus(status: Meeting['status']): Promise<Meeting[]> {
    // Handle null status - return empty array if status is null
    if (status === null || status === undefined) {
      console.warn('getMeetingsByStatus called with null/undefined status');
      return [];
    }

    const { data, error } = await this.supabase
      .from('meetings')
      .select('*')
      .eq('status', status)
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error('Error fetching meetings by status:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get meetings by type
   */
  async getMeetingsByType(type: Meeting['meeting_type']): Promise<Meeting[]> {
    // Handle null meeting_type - return empty array if type is null
    if (type === null || type === undefined) {
      console.warn('getMeetingsByType called with null/undefined type');
      return [];
    }

    const { data, error } = await this.supabase
      .from('meetings')
      .select('*')
      .eq('meeting_type', type)
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error('Error fetching meetings by type:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get upcoming meetings for a specific user (board member)
   */
  async getUpcomingMeetingsForUser(userId: string, limit = 3): Promise<Meeting[]> {
    const now = new Date().toISOString();
    
    // First get meeting IDs for this user
    const { data: participantData, error: participantError } = await this.supabase
      .from('meeting_participants')
      .select('meeting_id')
      .eq('user_id', userId);

    if (participantError) {
      console.error('Error fetching user meeting participants:', participantError);
      return [];
    }

    if (!participantData || participantData.length === 0) {
      return []; // User has no meetings
    }

    const meetingIds = participantData
      .map(p => p.meeting_id)
      .filter((id): id is string => id !== null);

    if (meetingIds.length === 0) {
      return []; // No valid meeting IDs found
    }

    // Then get the actual meetings
    const { data, error } = await this.supabase
      .from('meetings')
      .select('*')
      .in('id', meetingIds)
      .gte('meeting_date', now)
      .order('meeting_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming meetings for user:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Add all board members as participants to a meeting
   */
  async addAllBoardMembersToMeeting(meetingId: string): Promise<boolean> {
    try {
      // Get all active board members
      const { data: boardMembers, error: fetchError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (fetchError) {
        console.error('Error fetching board members:', fetchError);
        return false;
      }

      if (!boardMembers || boardMembers.length === 0) {
        return true; // No board members to add
      }

      // Add all board members as participants
      const participants = boardMembers.map(member => ({
        meeting_id: meetingId,
        user_id: member.id,
        role: 'attendee' as const,
        attendance_status: 'pending' as const
      }));

      const { error: insertError } = await this.supabase
        .from('meeting_participants')
        .insert(participants);

      if (insertError) {
        console.error('Error adding meeting participants:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addAllBoardMembersToMeeting:', error);
      return false;
    }
  }
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { createClient } from '@/lib/supabase/client';
import { getDatabaseServices } from '@/lib/database';
import { Database, Json } from '@/types/database';

// Types based on exact database schema
type Meeting = Database['public']['Tables']['meetings']['Row'];
type MeetingInsert = Database['public']['Tables']['meetings']['Insert'];
type Category = Database['public']['Tables']['categories']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// Extended types for joined data
interface MeetingWithDetails extends Meeting {
  creator?: Pick<Profile, 'full_name' | 'email' | 'avatar_url'> | null;
  category?: Pick<Category, 'name' | 'color'> | null;
}

interface MeetingFormData {
  title: string;
  description: string;
  meeting_date: string;
  location: string;
  meeting_link: string;
  duration_minutes: number;
  category_id: string;
  meeting_type: string;
  is_recurring: boolean;
  agenda: AgendaItem[];
}

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  description?: string;
}

const defaultFormData: MeetingFormData = {
  title: '',
  description: '',
  meeting_date: '',
  location: '',
  meeting_link: '',
  duration_minutes: 60,
  category_id: '',
  meeting_type: 'board_meeting',
  is_recurring: false,
  agenda: []
};

export default function MeetingManagement() {
  // State management
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingWithDetails | null>(null);
  const [formData, setFormData] = useState<MeetingFormData>(defaultFormData);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize services
  const supabase = createClient();
  const { meetings: meetingsService, categories: categoriesService } = getDatabaseServices(supabase);

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use API endpoint with withDetails=true to get all meetings with related data
      const response = await fetch('/api/meetings?withDetails=true');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const meetingsData = result.meetings || [];
      setMeetings(meetingsData as MeetingWithDetails[]);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoriesService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  }, [categoriesService]);

  // Data fetching effects - run only once on mount
  useEffect(() => {
    loadMeetings();
    loadCategories();
  }, [loadMeetings, loadCategories]); // Include dependencies

  // Computed values - must be before return statement
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (meeting.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || meeting.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Meeting Management</h1>
        <Button onClick={() => handleCreateMeeting()}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Meeting List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading meetings...</div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No meetings found</div>
        ) : (
          filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onEdit={handleEditMeeting}
              onDelete={handleDeleteMeeting}
            />
          ))
        )}
      </div>

      {/* Meeting Dialog */}
      <MeetingDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingMeeting(null);
          setFormData(defaultFormData);
        }}
        onSubmit={handleSubmitMeeting}
        formData={formData}
        onFormChange={setFormData}
        categories={categories}
        isEditing={!!editingMeeting}
      />
    </div>
  );

  // Helper functions will be implemented next
  function handleCreateMeeting() {
    setEditingMeeting(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  }

  function handleEditMeeting(meeting: MeetingWithDetails) {
    setEditingMeeting(meeting);
    
    // Parse agenda safely
    let parsedAgenda: AgendaItem[] = [];
    if (meeting.agenda) {
      try {
        const agendaData = typeof meeting.agenda === 'string' 
          ? JSON.parse(meeting.agenda) 
          : meeting.agenda;
        parsedAgenda = Array.isArray(agendaData) ? agendaData : [];
      } catch (error) {
        console.warn('Error parsing agenda:', error);
      }
    }
    
    setFormData({
      title: meeting.title || '',
      description: meeting.description || '',
      meeting_date: meeting.meeting_date || '',
      location: meeting.location || '',
      meeting_link: meeting.meeting_link || '',
      duration_minutes: meeting.duration_minutes || 60,
      category_id: meeting.category_id || '',
      meeting_type: meeting.meeting_type || 'board_meeting',
      is_recurring: meeting.is_recurring || false,
      agenda: parsedAgenda
    });
    setIsDialogOpen(true);
  }

  async function handleDeleteMeeting(id: string) {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    try {
      const success = await meetingsService.deleteMeeting(id);
      if (success) {
        toast.success('Meeting deleted successfully');
        loadMeetings();
      } else {
        toast.error('Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  }

  async function handleSubmitMeeting(data: MeetingFormData) {
    try {
      // Get the current user ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        toast.error('You must be logged in to create a meeting');
        return;
      }
      
      const meetingData = {
        title: data.title,
        description: data.description || null,
        meeting_date: data.meeting_date,
        location: data.location || null,
        meeting_link: data.meeting_link || null,
        duration_minutes: data.duration_minutes || 60, // Ensure this has a default value
        category_id: data.category_id || null,
        meeting_type: data.meeting_type || 'board_meeting',
        is_recurring: data.is_recurring || false,
        agenda: data.agenda.length > 0 ? data.agenda as unknown as Json : null,
        created_by: userData.user.id
      };

      let result;
      if (editingMeeting) {
        result = await meetingsService.updateMeeting(editingMeeting.id, meetingData);
        if (result) {
          toast.success('Meeting updated successfully');
        } else {
          toast.error('Failed to update meeting');
          return;
        }
      } else {
        result = await meetingsService.createMeeting(meetingData as MeetingInsert);
        if (result) {
          toast.success('Meeting created successfully');
        } else {
          toast.error('Failed to create meeting');
          return;
        }
      }

      setIsDialogOpen(false);
      setEditingMeeting(null);
      setFormData(defaultFormData);
      loadMeetings();
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error('Failed to save meeting');
    }
  }

}

// Meeting Card Component
interface MeetingCardProps {
  meeting: MeetingWithDetails;
  onEdit: (meeting: MeetingWithDetails) => void;
  onDelete: (id: string) => void;
}

function MeetingCard({ meeting, onEdit, onDelete }: MeetingCardProps) {
  const meetingDate = meeting.meeting_date ? format(parseISO(meeting.meeting_date), 'PPP') : 'Date TBD';
  const meetingTime = meeting.meeting_date ? format(parseISO(meeting.meeting_date), 'p') : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{meeting.title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {meetingDate}
              </div>
              {meetingTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {meetingTime}
                </div>
              )}
              {meeting.duration_minutes && (
                <span>({meeting.duration_minutes} min)</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(meeting)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(meeting.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {meeting.description && (
            <p className="text-gray-700">{meeting.description}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm">
            {meeting.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {meeting.location}
              </div>
            )}
            
            {meeting.category && (
              <Badge 
                style={{ backgroundColor: meeting.category.color || '#gray' }}
                className="text-white"
              >
                {meeting.category.name}
              </Badge>
            )}
            
            {meeting.meeting_type && (
              <Badge variant="secondary">
                {meeting.meeting_type}
              </Badge>
            )}
          </div>
          
          {meeting.creator && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              Created by {meeting.creator.full_name || meeting.creator.email}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Meeting Dialog Component
interface MeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MeetingFormData) => void;
  formData: MeetingFormData;
  onFormChange: (data: MeetingFormData) => void;
  categories: Category[];
  isEditing: boolean;
}

function MeetingDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  onFormChange, 
  categories, 
  isEditing 
}: MeetingDialogProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateFormData = (updates: Partial<MeetingFormData>) => {
    onFormChange({ ...formData, ...updates });
  };

  const addAgendaItem = () => {
    const newItem: AgendaItem = {
      id: Date.now().toString(),
      title: '',
      duration: 15,
      description: ''
    };
    updateFormData({ agenda: [...formData.agenda, newItem] });
  };

  const updateAgendaItem = (index: number, updates: Partial<AgendaItem>) => {
    const updatedAgenda = formData.agenda.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    );
    updateFormData({ agenda: updatedAgenda });
  };

  const removeAgendaItem = (index: number) => {
    const updatedAgenda = formData.agenda.filter((_, i) => i !== index);
    updateFormData({ agenda: updatedAgenda });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Meeting' : 'Schedule New Meeting'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meeting_date">Date & Time *</Label>
              <Input
                id="meeting_date"
                type="datetime-local"
                value={formData.meeting_date}
                onChange={(e) => updateFormData({ meeting_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateFormData({ location: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meeting_link">Meeting Link</Label>
              <Input
                id="meeting_link"
                type="url"
                value={formData.meeting_link}
                onChange={(e) => updateFormData({ meeting_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => updateFormData({ duration_minutes: parseInt(e.target.value) || 60 })}
                min="15"
                step="15"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => updateFormData({ category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.meeting_type} onValueChange={(value) => updateFormData({ meeting_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board_meeting">Board Meeting</SelectItem>
                  <SelectItem value="committee_meeting">Committee Meeting</SelectItem>
                  <SelectItem value="special_meeting">Special Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => updateFormData({ is_recurring: checked })}
            />
            <Label htmlFor="recurring">Recurring Meeting</Label>
          </div>

          {/* Agenda Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Agenda</Label>
              <Button type="button" onClick={addAgendaItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {formData.agenda.map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <Input
                      placeholder="Agenda item title"
                      value={item.title}
                      onChange={(e) => updateAgendaItem(index, { title: e.target.value })}
                      className="flex-1 mr-2"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Duration"
                        value={item.duration}
                        onChange={(e) => updateAgendaItem(index, { duration: parseInt(e.target.value) || 15 })}
                        className="w-20"
                        min="5"
                        step="5"
                      />
                      <span className="text-sm text-gray-500">min</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAgendaItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Description (optional)"
                    value={item.description || ''}
                    onChange={(e) => updateAgendaItem(index, { description: e.target.value })}
                    rows={2}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update Meeting' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

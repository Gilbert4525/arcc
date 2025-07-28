// Notification templates for consistent messaging across the application

export interface NotificationTemplate {
  title: string;
  message: string;
  type: 'meeting' | 'resolution' | 'document' | 'system' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  action_text?: string;
}

// Document notification templates
export const DOCUMENT_TEMPLATES = {
  CREATED: (document: any): NotificationTemplate => ({
    title: 'New Document Available',
    message: `A new document "${document.title}" has been uploaded`,
    type: 'document',
    priority: 'normal',
    action_url: `/dashboard/documents`,
    action_text: 'View Documents',
  }),

  PUBLISHED: (document: any): NotificationTemplate => ({
    title: 'Document Published',
    message: `Document "${document.title}" is now available for viewing`,
    type: 'document',
    priority: 'normal',
    action_url: `/dashboard/documents`,
    action_text: 'View Document',
  }),

  UPDATED: (document: any): NotificationTemplate => ({
    title: 'Document Updated',
    message: `Document "${document.title}" has been updated`,
    type: 'document',
    priority: 'normal',
    action_url: `/dashboard/documents`,
    action_text: 'View Document',
  }),
};

// Meeting notification templates
export const MEETING_TEMPLATES = {
  CREATED: (meeting: any): NotificationTemplate => {
    const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
    const meetingTime = new Date(meeting.meeting_date).toLocaleTimeString();
    
    return {
      title: 'Meeting Scheduled',
      message: `You have been invited to "${meeting.title}" on ${meetingDate} at ${meetingTime}`,
      type: 'meeting',
      priority: 'high',
      action_url: `/dashboard/meetings`,
      action_text: 'View Meeting',
    };
  },

  UPDATED: (meeting: any): NotificationTemplate => {
    const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
    const meetingTime = new Date(meeting.meeting_date).toLocaleTimeString();
    
    return {
      title: 'Meeting Updated',
      message: `Meeting "${meeting.title}" scheduled for ${meetingDate} at ${meetingTime} has been updated`,
      type: 'meeting',
      priority: 'high',
      action_url: `/dashboard/meetings`,
      action_text: 'View Meeting',
    };
  },

  CANCELLED: (meeting: any): NotificationTemplate => {
    const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
    
    return {
      title: 'Meeting Cancelled',
      message: `Meeting "${meeting.title}" scheduled for ${meetingDate} has been cancelled`,
      type: 'meeting',
      priority: 'urgent',
      action_url: `/dashboard/meetings`,
      action_text: 'View Meetings',
    };
  },

  REMINDER: (meeting: any, reminderType: 'day' | 'hour'): NotificationTemplate => {
    const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
    const meetingTime = new Date(meeting.meeting_date).toLocaleTimeString();
    const timeframe = reminderType === 'day' ? 'tomorrow' : 'in 1 hour';
    
    return {
      title: 'Meeting Reminder',
      message: `Reminder: "${meeting.title}" is scheduled for ${timeframe} (${meetingDate} at ${meetingTime})`,
      type: 'reminder',
      priority: 'high',
      action_url: `/dashboard/meetings`,
      action_text: 'View Meeting',
    };
  },
};

// Resolution notification templates
export const RESOLUTION_TEMPLATES = {
  CREATED: (resolution: any): NotificationTemplate => ({
    title: 'New Resolution Created',
    message: `A new resolution "${resolution.title}" has been created`,
    type: 'resolution',
    priority: 'normal',
    action_url: `/dashboard/resolutions`,
    action_text: 'View Resolution',
  }),

  PUBLISHED: (resolution: any): NotificationTemplate => {
    const votingDeadline = resolution.voting_deadline 
      ? new Date(resolution.voting_deadline).toLocaleDateString()
      : 'No deadline set';
    
    return {
      title: 'New Resolution for Voting',
      message: `Resolution "${resolution.title}" is now open for voting. Deadline: ${votingDeadline}`,
      type: 'resolution',
      priority: 'high',
      action_url: `/dashboard/resolutions`,
      action_text: 'Vote Now',
    };
  },

  VOTING_REMINDER: (resolution: any): NotificationTemplate => {
    const votingDeadline = new Date(resolution.voting_deadline).toLocaleDateString();
    
    return {
      title: 'Voting Deadline Approaching',
      message: `Reminder: Voting for resolution "${resolution.title}" ends on ${votingDeadline}`,
      type: 'reminder',
      priority: 'high',
      action_url: `/dashboard/resolutions`,
      action_text: 'Vote Now',
    };
  },

  VOTING_CLOSED: (resolution: any): NotificationTemplate => ({
    title: 'Voting Closed',
    message: `Voting for resolution "${resolution.title}" has closed. Results are now available`,
    type: 'resolution',
    priority: 'normal',
    action_url: `/dashboard/resolutions`,
    action_text: 'View Results',
  }),

  APPROVED: (resolution: any): NotificationTemplate => ({
    title: 'Resolution Approved',
    message: `Resolution "${resolution.title}" has been approved by the board`,
    type: 'resolution',
    priority: 'high',
    action_url: `/dashboard/resolutions`,
    action_text: 'View Resolution',
  }),

  REJECTED: (resolution: any): NotificationTemplate => ({
    title: 'Resolution Rejected',
    message: `Resolution "${resolution.title}" has been rejected by the board`,
    type: 'resolution',
    priority: 'normal',
    action_url: `/dashboard/resolutions`,
    action_text: 'View Resolution',
  }),
};

// System notification templates
export const SYSTEM_TEMPLATES = {
  MAINTENANCE: (startTime: string, duration: string): NotificationTemplate => ({
    title: 'Scheduled Maintenance',
    message: `System maintenance is scheduled for ${startTime} and will last approximately ${duration}`,
    type: 'system',
    priority: 'normal',
    action_url: `/dashboard`,
    action_text: 'Dashboard',
  }),

  UPDATE: (version: string, features: string[]): NotificationTemplate => ({
    title: 'System Update Available',
    message: `Version ${version} is now available with new features: ${features.join(', ')}`,
    type: 'system',
    priority: 'low',
    action_url: `/dashboard`,
    action_text: 'Learn More',
  }),

  WELCOME: (userName: string): NotificationTemplate => ({
    title: 'Welcome to Arc Board Management',
    message: `Welcome ${userName}! Your account has been set up and you can now access all board materials and participate in meetings`,
    type: 'system',
    priority: 'normal',
    action_url: `/dashboard`,
    action_text: 'Get Started',
  }),
};

// Helper function to create notification data from template
export function createNotificationFromTemplate(
  template: NotificationTemplate,
  userId: string,
  metadata?: Record<string, any>
) {
  return {
    user_id: userId,
    title: template.title,
    message: template.message,
    type: template.type,
    priority: template.priority,
    action_url: template.action_url,
    action_text: template.action_text,
    metadata,
  };
}

// Helper function to format dates consistently
export function formatNotificationDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper function to format times consistently
export function formatNotificationTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Helper function to format date and time together
export function formatNotificationDateTime(date: string | Date): string {
  const dateObj = new Date(date);
  return `${formatNotificationDate(dateObj)} at ${formatNotificationTime(dateObj)}`;
}
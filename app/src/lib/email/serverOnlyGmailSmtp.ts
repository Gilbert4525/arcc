// Server-only Gmail SMTP service wrapper
// This file should only be imported in API routes and server components

import { GmailSMTPService, createGmailEmailNotificationData } from './gmailSmtp';

// Re-export only for server-side usage
export { GmailSMTPService, createGmailEmailNotificationData };

// Ensure this module is only used on the server
if (typeof window !== 'undefined') {
  throw new Error('serverOnlyGmailSmtp should only be imported on the server side');
}
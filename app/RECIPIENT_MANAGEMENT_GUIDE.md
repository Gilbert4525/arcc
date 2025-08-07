# Recipient Management Guide

## Overview

The Recipient Management system provides comprehensive control over email recipients, their preferences, and delivery tracking for the voting summary email system. It includes advanced features for bulk email delivery, preference management, and delivery analytics.

## Architecture

### Core Components

1. **RecipientManager** (`/src/lib/email/recipientManager.ts`)
   - Manages recipient data and preferences
   - Handles email validation and bounce processing
   - Provides filtering and statistics

2. **BulkEmailDeliveryService** (`/src/lib/email/bulkEmailDelivery.ts`)
   - Advanced bulk email delivery with concurrency control
   - Retry logic and failure handling
   - Personalization and template processing

3. **Admin Interface** (`/src/components/admin/RecipientManagement.tsx`)
   - Web interface for managing recipients
   - Preference configuration and monitoring
   - System statistics and health monitoring

4. **API Endpoints** (`/src/app/api/admin/recipients/route.ts`)
   - RESTful API for recipient management
   - Preference updates and validation
   - Statistics and reporting

## Features

### Recipient Management
- **Comprehensive Filtering**: Filter by role, status, email preferences
- **Preference Management**: Individual and bulk preference updates
- **Email Validation**: Validate email addresses and domains
- **Bounce Handling**: Automatic handling of email bounces

### Bulk Email Delivery
- **Concurrency Control**: Configurable concurrent email sending
- **Retry Logic**: Exponential backoff for failed deliveries
- **Batch Processing**: Process large recipient lists in batches
- **Personalization**: Dynamic content personalization per recipient

### Monitoring & Analytics
- **Delivery Statistics**: Track success rates and performance
- **System Health**: Monitor overall email system health
- **Recipient Analytics**: Individual recipient email statistics
- **Bounce Tracking**: Track and handle email bounces

## Usage

### Admin Interface

#### Accessing Recipient Management
1. Navigate to the admin dashboard
2. Go to "Recipient Management" section
3. Use the three tabs: Overview, Recipients, Preferences

#### Overview Tab
- **System Statistics**: Total recipients, active users, email-enabled users
- **Delivery Metrics**: Delivery rates, bounce rates, system health
- **Health Status**: Overall system performance indicators

#### Recipients Tab
- **Recipient List**: View all recipients with filtering options
- **Quick Actions**: Enable/disable email notifications per recipient
- **Search & Filter**: Find recipients by name, email, role, or status
- **Bulk Operations**: Manage multiple recipients simultaneously

#### Preferences Tab
- **Individual Settings**: Detailed preference management per recipient
- **Email Types**: Configure voting summaries, reminders, system notifications
- **Delivery Options**: Set digest frequency and preferred format
- **Timezone Settings**: Configure recipient timezone preferences

### API Usage

#### Get Recipients

**Endpoint**: `GET /api/admin/recipients`

**Query Parameters**:
- `action`: `stats`, `voting`, `filtered` (optional)
- `includeAdmins`: Include admin users (default: true)
- `includeBoardMembers`: Include board members (default: true)
- `votingEmailsOnly`: Only recipients with voting emails enabled
- `activeOnly`: Only active recipients (default: true)

**Examples**:
```bash
# Get all recipients
curl /api/admin/recipients

# Get voting email recipients only
curl /api/admin/recipients?action=voting

# Get system statistics
curl /api/admin/recipients?action=stats

# Get filtered recipients
curl /api/admin/recipients?action=filtered&votingEmailsOnly=true
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "full_name": "John Smith",
      "email": "john@example.com",
      "position": "Chairman",
      "role": "admin",
      "is_active": true,
      "email_notifications_enabled": true,
      "voting_email_notifications": true,
      "preferences": {
        "voting_summaries": true,
        "voting_reminders": true,
        "system_notifications": true,
        "digest_frequency": "immediate",
        "preferred_format": "html"
      }
    }
  ]
}
```

#### Update Recipient Preferences

**Endpoint**: `PUT /api/admin/recipients`

**Request Body**:
```json
{
  "recipientId": "user-uuid",
  "preferences": {
    "voting_summaries": false,
    "digest_frequency": "daily",
    "preferred_format": "text"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Recipient preferences updated successfully"
}
```

#### Recipient Actions

**Endpoint**: `POST /api/admin/recipients`

**Validate Recipients**:
```json
{
  "action": "validate",
  "recipientIds": ["user-uuid-1", "user-uuid-2"]
}
```

**Handle Email Bounce**:
```json
{
  "action": "handle_bounce",
  "recipientId": "user-uuid",
  "bounceType": "hard",
  "bounceReason": "Invalid email address"
}
```

**Get Recipient Statistics**:
```json
{
  "action": "get_stats",
  "recipientId": "user-uuid"
}
```

### Programmatic Usage

#### Initialize Services

```typescript
import { RecipientManager } from '@/lib/email/recipientManager';
import { BulkEmailDeliveryService } from '@/lib/email/bulkEmailDelivery';

const recipientManager = new RecipientManager(supabase);
const bulkEmailService = new BulkEmailDeliveryService(supabase);
```

#### Get Recipients

```typescript
// Get all voting email recipients
const recipients = await recipientManager.getVotingEmailRecipients();

// Get filtered recipients
const filteredRecipients = await recipientManager.getFilteredRecipients({
  includeAdmins: true,
  includeBoardMembers: true,
  votingEmailsOnly: true,
  activeOnly: true
});

// Get recipient by ID
const recipient = await recipientManager.getRecipientById('user-uuid');
```

#### Send Bulk Emails

```typescript
const template = {
  subject: 'Voting Summary Email',
  htmlContent: '<html>...</html>',
  textContent: 'Plain text version...',
  personalizedFields: ['recipient_name']
};

const options = {
  maxConcurrent: 5,
  retryAttempts: 3,
  retryDelay: 1000,
  respectPreferences: true,
  trackDelivery: true,
  batchSize: 10,
  delayBetweenBatches: 500
};

const result = await bulkEmailService.sendBulkEmails(
  recipients,
  template,
  options
);

console.log(`Sent ${result.successful_deliveries}/${result.total_recipients} emails`);
```

#### Update Preferences

```typescript
const success = await recipientManager.updateRecipientPreferences(
  'user-uuid',
  {
    voting_summaries: false,
    digest_frequency: 'daily'
  }
);
```

## Configuration

### Email Preferences

Recipients can configure the following preferences:

#### Email Types
- **Voting Summaries**: Receive voting result emails
- **Voting Reminders**: Receive voting deadline reminders
- **System Notifications**: Receive system-wide notifications

#### Delivery Options
- **Digest Frequency**: `immediate`, `daily`, `weekly`, `disabled`
- **Preferred Format**: `html`, `text`, `both`
- **Timezone**: Recipient's timezone for scheduling

### Bulk Email Options

Configure bulk email delivery behavior:

```typescript
interface BulkEmailOptions {
  maxConcurrent?: number;      // Max concurrent sends (default: 5)
  retryAttempts?: number;      // Retry attempts (default: 3)
  retryDelay?: number;         // Retry delay in ms (default: 1000)
  respectPreferences?: boolean; // Respect user preferences (default: true)
  trackDelivery?: boolean;     // Track delivery status (default: true)
  batchSize?: number;          // Batch size (default: 10)
  delayBetweenBatches?: number; // Batch delay in ms (default: 500)
}
```

### Validation Rules

#### Email Validation
- Valid email format (RFC 5322 compliant)
- No invalid domains (example.com, test.com, localhost)
- Active recipient status
- Email notifications enabled

#### Preference Validation
- Valid digest frequency values
- Valid email format preferences
- Boolean values for notification types

## Monitoring

### System Statistics

Monitor these key metrics:

```typescript
interface SystemEmailStats {
  total_recipients: number;        // Total recipients in system
  active_recipients: number;       // Active recipients
  email_enabled_recipients: number; // Email notifications enabled
  voting_email_enabled: number;    // Voting emails enabled
  recent_bounces: number;          // Recent bounce count
  delivery_rate: number;           // Overall delivery rate %
}
```

### Delivery Analytics

Track email delivery performance:

```typescript
interface BulkEmailResult {
  total_recipients: number;        // Total recipients processed
  successful_deliveries: number;   // Successful email sends
  failed_deliveries: number;       // Failed email sends
  total_time: number;             // Total processing time (ms)
  average_delivery_time: number;  // Average delivery time (ms)
  bounce_rate: number;            // Bounce rate percentage
}
```

### Health Monitoring

#### Key Performance Indicators
- **Delivery Rate**: Should be > 95%
- **Bounce Rate**: Should be < 5%
- **Average Delivery Time**: Should be < 2000ms
- **Failed Deliveries**: Should be < 10%

#### Alerting Thresholds
- Delivery rate drops below 90%
- Bounce rate exceeds 10%
- More than 20% failed deliveries
- Average delivery time exceeds 5000ms

## Error Handling

### Common Errors

1. **Invalid Email Address**
   ```json
   {
     "success": false,
     "error": "Invalid email format",
     "recipient": "invalid-email"
   }
   ```

2. **Recipient Not Found**
   ```json
   {
     "success": false,
     "error": "Recipient not found",
     "recipientId": "user-uuid"
   }
   ```

3. **Preference Update Failed**
   ```json
   {
     "success": false,
     "error": "Failed to update recipient preferences",
     "details": "Database connection error"
   }
   ```

4. **Bulk Email Failure**
   ```json
   {
     "success": false,
     "error": "Bulk email delivery failed",
     "failed_count": 5,
     "total_count": 10
   }
   ```

### Error Recovery

#### Automatic Recovery
- **Retry Logic**: Exponential backoff for transient failures
- **Bounce Handling**: Automatic disabling for hard bounces
- **Validation**: Pre-send email validation
- **Fallback**: Graceful degradation for partial failures

#### Manual Recovery
- **Admin Interface**: Manual retry for failed deliveries
- **Preference Reset**: Reset preferences to defaults
- **Email Re-validation**: Re-validate email addresses
- **Bounce Recovery**: Manual re-enable after bounce resolution

## Security

### Access Control
- **Admin Only**: All recipient management requires admin role
- **Audit Logging**: All changes are logged with user information
- **Data Privacy**: Sensitive data is protected and encrypted

### Data Protection
- **Email Encryption**: Emails sent over TLS
- **Preference Privacy**: User preferences are private
- **Bounce Confidentiality**: Bounce reasons are logged securely
- **Access Logs**: All access is logged for compliance

## Best Practices

### Recipient Management
1. **Regular Cleanup**: Remove inactive recipients periodically
2. **Preference Respect**: Always respect user preferences
3. **Validation**: Validate emails before sending
4. **Monitoring**: Monitor delivery rates and bounce rates

### Bulk Email Delivery
1. **Conservative Concurrency**: Start with low concurrency limits
2. **Batch Processing**: Use appropriate batch sizes
3. **Retry Logic**: Implement exponential backoff
4. **Monitoring**: Track delivery performance

### Performance Optimization
1. **Database Indexing**: Index frequently queried fields
2. **Caching**: Cache recipient data when appropriate
3. **Connection Pooling**: Use database connection pooling
4. **Async Processing**: Process emails asynchronously

## Troubleshooting

### Common Issues

1. **Low Delivery Rate**
   - Check email service configuration
   - Verify recipient email addresses
   - Review bounce handling
   - Monitor for spam filtering

2. **High Bounce Rate**
   - Validate email addresses
   - Check for typos in email addresses
   - Review email content for spam triggers
   - Verify sender reputation

3. **Slow Delivery**
   - Reduce concurrency limits
   - Increase batch delays
   - Check email service rate limits
   - Monitor database performance

4. **Preference Updates Failing**
   - Check database connectivity
   - Verify user permissions
   - Review validation rules
   - Check for data conflicts

### Debugging Tools

1. **Admin Interface**: Real-time monitoring and control
2. **API Endpoints**: Direct access to recipient data
3. **Logging**: Comprehensive audit logs
4. **Statistics**: Detailed delivery and performance metrics

## Integration

### With Voting System
- Automatic recipient discovery from user profiles
- Integration with voting completion triggers
- Preference-based email filtering
- Delivery tracking and reporting

### With Email Service
- Seamless integration with existing email infrastructure
- Bounce handling and feedback processing
- Delivery confirmation and tracking
- Template processing and personalization

### Custom Extensions

To extend the recipient management system:

1. **Custom Preferences**: Add new preference types
2. **Advanced Filtering**: Implement custom filter logic
3. **External Integration**: Connect with external email services
4. **Analytics Enhancement**: Add custom metrics and reporting

## Support

For recipient management issues:

1. **Admin Interface**: Use the web interface for most operations
2. **API Documentation**: Reference API endpoints for integration
3. **Logs**: Check application logs for detailed error information
4. **Monitoring**: Use system statistics to identify issues
5. **Testing**: Use validation endpoints to test configurations
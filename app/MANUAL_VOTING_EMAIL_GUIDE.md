# Manual Voting Email Trigger Guide

## Overview

The Manual Voting Email Trigger system provides administrators with the ability to manually send voting summary emails and test email generation. This is useful for emergency situations, testing, or when automatic triggers fail.

## Features

### Manual Email Triggering
- Send voting summary emails for any resolution or minutes
- Force mode to bypass status and duplicate checks
- Comprehensive validation and error handling
- Audit logging for all manual triggers

### Email Testing & Preview
- Generate email previews without sending
- Send test emails to administrators
- View voting statistics and email content
- Test email templates with real data

### Duplicate Prevention
- Prevents sending duplicate emails within a time window
- Force mode option to override duplicate checks
- Tracks recent email sends for audit purposes

## Usage

### Admin Interface

#### Accessing the Interface
1. Navigate to the admin dashboard
2. Go to the "Manual Voting Email Trigger" section
3. Choose from three tabs: Manual Trigger, Test & Preview, or Email Preview

#### Manual Trigger Tab
- **Purpose**: Send actual voting summary emails to all board members
- **Force Mode**: Toggle to bypass status and duplicate checks
- **Actions**: Preview email content or send emails immediately

#### Test & Preview Tab
- **Purpose**: Test email generation and send test emails to yourself
- **Actions**: Preview email content or send test emails to admin only

#### Email Preview Tab
- **Purpose**: View generated email content and voting statistics
- **Content**: Shows HTML preview, voting statistics, and email metadata

### API Endpoints

#### Manual Email Triggering

**Endpoint**: `POST /api/admin/manual-voting-summary`

**Request Body**:
```json
{
  "type": "resolution|minutes",
  "itemId": "uuid",
  "force": false
}
```

**Parameters**:
- `type`: Type of item ("resolution" or "minutes")
- `itemId`: UUID of the resolution or minutes
- `force`: Boolean to bypass validation checks (optional, default: false)

**Response**:
```json
{
  "success": true,
  "message": "Voting summary email sent successfully for resolution: Board Meeting Resolution",
  "data": {
    "type": "resolution",
    "itemId": "123e4567-e89b-12d3-a456-426614174000",
    "itemTitle": "Board Meeting Resolution",
    "itemStatus": "approved",
    "triggeredBy": "Admin User",
    "timestamp": "2024-01-15T10:30:00Z",
    "forced": false
  }
}
```

#### Email Testing

**Endpoint**: `POST /api/admin/test-voting-email`

**Request Body**:
```json
{
  "type": "resolution|minutes",
  "itemId": "uuid",
  "action": "preview|test_send"
}
```

**Parameters**:
- `type`: Type of item ("resolution" or "minutes")
- `itemId`: UUID of the resolution or minutes
- `action`: Action to perform ("preview" or "test_send")

**Response for Preview**:
```json
{
  "success": true,
  "message": "Email preview generated for resolution: Board Meeting Resolution",
  "data": {
    "type": "resolution",
    "itemId": "123e4567-e89b-12d3-a456-426614174000",
    "itemTitle": "Board Meeting Resolution",
    "preview": {
      "subject": "Arc Board Management - Resolution Voting Complete: Board Meeting Resolution - PASSED",
      "html": "<html>...</html>",
      "text": "Plain text version...",
      "votingPeriod": "Voting Period: January 1, 2024 to January 15, 2024 (14 days)"
    },
    "summaryStats": {
      "totalVotes": 5,
      "totalEligibleVoters": 7,
      "participationRate": 71.43,
      "approvalPercentage": 80.0,
      "passed": true,
      "nonVotersCount": 2
    }
  }
}
```

#### Get Available Items

**Endpoint**: `GET /api/admin/manual-voting-summary`

**Query Parameters**:
- `type`: Filter by type ("resolution" or "minutes") - optional
- `status`: Filter by status - optional

**Response**:
```json
{
  "success": true,
  "data": {
    "resolutions": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Board Meeting Resolution",
        "status": "approved",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "minutes": [
      {
        "id": "987fcdeb-51a2-43d1-b456-426614174000",
        "title": "January Board Meeting Minutes",
        "status": "passed",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

## Validation Rules

### Status Validation
Emails can be sent for items with the following statuses:
- `approved` - Resolution passed
- `rejected` - Resolution failed
- `failed` - Voting failed (quorum not met, etc.)
- `passed` - Minutes approved
- `voting` - Currently voting (with force mode)
- `expired` - Voting deadline expired

### Duplicate Prevention
- Prevents sending emails for the same item within 1 hour
- Can be overridden with `force: true`
- Tracks email sending attempts in audit logs

### Access Control
- Only administrators can trigger manual emails
- All actions are logged with user information
- Authentication required for all endpoints

## Error Handling

### Common Errors

1. **Item Not Found**
   ```json
   {
     "success": false,
     "error": "resolution not found"
   }
   ```

2. **Invalid Status**
   ```json
   {
     "success": false,
     "error": "Cannot send email for resolution with status \"draft\". Use force=true to override.",
     "itemStatus": "draft"
   }
   ```

3. **Duplicate Email**
   ```json
   {
     "success": false,
     "error": "Email already sent recently for this resolution. Use force=true to override.",
     "lastEmailSent": "2024-01-15T09:30:00Z"
   }
   ```

4. **Email Service Failure**
   ```json
   {
     "success": false,
     "error": "Failed to send voting summary email: SMTP connection failed"
   }
   ```

### Error Recovery
- Use force mode to bypass validation checks
- Check item status and voting data before triggering
- Review audit logs for previous email attempts
- Test with email preview before sending

## Security

### Authentication
- Admin-only access required
- JWT token validation
- User role verification

### Authorization
- Only users with `admin` role can access endpoints
- All actions logged with user information
- Audit trail for compliance

### Input Validation
- UUID format validation for item IDs
- Type validation (resolution/minutes only)
- SQL injection prevention
- XSS protection in email content

## Monitoring & Auditing

### Audit Logging
All manual email triggers are logged with:
- User ID and name
- Item type and ID
- Email sending result
- Timestamp
- Force mode usage
- Error details (if any)

### Monitoring Metrics
- Manual trigger frequency
- Success/failure rates
- Most frequently triggered items
- User activity patterns

### Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "action": "manual_voting_summary_email",
  "userId": "user-uuid",
  "userName": "Admin User",
  "userEmail": "admin@example.com",
  "details": {
    "type": "resolution",
    "itemId": "item-uuid",
    "itemTitle": "Board Meeting Resolution",
    "itemStatus": "approved",
    "force": false,
    "emailSent": true,
    "emailError": null
  }
}
```

## Best Practices

### When to Use Manual Triggers
1. **Automatic System Failure**: When database triggers fail
2. **Emergency Notifications**: Urgent voting results need immediate distribution
3. **Testing**: Verifying email templates and content
4. **Missed Deadlines**: When automatic deadline detection fails

### Before Triggering
1. **Verify Item Status**: Ensure voting is actually complete
2. **Check Recent Emails**: Avoid sending duplicates
3. **Preview Content**: Review email content before sending
4. **Test First**: Use test email functionality when possible

### Force Mode Usage
- Use sparingly and only when necessary
- Document reasons for force mode usage
- Verify email content is appropriate
- Consider impact on recipients

## Troubleshooting

### Email Not Sending
1. Check item exists and has votes
2. Verify email service configuration
3. Review error logs for specific failures
4. Test with preview mode first

### Preview Generation Fails
1. Verify item has voting data
2. Check database connectivity
3. Review voting statistics calculation
4. Ensure all required data is present

### Access Denied
1. Verify user is logged in
2. Check user has admin role
3. Ensure session is valid
4. Review authentication configuration

### Performance Issues
1. Monitor email generation time
2. Check database query performance
3. Review email service response times
4. Consider batch processing for large boards

## Integration

### With Existing Systems
- **Voting System**: Accesses voting data and results
- **Email Service**: Uses existing email infrastructure
- **Audit System**: Logs all manual actions
- **Admin Dashboard**: Provides user interface

### Custom Extensions
To extend the manual trigger system:

1. **Add New Item Types**: Extend type validation and handlers
2. **Custom Email Templates**: Modify email generation logic
3. **Additional Validation**: Add custom business rules
4. **Enhanced Monitoring**: Add custom metrics and alerts

## API Examples

### Bash/cURL Examples

**Manual Email Trigger**:
```bash
curl -X POST /api/admin/manual-voting-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "type": "resolution",
    "itemId": "123e4567-e89b-12d3-a456-426614174000",
    "force": false
  }'
```

**Email Preview**:
```bash
curl -X POST /api/admin/test-voting-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "type": "resolution",
    "itemId": "123e4567-e89b-12d3-a456-426614174000",
    "action": "preview"
  }'
```

**Test Email**:
```bash
curl -X POST /api/admin/test-voting-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "type": "resolution",
    "itemId": "123e4567-e89b-12d3-a456-426614174000",
    "action": "test_send"
  }'
```

### JavaScript Examples

**Using Fetch API**:
```javascript
// Manual email trigger
const triggerEmail = async (type, itemId, force = false) => {
  const response = await fetch('/api/admin/manual-voting-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, itemId, force })
  });
  
  const result = await response.json();
  return result;
};

// Email preview
const previewEmail = async (type, itemId) => {
  const response = await fetch('/api/admin/test-voting-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      type, 
      itemId, 
      action: 'preview' 
    })
  });
  
  const result = await response.json();
  return result;
};
```

## Support

For issues with manual email triggering:

1. **Check Admin Interface**: Use the web interface for easier troubleshooting
2. **Review Logs**: Check application logs for detailed error information
3. **Test Mode**: Use email preview and test sending before manual triggers
4. **Force Mode**: Use carefully when normal validation fails
5. **Contact Support**: Provide item ID, user information, and error details
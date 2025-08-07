# Voting Deadline Scheduler Guide

## Overview

The Voting Deadline Scheduler is a comprehensive system that automatically checks for expired voting deadlines and triggers voting summary emails when deadlines are reached. This ensures that voting processes are completed in a timely manner and all board members are notified of results.

## Architecture

### Components

1. **VotingDeadlineScheduler** (`/src/lib/services/votingDeadlineScheduler.ts`)
   - Core scheduler service that manages deadline checking
   - Handles both in-memory scheduling and one-time checks
   - Integrates with VotingCompletionDetector for email triggering

2. **API Endpoints**
   - `/api/voting-deadline-scheduler` - Control and monitor the scheduler
   - `/api/cron/voting-deadlines` - Cron endpoint for external scheduling

3. **Admin Interface** (`/src/components/admin/VotingDeadlineSchedulerControl.tsx`)
   - React component for managing the scheduler from the admin dashboard
   - Real-time status monitoring and control

4. **Vercel Cron Configuration** (`vercel.json`)
   - Automated cron job configuration for Vercel deployments

## Features

### Automatic Deadline Detection
- Checks for expired voting deadlines every minute
- Processes both resolution and minutes voting
- Updates item status when deadlines expire
- Triggers comprehensive voting summary emails

### Multiple Scheduling Options
1. **In-Memory Scheduler**: Runs within the application process
2. **Vercel Cron**: External cron job for serverless deployments
3. **Manual Triggers**: Admin-controlled manual execution

### Comprehensive Monitoring
- Real-time scheduler status
- Upcoming deadline tracking
- Job execution statistics
- Error logging and reporting

## Usage

### Starting the Scheduler

#### Via Admin Interface
1. Navigate to the admin dashboard
2. Go to the Voting Deadline Scheduler section
3. Click "Start Scheduler" to begin automatic checking

#### Via API
```bash
curl -X POST /api/voting-deadline-scheduler \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "intervalMinutes": 1}'
```

#### Via Vercel Cron (Automatic)
The scheduler automatically runs every minute when deployed to Vercel with the included `vercel.json` configuration.

### Manual Deadline Check

#### Via Admin Interface
Click "Manual Check" in the admin interface to immediately check for expired deadlines.

#### Via API
```bash
curl -X POST /api/voting-deadline-scheduler \
  -H "Content-Type: application/json" \
  -d '{"action": "manual_check"}'
```

#### Via Cron Endpoint
```bash
curl -X POST /api/cron/voting-deadlines
```

### Monitoring Status

#### Via Admin Interface
The admin interface provides real-time monitoring including:
- Scheduler running status
- Last run time and next scheduled run
- Upcoming deadlines in the next 24 hours
- Last job execution results

#### Via API
```bash
curl /api/voting-deadline-scheduler?action=status
```

## Configuration

### Environment Variables

```env
# Optional: Secret for securing cron endpoints
CRON_SECRET=your-secure-cron-secret

# Required: Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Vercel Cron Configuration

The `vercel.json` file configures automatic cron execution:

```json
{
  "crons": [
    {
      "path": "/api/cron/voting-deadlines",
      "schedule": "* * * * *"
    }
  ]
}
```

**Schedule Format**: Uses standard cron syntax
- `* * * * *` = Every minute
- `0 * * * *` = Every hour
- `0 0 * * *` = Every day at midnight

## API Reference

### GET /api/voting-deadline-scheduler

Get scheduler status and information.

**Query Parameters:**
- `action` (optional): `status`, `upcoming`, `statistics`
- `hours` (optional): Hours ahead for upcoming deadlines (default: 24)

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduler": {
      "isRunning": true,
      "lastRunTime": "2024-01-15T10:30:00Z",
      "nextRunTime": "2024-01-15T10:31:00Z",
      "intervalMinutes": 1
    },
    "upcoming": {
      "resolutions": [...],
      "minutes": [...]
    }
  }
}
```

### POST /api/voting-deadline-scheduler

Control scheduler operations.

**Request Body:**
```json
{
  "action": "start|stop|manual_check|check_specific|restart",
  "intervalMinutes": 1,
  "itemType": "resolution|minutes",
  "itemId": "uuid"
}
```

**Actions:**
- `start`: Start the scheduler with specified interval
- `stop`: Stop the scheduler
- `manual_check`: Execute immediate deadline check
- `check_specific`: Check specific item deadline
- `restart`: Stop and restart the scheduler

### GET /api/cron/voting-deadlines

Cron endpoint for external scheduling services.

**Headers:**
- `Authorization: Bearer <CRON_SECRET>` (if CRON_SECRET is set)

**Response:**
```json
{
  "success": true,
  "message": "Cron job completed successfully. Processed 2 expired items.",
  "data": {
    "processedItems": 2,
    "expiredResolutions": 1,
    "expiredMinutes": 1,
    "executionTime": 1250,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Deployment

### Vercel Deployment

1. Ensure `vercel.json` is in your project root
2. Deploy to Vercel: `vercel --prod`
3. The cron job will automatically start running every minute

### Other Platforms

For platforms without built-in cron support:

1. Use external cron services (e.g., cron-job.org, EasyCron)
2. Configure to call `/api/cron/voting-deadlines` every minute
3. Set up monitoring to ensure the job runs successfully

### Manual Setup

For development or custom deployments:

1. Start the application
2. Call the start endpoint to begin in-memory scheduling
3. Monitor via the admin interface

## Monitoring and Troubleshooting

### Logs

The scheduler provides comprehensive logging:

```
🕐 [2024-01-15T10:30:00Z] Checking for expired voting deadlines...
✅ Processed 2 expired voting items in 1250ms
   - Resolutions: 1
   - Minutes: 1
```

### Common Issues

1. **Scheduler Not Running**
   - Check if the scheduler was started via API or admin interface
   - Verify Vercel cron configuration for serverless deployments

2. **Emails Not Sending**
   - Check email service configuration
   - Verify database triggers are properly deployed
   - Review error logs for specific failures

3. **Performance Issues**
   - Monitor execution times in job results
   - Check database query performance
   - Consider adjusting check interval for large datasets

### Health Checks

Monitor these metrics for system health:

- Job execution success rate
- Average execution time
- Number of processed items per run
- Error frequency and types

## Security

### Access Control
- Admin-only access for scheduler control
- Optional cron secret for external endpoints
- Audit logging for all operations

### Best Practices
- Use HTTPS for all API calls
- Secure cron secrets in environment variables
- Monitor for unusual activity or errors
- Regular backup of audit logs

## Integration

### With Existing Systems

The scheduler integrates seamlessly with:

- **Voting System**: Automatically processes expired votes
- **Email Service**: Triggers voting summary emails
- **Audit System**: Logs all deadline processing events
- **Admin Dashboard**: Provides management interface

### Custom Extensions

To extend the scheduler:

1. Modify `VotingDeadlineScheduler` class for custom logic
2. Add new API endpoints for additional functionality
3. Update admin interface for new features
4. Ensure proper error handling and logging

## Performance

### Optimization Tips

1. **Database Queries**: Ensure proper indexing on voting deadline columns
2. **Batch Processing**: Process multiple items efficiently
3. **Caching**: Cache frequently accessed data
4. **Monitoring**: Track execution times and optimize slow operations

### Scaling Considerations

- For large boards: Consider increasing check intervals
- For high volume: Implement queue-based processing
- For reliability: Set up redundant cron jobs
- For monitoring: Implement alerting for failures

## Support

For issues or questions:

1. Check the admin interface for real-time status
2. Review application logs for error details
3. Test with manual triggers to isolate issues
4. Monitor cron job execution in deployment platform
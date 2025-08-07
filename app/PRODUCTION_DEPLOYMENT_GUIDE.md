# Production Deployment Guide - Voting Summary Email System

## 🚨 Critical Production Requirements

### 1. Environment Variables Setup

Create a `.env.local` file in the `app/` directory with the following variables:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Connection (REQUIRED for notification listener)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# Application URLs (REQUIRED)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Email Configuration (REQUIRED for voting summary emails)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@your-domain.com

# Web Push Notifications (Optional but recommended)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@your-domain.com
```

### 2. Database Schema Deployment

**CRITICAL**: The SQL triggers must be deployed to your production database.

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `voting-summary-email-triggers.sql`
4. Execute the script

#### Option B: Using psql command line
```bash
psql "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres" -f voting-summary-email-triggers.sql
```

#### Option C: Using the deployment script (recommended)
```bash
cd app
npm run deploy:triggers
```

### 3. Required Dependencies

Ensure all production dependencies are installed:

```bash
cd app
npm install pg @types/pg
npm install @supabase/supabase-js
npm install resend
```

### 4. Production Build Verification

Test the production build:

```bash
cd app
npm run build
npm start
```

## 🔧 Database Trigger Deployment Script

Let me create an automated deployment script for the triggers:
## 🚀
 Complete Deployment Process

### Step 1: Environment Setup

1. **Create `.env.local` file** in the `app/` directory with all required variables
2. **Verify environment variables**:
   ```bash
   cd app
   npm run verify:env
   ```

### Step 2: Install Dependencies

```bash
cd app
npm install
```

### Step 3: Deploy Database Triggers

**CRITICAL**: This step must be completed for the voting summary email system to work.

```bash
cd app
npm run deploy:triggers
```

This script will:
- ✅ Validate environment variables
- ✅ Connect to your database
- ✅ Deploy all voting summary email triggers
- ✅ Verify the deployment
- ✅ Test the notification system

### Step 4: Build and Test

```bash
cd app
npm run build
npm start
```

### Step 5: Start the Notification Listener

Once your application is running:

1. Navigate to your admin panel
2. Go to `/api/voting-triggers` or use the admin interface
3. Start the notification listener:
   ```bash
   curl -X POST http://your-domain.com/api/voting-triggers \
     -H "Content-Type: application/json" \
     -d '{"action": "start"}'
   ```

## 🧪 Testing the System

### Test Database Triggers

1. **Create a test resolution or minutes item**
2. **Set it to voting status**
3. **Cast votes from different board members**
4. **Check that summary emails are sent when voting completes**

### Test Notification Listener

```bash
curl -X POST http://your-domain.com/api/voting-triggers \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

### Test Email Triggers

```bash
curl -X POST http://your-domain.com/api/voting-triggers \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_notification",
    "type": "resolution",
    "id": "your-test-resolution-id"
  }'
```

## 🔧 Production Configuration

### Database Settings

Set the webhook base URL in your database:

```sql
ALTER DATABASE your_database SET app.webhook_base_url = 'https://your-domain.com';
```

### Monitoring

Monitor the system through:
- **Audit logs**: Check the `audit_logs` table for trigger events
- **API status**: Use `/api/voting-triggers` to check listener status
- **Database logs**: Monitor PostgreSQL logs for trigger execution

## 🚨 Troubleshooting

### Common Issues

1. **Build fails with missing environment variables**
   - Solution: Create `.env.local` with all required variables
   - Run: `npm run verify:env`

2. **Database triggers not working**
   - Solution: Re-run the deployment script
   - Run: `npm run deploy:triggers`

3. **Notification listener not starting**
   - Check DATABASE_URL is correct
   - Verify PostgreSQL connection permissions
   - Check application logs

4. **Emails not sending**
   - Verify RESEND_API_KEY is set
   - Check FROM_EMAIL domain is verified
   - Monitor audit logs for email trigger attempts

### Support

If you encounter issues:
1. Check the `TASK_5_COMPLETION_SUMMARY.md` for technical details
2. Review audit logs in the database
3. Check application logs for error messages
4. Verify all environment variables are set correctly

## ✅ Production Checklist

- [ ] Environment variables configured in `.env.local`
- [ ] Environment verification passed (`npm run verify:env`)
- [ ] Dependencies installed (`npm install`)
- [ ] Database triggers deployed (`npm run deploy:triggers`)
- [ ] Application builds successfully (`npm run build`)
- [ ] Notification listener started
- [ ] Test votes trigger summary emails
- [ ] Monitoring and logging configured
- [ ] Backup and recovery procedures in place

## 🎯 Next Steps

With the production deployment complete, you now have:
- ✅ Automatic voting summary emails
- ✅ Database triggers for completion detection
- ✅ Comprehensive audit logging
- ✅ Production-ready error handling
- ✅ Monitoring and testing capabilities

The system is now ready for **Task 6: Implement scheduled job for voting deadline expiration**!
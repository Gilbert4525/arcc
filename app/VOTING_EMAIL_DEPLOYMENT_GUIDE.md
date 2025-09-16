# 🚀 VOTING EMAIL TRIGGERS - COMPLETE DEPLOYMENT GUIDE

## 📋 **OVERVIEW**

This guide will deploy the complete voting email trigger system to achieve 100% automatic email functionality for:
- ✅ Resolution creation emails (already working)
- ✅ Meeting creation emails (already working)  
- ✅ Minutes creation emails (already working)
- 🎯 **Voting completion emails** (will be deployed)
- 🎯 **Deadline expiration emails** (will be deployed)

---

## 🎯 **STEP 1: DEPLOY DATABASE TRIGGERS**

### **1.1 Access Supabase SQL Editor**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**

### **1.2 Deploy the Triggers**
1. Copy the entire contents of `deploy-voting-triggers.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** to execute the script

**Expected Output:**
```
NOTICE: =====================================================
NOTICE: VOTING EMAIL TRIGGERS DEPLOYED SUCCESSFULLY!
NOTICE: =====================================================
NOTICE: Triggers created:
NOTICE: - trigger_resolution_vote_completion_enhanced
NOTICE: - trigger_minutes_vote_completion_enhanced
...
```

### **1.3 Verify Deployment**
Run this verification query in SQL Editor:
```sql
-- Verify triggers are created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%voting%' 
ORDER BY trigger_name;
```

**Expected Result:** Should show 2 triggers created.

---

## 🎯 **STEP 2: SET UP BACKGROUND PROCESS**

### **2.1 Install Dependencies**
```bash
cd app
npm install pg @supabase/supabase-js
```

### **2.2 Set Environment Variables**
Add these to your `.env.local` file:
```env
# Database connection
DATABASE_URL=your_supabase_database_url

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application URL
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### **2.3 Start the Background Process**

#### **Option A: Development (Manual Start)**
```bash
cd app
node scripts/start-voting-listener.js
```

#### **Option B: Production (PM2 Process Manager)**
```bash
# Install PM2 globally
npm install -g pm2

# Start the service
pm2 start scripts/start-voting-listener.js --name "voting-listener"

# Save PM2 configuration
pm2 save
pm2 startup
```

#### **Option C: Production (Systemd Service)**
Create `/etc/systemd/system/voting-listener.service`:
```ini
[Unit]
Description=Voting Notification Listener
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node scripts/start-voting-listener.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DATABASE_URL=your_database_url
Environment=NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
Environment=SUPABASE_SERVICE_ROLE_KEY=your_service_key
Environment=NEXT_PUBLIC_SITE_URL=https://your-domain.com

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable voting-listener
sudo systemctl start voting-listener
```

---

## 🎯 **STEP 3: VERIFY EMAIL CONFIGURATION**

### **3.1 Test Gmail SMTP Configuration**
1. Go to your admin dashboard
2. Navigate to **Settings** → **Email Configuration**
3. Click **"Validate Gmail Configuration"**
4. Ensure all checks pass

### **3.2 Test Email Sending**
Run this test in your browser console or API client:
```javascript
// Test resolution creation email
fetch('/api/resolutions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Resolution',
    description: 'Test description',
    content: 'Test content',
    category_id: 'your-category-id'
  })
});
```

---

## 🎯 **STEP 4: TEST VOTING COMPLETION**

### **4.1 Create Test Resolution**
1. Create a new resolution
2. Publish it for voting
3. Set a short voting deadline (e.g., 1 hour from now)

### **4.2 Simulate Voting**
1. Have multiple board members vote on the resolution
2. Watch the server logs for trigger activity
3. Check audit_logs table for trigger events

### **4.3 Verify Email Sending**
1. Check that voting summary email is sent automatically
2. Verify all board members receive the email
3. Check email content is properly formatted

---

## 🎯 **STEP 5: MONITORING & MAINTENANCE**

### **5.1 Monitor Background Process**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs voting-listener

# Restart if needed
pm2 restart voting-listener
```

### **5.2 Monitor Database Triggers**
```sql
-- Check recent trigger activity
SELECT 
    action,
    table_name,
    record_id,
    new_values,
    created_at
FROM audit_logs 
WHERE action LIKE '%VOTING%'
ORDER BY created_at DESC
LIMIT 10;
```

### **5.3 Monitor Email Delivery**
```sql
-- Check email delivery logs
SELECT 
    action,
    new_values->>'emailSent' as email_sent,
    new_values->>'totalRecipients' as recipients,
    created_at
FROM audit_logs 
WHERE action = 'VOTING_SUMMARY_EMAIL_SENT'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 **STEP 6: TROUBLESHOOTING**

### **6.1 Common Issues**

#### **Issue: Triggers Not Firing**
**Solution:**
```sql
-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name LIKE '%voting%';

-- Re-run deployment script if missing
```

#### **Issue: Background Process Not Starting**
**Solution:**
```bash
# Check environment variables
echo $DATABASE_URL
echo $NEXT_PUBLIC_SUPABASE_URL

# Test database connection
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => console.log('✅ Connected')).catch(console.error);
"
```

#### **Issue: Emails Not Sending**
**Solution:**
1. Check Gmail SMTP configuration
2. Verify email templates are working
3. Check recipient management
4. Review audit logs for errors

### **6.2 Debug Commands**

#### **Test Database Notifications**
```sql
-- Send test notification
SELECT pg_notify('voting_completion', '{"action":"trigger_email","type":"resolution","id":"test-id","timestamp":"2024-01-01T00:00:00Z"}');
```

#### **Test API Endpoints**
```bash
# Test voting completion API
curl -X POST http://localhost:3000/api/voting-completion \
  -H "Content-Type: application/json" \
  -d '{"action":"check","type":"resolution","id":"your-resolution-id"}'

# Test voting summary API
curl -X POST http://localhost:3000/api/voting-summary \
  -H "Content-Type: application/json" \
  -d '{"type":"resolution","id":"your-resolution-id","trigger":"manual"}'
```

---

## 🎯 **STEP 7: PRODUCTION CHECKLIST**

### **7.1 Pre-Deployment**
- [ ] Database triggers deployed successfully
- [ ] Background process running and stable
- [ ] Email configuration tested and working
- [ ] All environment variables set correctly
- [ ] Monitoring and logging in place

### **7.2 Post-Deployment**
- [ ] Test resolution creation → email sent
- [ ] Test meeting creation → email sent
- [ ] Test minutes creation → email sent
- [ ] Test voting completion → email sent automatically
- [ ] Test deadline expiration → email sent automatically
- [ ] Monitor audit logs for any errors
- [ ] Verify email delivery to all recipients

### **7.3 Ongoing Maintenance**
- [ ] Monitor background process health
- [ ] Check email delivery rates
- [ ] Review audit logs weekly
- [ ] Update email templates as needed
- [ ] Backup database triggers configuration

---

## 🎉 **SUCCESS CRITERIA**

After completing this deployment, you should have:

✅ **100% Automatic Email System:**
- Resolution creation → Email sent immediately
- Meeting creation → Email sent immediately
- Minutes creation → Email sent immediately
- Voting completion → Email sent automatically when all votes cast
- Deadline expiration → Email sent automatically when deadline passes

✅ **Robust Monitoring:**
- Database triggers logging all activity
- Background process handling notifications
- Audit logs tracking all email events
- Error handling and recovery mechanisms

✅ **Production Ready:**
- Scalable background process
- Proper error handling
- Comprehensive logging
- Easy maintenance and monitoring

---

## 📞 **SUPPORT**

If you encounter any issues during deployment:

1. **Check the audit logs** for detailed error information
2. **Review the server logs** for background process activity
3. **Verify environment variables** are set correctly
4. **Test individual components** using the debug commands
5. **Check database triggers** are properly deployed

The system is designed to be robust and self-healing, with comprehensive error handling and logging to help identify and resolve any issues quickly.

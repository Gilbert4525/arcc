# 📧 Voting Emails - Quick Start Guide

## ✅ System is 100% Ready!

Everything is set up and working. You just need to schedule the cron job.

---

## 🚀 3-Step Setup

### **Step 1: Set Environment Variable**

Add to your `.env.local`:
```env
CRON_SECRET=your-secure-random-secret-here
```

### **Step 2: Schedule Cron Job**

**Option A: Vercel (Easiest)**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-voting-notifications",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**Option B: External Cron**
```bash
# Run every minute
* * * * * curl -X POST https://your-domain.com/api/cron/process-voting-notifications \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Option C: Manual (No Cron)**
- Go to `/admin/voting-emails`
- Click "Process Pending Emails" when needed

### **Step 3: Test It**

1. Create a test resolution/minutes
2. Cast votes until complete
3. Wait 1 minute (or click manual process)
4. Check `/admin/voting-emails` dashboard
5. ✅ Email sent!

---

## 📊 Monitor System

Visit: `/admin/voting-emails`

You'll see:
- Total triggers (last 24h)
- Emails sent
- Failed deliveries
- Pending emails
- Recent activity log

---

## 🔧 How It Works

```
Vote Cast → Trigger Fires → Logged to DB → Cron Picks Up → Email Sent
```

**Automatic:**
- Database triggers detect completion
- Logs to audit_logs immediately
- Cron processes every minute
- Emails sent automatically

**Manual Backup:**
- Visit `/admin/voting-emails`
- Click "Process Pending Emails"
- Instant processing

---

## ❓ Troubleshooting

**Emails not sending?**
1. Check cron is running
2. Visit `/admin/voting-emails`
3. Click "Process Pending Emails"
4. Check for errors in dashboard

**Need help?**
- Check `VOTING_EMAIL_SYSTEM_COMPLETE.md` for full docs
- Check `VOTING_EMAIL_VERIFICATION_REPORT.md` for verification details

---

## ✅ That's It!

The system is ready. Just schedule the cron and you're done!
